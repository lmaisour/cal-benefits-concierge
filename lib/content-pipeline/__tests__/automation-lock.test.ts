import { describe, expect, it } from "vitest";
import { AUTOMATION_LOCK_KEY } from "@/lib/content-pipeline/automation-types";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import {
  AUTOMATION_NOW,
  automationStore,
  catalogContext,
  countingProvider,
} from "./automation-helpers";
import { createAutomationLockHarness } from "./pglite-automation";

describe("memory automation lease", () => {
  it("lets only one concurrent caller own the lease", async () => {
    const store = automationStore();
    const [first, second] = await Promise.all([
      store.acquireLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: "11111111-1111-4111-8111-111111111111",
        leaseSeconds: 180,
        now: AUTOMATION_NOW,
      }),
      store.acquireLock({
        lockKey: AUTOMATION_LOCK_KEY,
        ownerId: "22222222-2222-4222-8222-222222222222",
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
      ownerId: "11111111-1111-4111-8111-111111111111",
      leaseSeconds: 30,
      now: AUTOMATION_NOW,
    });
    expect(first.acquired).toBe(true);
    const later = new Date(AUTOMATION_NOW.getTime() + 31_000);
    const second = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: "22222222-2222-4222-8222-222222222222",
      leaseSeconds: 30,
      now: later,
    });
    expect(second.acquired).toBe(true);
    expect(second.owner_id).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("cannot steal an active lease", async () => {
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: "11111111-1111-4111-8111-111111111111",
      leaseSeconds: 180,
      now: AUTOMATION_NOW,
    });
    const stolen = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: "22222222-2222-4222-8222-222222222222",
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
    const owner = "11111111-1111-4111-8111-111111111111";
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: owner,
      leaseSeconds: 180,
      now: AUTOMATION_NOW,
    });
    expect(await store.releaseLock(AUTOMATION_LOCK_KEY, owner)).toBe(true);
    const next = await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: "22222222-2222-4222-8222-222222222222",
      leaseSeconds: 180,
      now: AUTOMATION_NOW,
    });
    expect(next.acquired).toBe(true);
  });
});

describe("postgres automation lease", () => {
  it("enforces exclusive ownership, reclaim, and release", async () => {
    const db = await createAutomationLockHarness();
    const ownerA = "11111111-1111-4111-8111-111111111111";
    const ownerB = "22222222-2222-4222-8222-222222222222";

    const first = await db.query<{ acquire_content_automation_lock: { acquired: boolean; owner_id: string } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerA, 180],
    );
    expect(first.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);

    const concurrent = await Promise.all([
      db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
        "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
        [AUTOMATION_LOCK_KEY, ownerA, 180],
      ),
      db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
        "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
        [AUTOMATION_LOCK_KEY, ownerB, 180],
      ),
    ]);
    const acquiredFlags = concurrent.map((result) => result.rows[0]?.acquire_content_automation_lock.acquired);
    expect(acquiredFlags.filter(Boolean)).toHaveLength(1);
    expect(acquiredFlags).toContain(true);

    const stolen = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerB, 180],
    );
    expect(stolen.rows[0]?.acquire_content_automation_lock.acquired).toBe(false);

    await db.query(
      `UPDATE public.content_automation_locks
       SET expires_at = NOW() - interval '1 second'
       WHERE lock_key = $1`,
      [AUTOMATION_LOCK_KEY],
    );
    const reclaimed = await db.query<{ acquire_content_automation_lock: { acquired: boolean; owner_id: string } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerB, 180],
    );
    expect(reclaimed.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);
    expect(reclaimed.rows[0]?.acquire_content_automation_lock.owner_id).toBe(ownerB);

    const released = await db.query<{ release_content_automation_lock: boolean }>(
      "SELECT public.release_content_automation_lock($1, $2::uuid) AS release_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerB],
    );
    expect(released.rows[0]?.release_content_automation_lock).toBe(true);

    const afterRelease = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerA, 180],
    );
    expect(afterRelease.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);

    await db.close();
  });
});
