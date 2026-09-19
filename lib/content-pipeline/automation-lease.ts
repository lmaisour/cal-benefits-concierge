import { AUTOMATION_LOCK_KEY, AutomationError } from "@/lib/content-pipeline/automation-types";
import type { ContentAutomationStore } from "@/lib/content-pipeline/automation-store";

export type AutomationLeaseClock = () => Date;

export type AutomationLeaseSessionInput = {
  store: ContentAutomationStore;
  lockKey?: string;
  ownerId: string;
  leaseSeconds: number;
  renewEveryMs?: number;
  clock?: AutomationLeaseClock;
};

/**
 * Positive ownership check for the publication boundary.
 * Call immediately before publication.
 */
export async function assertAutomationLeaseOwned(
  store: Pick<ContentAutomationStore, "ownsLock">,
  input: { lockKey?: string; ownerId: string; now?: Date },
): Promise<void> {
  const owned = await store.ownsLock({
    lockKey: input.lockKey ?? AUTOMATION_LOCK_KEY,
    ownerId: input.ownerId,
    now: input.now,
  });
  if (!owned) {
    throw new AutomationError(
      "lease_lost",
      "Automation lease is no longer owned by this execution.",
    );
  }
}

export class AutomationLeaseSession {
  readonly lockKey: string;
  readonly ownerId: string;
  readonly leaseSeconds: number;
  private readonly store: ContentAutomationStore;
  private readonly clock: AutomationLeaseClock;
  private readonly renewEveryMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
  private failure: AutomationError | null = null;
  private stopped = false;

  constructor(input: AutomationLeaseSessionInput) {
    this.store = input.store;
    this.lockKey = input.lockKey ?? AUTOMATION_LOCK_KEY;
    this.ownerId = input.ownerId;
    this.leaseSeconds = input.leaseSeconds;
    this.clock = input.clock ?? (() => new Date());
    this.renewEveryMs =
      input.renewEveryMs ?? Math.max(1000, Math.floor(input.leaseSeconds * 1000 / 3));
  }

  start(): void {
    if (this.stopped || this.renewEveryMs <= 0 || this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      this.inFlight = this.renewQuietly();
    }, this.renewEveryMs);
    this.timer.unref?.();
  }

  async ensureHeld(): Promise<void> {
    this.throwIfLost();
    const renewed = await this.store.renewLock({
      lockKey: this.lockKey,
      ownerId: this.ownerId,
      leaseSeconds: this.leaseSeconds,
      now: this.clock(),
    });
    if (!renewed.renewed) {
      this.markLost("Automation lease renewal failed; this execution no longer owns the cycle.");
    }
    await this.assertOwned();
  }

  async assertOwned(): Promise<void> {
    this.throwIfLost();
    try {
      await assertAutomationLeaseOwned(this.store, {
        lockKey: this.lockKey,
        ownerId: this.ownerId,
        now: this.clock(),
      });
    } catch (error) {
      if (error instanceof AutomationError && error.code === "lease_lost") {
        this.failure = error;
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.inFlight) {
      await this.inFlight;
      this.inFlight = null;
    }
  }

  private throwIfLost(): void {
    if (this.failure) {
      throw this.failure;
    }
  }

  private markLost(message: string): never {
    this.failure = new AutomationError("lease_lost", message);
    throw this.failure;
  }

  private async renewQuietly(): Promise<void> {
    if (this.stopped || this.failure) {
      return;
    }
    try {
      const renewed = await this.store.renewLock({
        lockKey: this.lockKey,
        ownerId: this.ownerId,
        leaseSeconds: this.leaseSeconds,
        now: this.clock(),
      });
      if (!renewed.renewed) {
        this.failure = new AutomationError(
          "lease_lost",
          "Automation lease renewal failed; this execution no longer owns the cycle.",
        );
      }
    } catch (error) {
      this.failure = new AutomationError(
        "lease_lost",
        error instanceof Error ? error.message : "Automation lease renewal failed.",
      );
    }
  }
}
