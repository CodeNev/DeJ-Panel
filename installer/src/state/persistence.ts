import type { InstallerState } from "./types";

const STORAGE_KEY = "dej_installer_session";

type PersistedState = Omit<InstallerState, "credentials"> & { credentials: null };

export function persistInstallerState(state: InstallerState): void {
  const safeState: PersistedState = { ...state, credentials: null };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  } catch {
    return;
  }
}

export function loadPersistedInstallerState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function clearPersistedInstallerState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
