import { cwd } from 'process'
// import { PersistentShell } from './PersistentShell' // TODO: Import from Kode or create stub

// DO NOT ADD MORE STATE HERE OR BORIS WILL CURSE YOU
const STATE: {
  originalCwd: string
  currentCwd: string
} = {
  originalCwd: cwd(),
  currentCwd: cwd(),
}

export async function setCwd(newCwd: string): Promise<void> {
  // Simple implementation without PersistentShell
  STATE.currentCwd = newCwd
  process.chdir(newCwd)
}

export function setOriginalCwd(newCwd: string): void {
  STATE.originalCwd = newCwd
}

export function getOriginalCwd(): string {
  return STATE.originalCwd
}

export function getCwd(): string {
  // Simple implementation without PersistentShell
  return STATE.currentCwd
}
