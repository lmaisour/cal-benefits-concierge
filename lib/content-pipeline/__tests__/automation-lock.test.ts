import { describe, expect, it } from "vitest";
import { AUTOMATION_LOCK_KEY } from "@/lib/content-pipeline/automation-types";
import { assertAutomationLeaseOwned } from "@/lib/content-pipeline/automation-lease";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import {
  AUTOMATION_NOW,
  automationStore,
  catalogContext,
  countingProvider,
} from "./automation-helpers";
import { createAutomationLockHarness } from "./pglite-automation";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("memory automation lease", () => {
  it("lets only one concurrent caller own the lease", async () => {
    const store = automationStore();
    const [first, second] = await Promise.all([
      store.acquireLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: OWNER_A,
        leaseSeconds: 180,
        now: AUTOMATION_NOW,
      }),
      store.acquireLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: OWNER_B,
        leaseSeconds: 180,
        now: AUTOMATION_NOW,
      }),
    ]);
    expect([first.acquired, second.acquired].filter(Boolean)).toHaveLength(1);
  });

  it("reclaims an expired lease", async () => {
    const store = automationStore();
    const first = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 30,
      now: AUTOMATION_NOW,
    });
    expect(first.acquired).toBe(true);
    const later = new Date(AUTOMATION_NOW.getTime() + 31_000);
    const second = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 30,
      now: later,
    });
    expect(second.acquired).toBe(true);
    expect(second.owner_id).toBe(OWNER_B);
  });

  it("cannot steal an active lease", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 180,
      now: AUTOMATION_NOW,
    });
    const stolen = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 180,
      now: new Date(AUTOMATION_NOW.getTime() + 1_000),
    });
    expect(stolen.acquired).toBe(false);
  });

  it("lets only one overlapping automation cycle generate", async () => {
    const store = automationStore();
    const counted = countingProvider();
    const [first, second] = await Promise.all([
      runContentAutomation({
        store,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
        now: AUTOMATION_NOW,
        leaseSeconds: 180,
      }),
      runContentAutomation({
        store,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
        now: AUTOMATION_NOW,
        leaseSeconds: 180,
      }),
    ]);
    const statuses = [first.execution.status, second.execution.status].sort();
    expect(statuses).toEqual(["COMPLETED_DRY_RUN", "LOCKED"]);
    expect(counted.calls()).toBe(1);
    expect(store.pipeline.runs.size).toBe(1);
  });

  it("releases on normal completion so another owner can acquire", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 180,
      now: AUTOMATION_NOW,
    });
    expect(await store.releaseLock(AUTOMATION_LOCK_KEY, OWNER_A)).toBe(true);
    const next = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 180,
      now: AUTOMATION_NOW,
    });
    expect(next.acquired).toBe(true);
  });

  it("keeps exclusive ownership of a cycle longer than the original lease by renewing", async () => {
    const store = automationStore();
    const inner = new FakeContentDraftProvider();
    let secondAcquired = true;
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: {
        id: "fake",
        generateDraft: async (input) => {
          await delay(1200);
          const stolen = await store.acquireLock({
            lockKey: AUTOMATION_LOCK_KEY,
            ownerId: OWNER_B,
            leaseSeconds: 1,
            now: new Date(),
          });
          secondAcquired = stolen.acquired;
          return inner.generateDraft(input);
        },
      },
      now: AUTOMATION_NOW,
      leaseSeconds: 1,
      renewEveryMs: 200,
    });
    expect(secondAcquired).toBe(false);
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(result.publish_attempted).toBe(false);
    expect(store.locks.size).toBe(0);
  });

  it("cannot acquire during a successfully renewed long-running cycle", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 1,
      now: new Date(),
    });
    await delay(400);
    const renewed = await store.renewLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 1,
      now: new Date(),
    });
    expect(renewed.renewed).toBe(true);
    const second = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 1,
      now: new Date(),
    });
    expect(second.acquired).toBe(false);
    expect(
      await store.ownsLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: OWNER_A,
        now: new Date(),
      }),
    ).toBe(true);
  });

  it("lets a new owner reclaim after genuine expiration without renewal", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 1,
      now: AUTOMATION_NOW,
    });
    const reclaimed = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 1,
      now: new Date(AUTOMATION_NOW.getTime() + 1001),
    });
    expect(reclaimed.acquired).toBe(true);
    expect(reclaimed.owner_id).toBe(OWNER_B);
  });

  it("rejects renew and acquire from the previous owner after a new owner reclaims", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 1,
      now: AUTOMATION_NOW,
    });
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 30,
      now: new Date(AUTOMATION_NOW.getTime() + 1001),
    });
    const renewed = await store.renewLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 30,
      now: new Date(AUTOMATION_NOW.getTime() + 1500),
    });
    expect(renewed.renewed).toBe(false);
    const reclaimed = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 30,
      now: new Date(AUTOMATION_NOW.getTime() + 1500),
    });
    expect(reclaimed.acquired).toBe(false);
    expect(
      await store.ownsLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: OWNER_B,
        now: new Date(AUTOMATION_NOW.getTime() + 1500),
      }),
    ).toBe(true);
  });

  it("fails closed when lease renewal fails mid-cycle", async () => {
    const store = automationStore();
    const inner = new FakeContentDraftProvider();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: {
        id: "fake",
        generateDraft: async (input) => {
          const current = store.locks.get(AUTOMATION_LOCK_KEY);
          if (current) {
            current.expires_at = new Date(0).toISOString();
          }
          await store.acquireLock({
            lockKey: AUTOMATION_LOCK_KEY,
            ownerId: OWNER_B,
            leaseSeconds: 180,
            now: new Date(),
          });
          return inner.generateDraft(input);
        },
      },
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
      renewEveryMs: 0,
    });
    expect(result.execution.status).toBe("ERROR");
    expect(result.execution.error_code).toBe("lease_lost");
    expect(result.publish_attempted).toBe(false);
    expect(result.publish_succeeded).toBe(false);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("lets a crashed execution without renewal become reclaimable", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 1,
      now: AUTOMATION_NOW,
    });
    expect(
      await store.ownsLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: OWNER_A,
        now: new Date(AUTOMATION_NOW.getTime() + 1001),
      }),
    ).toBe(false);
    const reclaimed = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 1,
      now: new Date(AUTOMATION_NOW.getTime() + 1001),
    });
    expect(reclaimed.acquired).toBe(true);
  });

  it("rejects the future pre-publish ownership assertion after the lease is lost", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_A,
      leaseSeconds: 1,
      now: AUTOMATION_NOW,
    });
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: OWNER_B,
      leaseSeconds: 30,
      now: new Date(AUTOMATION_NOW.getTime() + 1001),
    });
    await expect(
      assertAutomationLeaseOwned(store, {
        ownerId: OWNER_A,
        now: new Date(AUTOMATION_NOW.getTime() + 1500),
      }),
    ).rejects.toMatchObject({ code: "lease_lost" });
    await expect(
      assertAutomationLeaseOwned(store, {
        ownerId: OWNER_B,
        now: new Date(AUTOMATION_NOW.getTime() + 1500),
      }),
    ).resolves.toBeUndefined();
  });
});

