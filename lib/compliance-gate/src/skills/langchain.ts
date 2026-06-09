import type { z } from "zod";
import type { SkillDefinition } from "./definitions";

/**
 * The subset of LangChain's `DynamicStructuredTool` constructor we use. The
 * class is passed in by the caller so this package does not take a hard
 * dependency on `langchain` / `@langchain/core`.
 */
export interface DynamicStructuredToolConstructor {
  new (config: {
    name: string;
    description: string;
    schema: z.ZodType;
    func: (input: unknown) => Promise<string>;
  }): unknown;
}

/**
 * Convert Compliance Gate skills into LangChain structured tools.
 *
 * @example
 * import { DynamicStructuredTool } from "@langchain/core/tools";
 * const tools = toLangChainTools(createComplianceSkills(gate), { DynamicStructuredTool });
 */
export function toLangChainTools(
  skills: SkillDefinition[],
  deps: { DynamicStructuredTool: DynamicStructuredToolConstructor },
): unknown[] {
  const { DynamicStructuredTool } = deps;
  return skills.map(
    (skill) =>
      new DynamicStructuredTool({
        name: skill.name,
        description: skill.description,
        schema: skill.schema,
        func: async (input: unknown) =>
          JSON.stringify(await skill.execute(input as never)),
      }),
  );
}
