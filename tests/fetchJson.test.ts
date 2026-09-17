import { describe, expect, it } from "vitest";
import { FetchJsonError, parseFetchJsonResponse } from "@/lib/fetchJson";

describe("fetchJson", () => {
  it("parses successful JSON responses", async () => {
    await expect(
      parseFetchJsonResponse<{ content: string }>(
        new Response(JSON.stringify({ content: "input text" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).resolves.toEqual({ content: "input text" });
  });

  it("throws API error messages from JSON error responses", async () => {
    await expect(
      parseFetchJsonResponse(
        new Response(JSON.stringify({ error: "Dataset input not found." }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({
      message: "Dataset input not found.",
      status: 404,
    } satisfies Partial<FetchJsonError>);
  });

  it("falls back to status text when an error response has no message", async () => {
    await expect(parseFetchJsonResponse(new Response("", { status: 500 }))).rejects.toMatchObject({
      message: "Request failed with status 500.",
      status: 500,
    } satisfies Partial<FetchJsonError>);
  });
});
