import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, userPrompt } from "./prompt";
import type { GenerateRequest } from "./request";
import { OUTPUT_SCHEMA } from "./wire";

/**
 * The call to Claude — on the server only, with the key from the server's
 * settings (ANTHROPIC_API_KEY). The browser never sees the key or talks to
 * Anthropic itself.
 */

/** The ONE place that names the model. */
export const AI_MODEL = "claude-opus-5-5";

/** No key = mock mode (ready-made sample questions, see mock.ts). */
export const aiConfigured = () => (process.env.ANTHROPIC_API_KEY ?? "").trim().length > 0;

export class AiRefused extends Error {}
export class AiCutOff extends Error {}

export type AiAnswer = { data: unknown; model: string; inputTokens: number; outputTokens: number };

let client: Anthropic | null = null;

export async function askClaude(request: GenerateRequest, one = false): Promise<AiAnswer> {
  // One client for the server; a slow answer is given up after two minutes (and not retried for minutes more).
  client ??= new Anthropic({ timeout: 120_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    // If the model's safety checks decline a request, Anthropic re-runs it on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // "Structured output": the answer must be JSON in exactly our schema. Effort is set explicitly (this model's default is "medium").
    output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    // The same instructions every time, so they can be cached and cost less.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt(request, one) }],
  });
  // Always look at WHY it stopped before reading the answer.
  if (response.stop_reason === "refusal") throw new AiRefused(response.stop_details?.category ?? "refusal");
  if (response.stop_reason === "max_tokens") throw new AiCutOff("the answer was cut off");
  const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null; // convert.ts then finds no questions, and the generation is not counted
  }
  return { data, model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
}

export { Anthropic };
