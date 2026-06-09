import type { z } from "zod";
import type { SkillDefinition } from "./definitions";

export interface VercelAiTool {
  description: string;
  parameters: z.ZodType;
  execute: (args: unknown) => Promise<unknown>;
}

/**
 * Convert Compliance Gate skills into Vercel AI SDK tools.
 *
 * @example
 * import { generateText } from "ai";
 * const tools = toVercelAiTools(createComplianceSkills(gate));
 * await generateText({ model, tools, prompt });
 */
export function toVercelAiTools(
  skills: SkillDefinition[],
): Record<string, VercelAiTool> {
  const tools: Record<string, VercelAiTool> = {};
  for (const skill of skills) {
    tools[skill.name] = {
      description: skill.description,
      parameters: skill.schema,
      execute: (args: unknown) => skill.execute(args as never),
    };
  }
  return tools;
}
