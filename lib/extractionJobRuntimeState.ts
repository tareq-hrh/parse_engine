interface ExtractionJobRuntimeState {
  activeJobId: string | null;
  stopFlags: Record<string, boolean>;
  abortControllers: Record<string, AbortController>;
}

declare global {
  var __extractionJobRuntimeState: ExtractionJobRuntimeState | undefined;
}

function getRuntimeState(): ExtractionJobRuntimeState {
  if (!global.__extractionJobRuntimeState) {
    global.__extractionJobRuntimeState = {
      activeJobId: null,
      stopFlags: {},
      abortControllers: {},
    };
  }

  return global.__extractionJobRuntimeState;
}

export function getActiveExtractionJobId(): string | null {
  return getRuntimeState().activeJobId;
}

export function claimExtractionJobRun(extractionJobId: string): boolean {
  const state = getRuntimeState();
  if (state.activeJobId && state.activeJobId !== extractionJobId) {
    return false;
  }

  if (!state.activeJobId) {
    state.activeJobId = extractionJobId;
    delete state.stopFlags[extractionJobId];
    delete state.abortControllers[extractionJobId];
  }

  return true;
}

export function releaseExtractionJobRun(extractionJobId: string): void {
  const state = getRuntimeState();
  if (state.activeJobId === extractionJobId) {
    state.activeJobId = null;
  }
  delete state.stopFlags[extractionJobId];
  delete state.abortControllers[extractionJobId];
}

export function requestExtractionJobStop(extractionJobId: string): void {
  const state = getRuntimeState();
  state.stopFlags[extractionJobId] = true;
  state.abortControllers[extractionJobId]?.abort();
}

export function shouldStopExtractionJob(extractionJobId: string): boolean {
  return getRuntimeState().stopFlags[extractionJobId] === true;
}

export function setExtractionJobAbortController(
  extractionJobId: string,
  controller: AbortController,
): void {
  getRuntimeState().abortControllers[extractionJobId] = controller;
}

export function clearExtractionJobAbortController(
  extractionJobId: string,
  controller: AbortController,
): void {
  const state = getRuntimeState();
  if (state.abortControllers[extractionJobId] === controller) {
    delete state.abortControllers[extractionJobId];
  }
}
