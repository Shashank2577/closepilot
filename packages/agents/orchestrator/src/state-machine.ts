import { DealStage } from '@closepilot/core';

export class DealStateMachine {
  private readonly validTransitions: Record<DealStage, DealStage[]> = {
    [DealStage.INGESTION]: [DealStage.ENRICHMENT, DealStage.FAILED],
    [DealStage.ENRICHMENT]: [DealStage.SCOPING, DealStage.FAILED],
    [DealStage.SCOPING]: [DealStage.PROPOSAL, DealStage.FAILED],
    [DealStage.PROPOSAL]: [DealStage.CRM_SYNC, DealStage.FAILED],
    [DealStage.CRM_SYNC]: [DealStage.COMPLETED, DealStage.FAILED],
    [DealStage.COMPLETED]: [],
    [DealStage.FAILED]: [],
  };

  public canTransition(currentStage: DealStage, targetStage: DealStage): boolean {
    const possibleNextStages = this.validTransitions[currentStage];
    return possibleNextStages?.includes(targetStage) || false;
  }

  public getNextExpectedStage(currentStage: DealStage): DealStage | null {
    if (currentStage === DealStage.COMPLETED || currentStage === DealStage.FAILED) {
      return null;
    }

    // Return the first valid transition that is not FAILED, to represent the expected 'happy path'
    const transitions = this.validTransitions[currentStage];
    const nextHappyStage = transitions.find(stage => stage !== DealStage.FAILED);
    return nextHappyStage || null;
  }
}
