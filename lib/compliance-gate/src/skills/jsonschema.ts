import { z } from "zod";

/** Minimal JSON Schema shape used for MCP tool input schemas. */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  minimum?: number;
  description?: string;
}

/**
 * Convert the flat Zod object schemas used by Compliance Gate skills into JSON
 * Schema for MCP `inputSchema`. Supports objects, strings, numbers, booleans,
 * enums, arrays of the above, plus optional/default/described wrappers.
 *
 * This intentionally covers only the primitives this package uses rather than
 * pulling in a full zod-to-json-schema dependency.
 */
export function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  return convert(schema);
}

function unwrap(schema: z.ZodTypeAny): {
  inner: z.ZodTypeAny;
  optional: boolean;
  description?: string;
} {
  let inner = schema;
  let optional = false;
  let description: string | undefined = schema.description;

  // Peel optional / default / nullable wrappers.
  for (;;) {
    if (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault) {
      optional = true;
      inner = inner._def.innerType as z.ZodTypeAny;
    } else if (inner instanceof z.ZodNullable) {
      inner = inner._def.innerType as z.ZodTypeAny;
    } else {
      break;
    }
    description = description ?? inner.description;
  }

  return { inner, optional, description };
}

function convert(schema: z.ZodTypeAny): JsonSchema {
  const { inner, description } = unwrap(schema);

  if (inner instanceof z.ZodObject) {
    const shape = inner.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, field] of Object.entries(shape)) {
      const { optional } = unwrap(field);
      properties[key] = convert(field);
      if (!optional) required.push(key);
    }
    const out: JsonSchema = { type: "object", properties };
    if (required.length > 0) out.required = required;
    if (description) out.description = description;
    return out;
  }

  if (inner instanceof z.ZodString) {
    return desc({ type: "string" }, description);
  }
  if (inner instanceof z.ZodNumber) {
    const checks = (inner._def.checks ?? []) as Array<{
      kind: string;
      value?: number;
    }>;
    const out: JsonSchema = {
      type: checks.some((c) => c.kind === "int") ? "integer" : "number",
    };
    const min = checks.find((c) => c.kind === "min");
    if (min && typeof min.value === "number") out.minimum = min.value;
    return desc(out, description);
  }
  if (inner instanceof z.ZodBoolean) {
    return desc({ type: "boolean" }, description);
  }
  if (inner instanceof z.ZodEnum) {
    return desc(
      { type: "string", enum: inner._def.values as string[] },
      description,
    );
  }
  if (inner instanceof z.ZodArray) {
    return desc(
      { type: "array", items: convert(inner._def.type as z.ZodTypeAny) },
      description,
    );
  }

  // Fallback: permissive string.
  return desc({ type: "string" }, description);
}

function desc(schema: JsonSchema, description?: string): JsonSchema {
  if (description) schema.description = description;
  return schema;
}
