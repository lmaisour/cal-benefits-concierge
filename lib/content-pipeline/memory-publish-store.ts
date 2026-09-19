import type { GuideRow } from "@/types/database";
import type { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import type {
  GuidePublishStore,
  PublishedGuideRecord,
  PublishFailAt,
  PublishGuideWrite,
  PublishGuideWriteResult,
} from "@/lib/content-pipeline/publish-store";
import {
  persistPublishedGuideTransaction,
  type InMemoryPublishState,
} from "@/lib/content-pipeline/publish-transaction";

export class MemoryGuidePublishStore implements GuidePublishStore {
  readonly guides = new Map<string, GuideRow>();
  readonly guidePrograms = new Map<string, string[]>();
  injectFailure: PublishFailAt | null = null;
  private persistMutex: Promise<void> = Promise.resolve();

  constructor(
    private readonly pipeline: MemoryContentPipelineStore,
    private readonly programs: Set<string>,
  ) {}

  async getRun(id: string) {
    return this.pipeline.getRun(id);
  }

  async getOpportunity(id: string) {
    return this.pipeline.getOpportunity(id);
  }

  async getGuide(id: string): Promise<PublishedGuideRecord | null> {
    return this.guides.get(id) ?? null;
  }

  async programExists(programId: string): Promise<boolean> {
    return this.programs.has(programId);
  }

  async persistPublishedGuide(write: PublishGuideWrite): Promise<PublishGuideWriteResult> {
    return this.serializePersist(() => {
      const state = this.captureState();
      const result = persistPublishedGuideTransaction(state, write, {
        failAt: this.injectFailure,
        now: write.published_at,
      });
      this.commitState(state);
      return result;
    });
  }

  // Queues concurrent first-publish attempts the same way Postgres FOR UPDATE
  // serializes RPC callers of the same opportunity.
  private async serializePersist<T>(fn: () => T): Promise<T> {
    let release: () => void = () => undefined;
    const previous = this.persistMutex;
    this.persistMutex = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return fn();
    } finally {
      release();
    }
  }

  private captureState(): InMemoryPublishState {
    return {
      guides: this.guides,
      guidePrograms: this.guidePrograms,
      opportunityGuideIds: new Map(
        [...this.pipeline.opportunities.values()].map((opportunity) => [
          opportunity.id,
          opportunity.guide_id,
        ]),
      ),
    };
  }

  private commitState(state: InMemoryPublishState): void {
    for (const record of this.pipeline.opportunities.values()) {
      if (state.opportunityGuideIds.has(record.id)) {
        record.guide_id = state.opportunityGuideIds.get(record.id) ?? null;
      }
    }
  }
}
