import {
  createInitialInstallerState,
  getStepsForPlatform,
  type CreatedResource,
  type InstallerErrorInfo,
  type InstallerFormData,
  type InstallerLogLine,
  type InstallerPlatform,
  type InstallerState,
  type PrerequisiteCheck,
} from "./types";

export type InstallerAction =
  | { type: "SELECT_PLATFORM"; platform: InstallerPlatform }
  | { type: "SET_PREREQUISITES"; prerequisites: PrerequisiteCheck[] }
  | { type: "UPDATE_PREREQUISITE"; id: string; patch: Partial<PrerequisiteCheck> }
  | { type: "SET_CREDENTIALS"; apiToken: string; accountId?: string }
  | { type: "UPDATE_FORM"; patch: InstallerFormData }
  | { type: "ADD_LOG"; log: InstallerLogLine }
  | { type: "ADD_RESOURCE"; resource: CreatedResource }
  | { type: "SET_DEPLOYMENT_URL"; url: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "FAIL"; error: InstallerErrorInfo }
  | { type: "CLEAR_ERROR" }
  | { type: "COMPLETE" }
  | { type: "RESTART" };

export function installerReducer(state: InstallerState, action: InstallerAction): InstallerState {
  switch (action.type) {
    case "SELECT_PLATFORM": {
      const steps = getStepsForPlatform(action.platform);
      return {
        ...state,
        platform: action.platform,
        steps,
        currentStepIndex: 1,
        completedSteps: ["PLATFORM_SELECTION"],
        status: "RUNNING",
      };
    }

    case "SET_PREREQUISITES":
      return { ...state, prerequisites: action.prerequisites };

    case "UPDATE_PREREQUISITE":
      return {
        ...state,
        prerequisites: state.prerequisites.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p
        ),
      };

    case "SET_CREDENTIALS":
      return {
        ...state,
        credentials: { apiToken: action.apiToken, accountId: action.accountId },
      };

    case "UPDATE_FORM":
      return { ...state, formData: { ...state.formData, ...action.patch } };

    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log].slice(-500) };

    case "ADD_RESOURCE":
      return { ...state, createdResources: [...state.createdResources, action.resource] };

    case "SET_DEPLOYMENT_URL":
      return { ...state, deploymentUrl: action.url };

    case "NEXT_STEP": {
      const currentStep = state.steps[state.currentStepIndex];
      const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);
      return {
        ...state,
        currentStepIndex: nextIndex,
        completedSteps: currentStep ? [...new Set([...state.completedSteps, currentStep])] : state.completedSteps,
      };
    }

    case "PREV_STEP":
      return { ...state, currentStepIndex: Math.max(state.currentStepIndex - 1, 0) };

    case "FAIL":
      return { ...state, status: "FAILED", error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null, status: "RUNNING" };

    case "COMPLETE":
      return { ...state, status: "COMPLETED" };

    case "RESTART":
      return createInitialInstallerState();

    default:
      return state;
  }
}
