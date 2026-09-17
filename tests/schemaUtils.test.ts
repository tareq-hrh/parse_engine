import { describe, expect, it } from "vitest";
import {
  buildOutputSchema,
  buildSchemaPreview,
  schemaToSimplePreview,
  validateSchemaFields,
  type SchemaField,
} from "@/components/instruction/schemaUtils";

function field(patch: Partial<SchemaField>): SchemaField {
  return {
    id: patch.id ?? crypto.randomUUID(),
    name: patch.name ?? "",
    type: patch.type ?? "string",
    subFields: patch.subFields ?? [],
  };
}

describe("schemaUtils", () => {
  it("validates duplicate top-level field names", () => {
    expect(
      validateSchemaFields([
        field({ name: "company", type: "string" }),
        field({ name: "company", type: "number" }),
      ]),
    ).toContain('Duplicate field name: "company"');
  });

  it("validates object arrays with no named sub-fields", () => {
    expect(
      validateSchemaFields([
        field({
          name: "items",
          type: "object[]",
          subFields: [{ id: "sub-1", name: " ", type: "string" }],
        }),
      ]),
    ).toContain('Field "items" uses type object[] but has no sub-fields');
  });

  it("validates duplicate object-array sub-field names", () => {
    expect(
      validateSchemaFields([
        field({
          name: "items",
          type: "object[]",
          subFields: [
            { id: "sub-1", name: "price", type: "number" },
            { id: "sub-2", name: "price", type: "string" },
          ],
        }),
      ]),
    ).toContain('Duplicate sub-field name "price" inside field "items"');
  });

  it("builds the JSON schema sent to Ollama", () => {
    const schema = buildOutputSchema([
      field({ name: " company ", type: "string" }),
      field({ name: "skills", type: "string[]" }),
      field({
        name: "items",
        type: "object[]",
        subFields: [
          { id: "sub-1", name: "description", type: "string" },
          { id: "sub-2", name: "price", type: "number" },
          { id: "sub-3", name: "tags", type: "string[]" },
        ],
      }),
      field({ name: "", type: "boolean" }),
    ]);

    expect(schema).toEqual({
      type: "object",
      properties: {
        company: { type: "string" },
        skills: { type: "array", items: { type: "string" } },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              price: { type: "number" },
              tags: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    });
  });

  it("builds and reads the simplified schema preview", () => {
    const fields = [
      field({ name: "company", type: "string" }),
      field({ name: "skills", type: "string[]" }),
      field({
        name: "items",
        type: "object[]",
        subFields: [
          { id: "sub-1", name: "price", type: "number" },
          { id: "sub-2", name: "labels", type: "string[]" },
        ],
      }),
    ];

    const schema = buildOutputSchema(fields);

    expect(buildSchemaPreview(fields)).toEqual({
      company: "string",
      skills: ["string"],
      items: [{ price: "number", labels: "string[]" }],
    });
    expect(schemaToSimplePreview(schema!)).toEqual({
      company: "string",
      skills: ["string"],
      items: [{ price: "number", labels: ["string"] }],
    });
  });
});
