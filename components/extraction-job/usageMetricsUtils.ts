export function formatUsageDuration(nanoseconds: number): string {
  if (!Number.isFinite(nanoseconds) || nanoseconds <= 0) return "0ms";

  const milliseconds = nanoseconds / 1_000_000;

  if (milliseconds < 1) {
    return `${milliseconds.toFixed(2)}ms`;
  }

  if (milliseconds < 1_000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1_000;
  if (seconds < 60) {
    return `${seconds < 10 ? seconds.toFixed(2) : seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatTokenCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "0 tok";
  return `${Math.round(count).toLocaleString("en-US")} tok`;
}