describe("postgres automation lease", () => {
  it("enforces exclusive ownership, renew-only refresh, reclaim, and release", async () => {
    const db = await createAutomationLockHarness();

    const first = await db.query<{ acquire_content_automation_lock: { acquired: boolean; owner_id: string } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A, 180],
    );
    expect(first.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);

    const sameOwnerAcquire = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A, 180],
    );
    expect(sameOwnerAcquire.rows[0]?.acquire_content_automation_lock.acquired).toBe(false);

    const stolen = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_B, 180],
    );
    expect(stolen.rows[0]?.acquire_content_automation_lock.acquired).toBe(false);

    const renewed = await db.query<{ renew_content_automation_lock: { renewed: boolean; owner_id: string } }>(
      "SELECT public.renew_content_automation_lock($1, $2::uuid, $3) AS renew_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A, 180],
    );
    expect(renewed.rows[0]?.renew_content_automation_lock.renewed).toBe(true);
    expect(renewed.rows[0]?.renew_content_automation_lock.owner_id).toBe(OWNER_A);

    const owned = await db.query<{ owns_content_automation_lock: boolean }>(
      "SELECT public.owns_content_automation_lock($1, $2::uuid) AS owns_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A],
    );
    expect(owned.rows[0]?.owns_content_automation_lock).toBe(true);

    await db.query(
      `UPDATE public.content_automation_locks
       SET expires_at = NOW() - interval '1 second'
       WHERE lock_key = $1`,
      [AUTOMATION_LOCK_KEY],
    );
    const reclaimed = await db.query<{ acquire_content_automation_lock: { acquired: boolean; owner_id: string } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_B, 180],
    );
    expect(reclaimed.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);
    expect(reclaimed.rows[0]?.acquire_content_automation_lock.owner_id).toBe(OWNER_B);

    const staleRenew = await db.query<{ renew_content_automation_lock: { renewed: boolean } }>(
      "SELECT public.renew_content_automation_lock($1, $2::uuid, $3) AS renew_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A, 180],
    );
    expect(staleRenew.rows[0]?.renew_content_automation_lock.renewed).toBe(false);

    const staleAcquire = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A, 180],
    );
    expect(staleAcquire.rows[0]?.acquire_content_automation_lock.acquired).toBe(false);

    const staleOwns = await db.query<{ owns_content_automation_lock: boolean }>(
      "SELECT public.owns_content_automation_lock($1, $2::uuid) AS owns_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A],
    );
    expect(staleOwns.rows[0]?.owns_content_automation_lock).toBe(false);

    const released = await db.query<{ release_content_automation_lock: boolean }>(
      "SELECT public.release_content_automation_lock($1, $2::uuid) AS release_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_B],
    );
    expect(released.rows[0]?.release_content_automation_lock).toBe(true);

    const afterRelease = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, OWNER_A, 180],
    );
    expect(afterRelease.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);

    await db.close();
  });
});
