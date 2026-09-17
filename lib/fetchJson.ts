export class FetchJsonError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FetchJsonError";
    this.status = status;
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  return parseFetchJsonResponse<T>(res);
}

export async function parseFetchJsonResponse<T>(res: Response): Promise<T> {
  const payload = await readResponsePayload(res);

  if (!res.ok) {
    throw new FetchJsonError(extractErrorMessage(payload, res.status), res.status);
  }

  return payload as T;
}

async function readResponsePayload(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error.trim();
  }

  return `Request failed with status ${status}.`;
}
