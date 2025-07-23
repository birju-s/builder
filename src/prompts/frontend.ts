// src/prompts/frontend.ts
// Slightly refactored from the original PROMPT, now accepts digest.
import { PROMPT as OLD_FRONTEND_PROMPT } from "@/prompt";

export function frontendPrompt(digest: string = ""): string {
  return `${digest}\n\n${OLD_FRONTEND_PROMPT}`;
}
