export interface TutorialState {
  mode: 'active' | 'completed' | 'skipped';
  stepId: string | null;
  startedTurn: number;
  completedStepIds: string[];
  scriptedScenarioEnabled: boolean;
  firedScriptIds: string[];
}
