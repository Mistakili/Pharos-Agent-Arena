import type { SkillDefinition } from "./definitions";
import { type JsonSchema, zodToJsonSchema } from "./jsonschema";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

/**
 * Convert Compliance Gate skills into MCP tool descriptors (for a
 * `tools/list` response).
 */
export function toMcpTools(skills: SkillDefinition[]): McpTool[] {
  return skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    inputSchema: zodToJsonSchema(skill.schema),
  }));
}

/**
 * Validate and execute a skill by name (for an MCP `tools/call` handler).
 * Input is validated against the skill's Zod schema before execution.
 */
export async function callMcpTool(
  skills: SkillDefinition[],
  name: string,
  args: unknown,
): Promise<unknown> {
  const skill = skills.find((s) => s.name === name);
  if (!skill) throw new Error(`Unknown tool: ${name}`);
  const parsed = skill.schema.parse(args);
  return skill.execute(parsed as never);
}
