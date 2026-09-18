export type PrimitiveType = "string" | "number" | "boolean";
export type SubFieldType = PrimitiveType | `${PrimitiveType}[]`;
export type TopLevelFieldType = SubFieldType | "object[]";

export interface SubField {
  id: string; // crypto.randomUUID() — React key only, never sent to API
  name: string;
  type: SubFieldType;
}

export interface SchemaField {
  id: string; // crypto.randomUUID() — React key only
  name: string;
  type: TopLevelFieldType;
  subFields: SubField[]; // only populated when type === "object[]"
}

function primitiveToSchema(type: PrimitiveType) {
  return { type };
}

function subFieldTypeToSchema(type: SubFieldType): Record<string, unknown> {
  if (type === "string" || type === "number" || type === "boolean") {
    return primitiveToSchema(type);
  }
  const base = type.replace("[]", "") as PrimitiveType;
  return { type: "array", items: { type: base } };
}

export function schemaToSimplePreview(
  schema: Record<string, unknown>,
): Record<string, unknown> | null {
  const props = (schema?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(props)) {
    if (prop.type === "array") {
      const items = prop.items as Record<string, unknown>;
      if (items?.type === "object") {
        const subProps = (items.properties ?? {}) as Record<string, Record<string, unknown>>;
        const subObj: Record<string, unknown> = {};
        for (const [sk, sv] of Object.entries(subProps)) {
          subObj[sk] =
            sv.type === "array" ? [(sv.items as Record<string, unknown>)?.type] : sv.type;
        }
        result[key] = [subObj];
      } else {
        result[key] = [items?.type];
      }
    } else {
      result[key] = prop.type;
    }
  }

  return Object.keys(result).length === 0 ? null : result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function primitiveFromValue(value: unknown): PrimitiveType | null {
  return value === "string" || value === "number" || value === "boolean" ? value : null;
}

function schemaToSubFieldType(schema: unknown): SubFieldType | null {
  if (!isPlainObject(schema)) return null;

  const primitiveType = primitiveFromValue(schema.type);
  if (primitiveType) return primitiveType;

  if (schema.type !== "array" || !isPlainObject(schema.items)) return null;

  const itemType = primitiveFromValue(schema.items.type);
  return itemType ? `${itemType}[]` : null;
}

export function schemaToSchemaFields(schema: Record<string, unknown> | null): SchemaField[] {
  if (!schema || !isPlainObject(schema.properties)) return [];

  const fields: SchemaField[] = [];

  for (const [name, property] of Object.entries(schema.properties)) {
    if (!isPlainObject(property)) continue;

    if (
      property.type === "array" &&
      isPlainObject(property.items) &&
      property.items.type === "object" &&
      isPlainObject(property.items.properties)
    ) {
      const subFields = Object.entries(property.items.properties).flatMap(
        ([subName, subProperty]) => {
          const type = schemaToSubFieldType(subProperty);
          return type
            ? [
                {
                  id: crypto.randomUUID(),
                  name: subName,
                  type,
                },
              ]
            : [];
        },
      );

      fields.push({
        id: crypto.randomUUID(),
        name,
        type: "object[]",
        subFields,
      });
      continue;
    }

    const type = schemaToSubFieldType(property);
    if (type) {
      fields.push({
        id: crypto.randomUUID(),
        name,
        type,
        subFields: [],
      });
    }
  }

  return fields;
}

export function validateSchemaFields(fields: SchemaField[]): string | null {
  const seenFieldNames = new Set<string>();

  for (const field of fields) {
    const name = field.name.trim();
    if (!name) continue;

    if (seenFieldNames.has(name)) {
      return `Duplicate field name: "${name}". Each field name must be unique.`;
    }
    seenFieldNames.add(name);

    if (field.type === "object[]") {
      const validSubFields = field.subFields.filter((s) => s.name.trim() !== "");
      if (validSubFields.length === 0) {
        return `Field "${name}" uses type object[] but has no sub-fields. Add at least one sub-field or choose another type.`;
      }

      const seenSubNames = new Set<string>();
      for (const sub of validSubFields) {
        const subName = sub.name.trim();
        if (seenSubNames.has(subName)) {
          return `Duplicate sub-field name "${subName}" inside field "${name}". Each sub-field name must be unique.`;
        }
        seenSubNames.add(subName);
      }
    }
  }

  return null;
}

export function buildOutputSchema(fields: SchemaField[]): Record<string, unknown> | null {
  const properties: Record<string, unknown> = {};

  for (const field of fields) {
    const name = field.name.trim();
    if (!name) continue;

    if (field.type === "object[]") {
      const subProperties: Record<string, unknown> = {};
      for (const sub of field.subFields) {
        const subName = sub.name.trim();
        if (!subName) continue;
        subProperties[subName] = subFieldTypeToSchema(sub.type);
      }
      if (Object.keys(subProperties).length === 0) continue;
      properties[name] = {
        type: "array",
        items: {
          type: "object",
          properties: subProperties,
          additionalProperties: false,
        },
      };
    } else {
      properties[name] = subFieldTypeToSchema(field.type);
    }
  }

  if (Object.keys(properties).length === 0) return null;
  return { type: "object", properties, additionalProperties: false };
}

export function buildSchemaPreview(fields: SchemaField[]): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const name = field.name.trim();
    if (!name) continue;

    if (field.type === "object[]") {
      const subObj: Record<string, string> = {};
      for (const sub of field.subFields) {
        const subName = sub.name.trim();
        if (!subName) continue;
        subObj[subName] = sub.type;
      }
      if (Object.keys(subObj).length === 0) continue;
      result[name] = [subObj];
    } else if (field.type.endsWith("[]")) {
      const base = field.type.replace("[]", "");
      result[name] = [base];
    } else {
      result[name] = field.type;
    }
  }

  if (Object.keys(result).length === 0) return null;
  return result;
}
