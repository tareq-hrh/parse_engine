"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn_ui/select";
import {
  buildOutputSchema,
  buildSchemaPreview,
  schemaToSchemaFields,
  schemaToSimplePreview,
  validateSchemaFields,
  type SchemaField,
  type SubField,
  type SubFieldType,
  type TopLevelFieldType,
} from "./schemaUtils";

export type { SchemaField, SubField, SubFieldType, TopLevelFieldType };
export { buildOutputSchema, schemaToSchemaFields, schemaToSimplePreview, validateSchemaFields };

// ─── Dropdown options ─────────────────────────────────────────────────────────

const TOP_LEVEL_OPTIONS: { value: TopLevelFieldType; label: string }[] = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
  { value: "string[]", label: "string[]" },
  { value: "number[]", label: "number[]" },
  { value: "boolean[]", label: "boolean[]" },
  { value: "object[]", label: "object[]" },
];

const SUB_FIELD_OPTIONS: { value: SubFieldType; label: string }[] = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
  { value: "string[]", label: "string[]" },
  { value: "number[]", label: "number[]" },
  { value: "boolean[]", label: "boolean[]" },
];

// ─── Type color map ──────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  string: "text-green-400",
  number: "text-amber-400",
  boolean: "text-blue-400",
  "string[]": "text-green-400",
  "number[]": "text-amber-400",
  "boolean[]": "text-blue-400",
  "object[]": "text-purple-400",
};

// ─── TypeSelect ───────────────────────────────────────────────────────────────

function TypeSelect<T extends string>({
  value,
  options,
  size = "default",
  ariaLabel,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  size?: "default" | "sm";
  ariaLabel: string;
  onChange: (v: T) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={`rounded-sm font-mono text-[11px] w-27 shrink-0 ${TYPE_COLOR[value] ?? ""}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="p-1">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className={`font-mono text-xs ${TYPE_COLOR[opt.value] ?? ""}`}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── SchemaBuilder ────────────────────────────────────────────────────────────

interface SchemaBuilderProps {
  value: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

export function SchemaBuilder({ value, onChange }: SchemaBuilderProps) {
  // ── field handlers ──

  function addField() {
    onChange([...value, { id: crypto.randomUUID(), name: "", type: "string", subFields: [] }]);
  }

  function removeField(id: string) {
    onChange(value.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<Omit<SchemaField, "id">>) {
    onChange(
      value.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        if (patch.type !== undefined && patch.type !== "object[]") {
          next.subFields = [];
        }
        return next;
      }),
    );
  }

  // ── sub-field handlers ──

  function addSubField(fieldId: string) {
    onChange(
      value.map((f) =>
        f.id !== fieldId
          ? f
          : {
              ...f,
              subFields: [...f.subFields, { id: crypto.randomUUID(), name: "", type: "string" }],
            },
      ),
    );
  }

  function removeSubField(fieldId: string, subId: string) {
    onChange(
      value.map((f) =>
        f.id !== fieldId ? f : { ...f, subFields: f.subFields.filter((s) => s.id !== subId) },
      ),
    );
  }

  function updateSubField(fieldId: string, subId: string, patch: Partial<Omit<SubField, "id">>) {
    onChange(
      value.map((f) =>
        f.id !== fieldId
          ? f
          : {
              ...f,
              subFields: f.subFields.map((s) => (s.id !== subId ? s : { ...s, ...patch })),
            },
      ),
    );
  }

  // ── preview ──
  const preview = buildSchemaPreview(value);

  // ── render ──
  return (
    <div className="flex flex-col gap-2 lg:flex-row">
      <div className="space-y-2 w-full lg:w-[50%]">
        {/* Field rows */}
        {value.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-3">
            {value.map((field) => (
              <div key={field.id}>
                {/* Top-level row */}
                <div className="flex items-center gap-2">
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    placeholder="field_name"
                    aria-label="Field name"
                    className="font-mono text-xs flex-1 min-w-0 rounded-sm"
                  />

                  <TypeSelect
                    value={field.type}
                    options={TOP_LEVEL_OPTIONS}
                    ariaLabel={field.name ? `Type for ${field.name}` : "Field type"}
                    onChange={(t) => updateField(field.id, { type: t })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(field.id)}
                    aria-label={field.name ? `Remove field ${field.name}` : "Remove field"}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                {/* Sub-fields (object[] only) */}
                {field.type === "object[]" && (
                  <div className="ml-2 mt-1.5 space-y-1.5 border-l-2 border-purple-500/60 pl-3">
                    {field.subFields.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <Input
                          value={sub.name}
                          onChange={(e) =>
                            updateSubField(field.id, sub.id, { name: e.target.value })
                          }
                          placeholder="sub_field"
                          aria-label={field.name ? `Sub-field name for ${field.name}` : "Sub-field name"}
                          className="font-mono text-[11px] flex-1 min-w-0 rounded-sm"
                        />

                        <TypeSelect
                          value={sub.type}
                          options={SUB_FIELD_OPTIONS}
                          ariaLabel={sub.name ? `Type for ${sub.name}` : "Sub-field type"}
                          onChange={(t) => updateSubField(field.id, sub.id, { type: t })}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubField(field.id, sub.id)}
                          aria-label={sub.name ? `Remove sub-field ${sub.name}` : "Remove sub-field"}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addSubField(field.id)}
                      className="h-7 px-2 font-mono text-[10px] text-purple-400 hover:text-purple-300 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add sub-field
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add field */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          className="font-mono text-xs gap-1.5 text-muted-foreground hover:text-foreground w-full border-dashed"
        >
          <Plus className="size-3.5" />
          Add field
        </Button>
      </div>

      {/* Simplified preview — code-window style */}
      {preview && (
        <div className="min-h-48 flex-1 rounded-md border border-border overflow-hidden flex flex-col">
          {/* Title bar */}
          <div className="bg-muted/60 border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-yellow-400/70" />
            <span className="size-2.5 rounded-full bg-green-400/70" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
              Preview
            </span>
          </div>
          {/* Code body */}
          <pre className="bg-preview-window flex-1 font-mono text-[11px] p-3 text-muted-foreground overflow-auto whitespace-pre leading-relaxed">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
