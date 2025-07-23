// src/prompts/index.ts
// Export prompt generators and helper functions for the AI Builder

export { frontendPrompt } from "./frontend";
export { backendPrompt } from "./backend";
export { dbPrompt } from "./db";

// Types of generation steps
export type GenerationStepType = 'frontend' | 'backend' | 'database';

/**
 * Returns the appropriate prompt template based on the generation step type
 * @param stepType - Type of generation step (frontend, backend, database)
 * @param digest - Optional rolling summary digest to include in the prompt
 */
export function getPromptForStep(stepType: GenerationStepType, digest: string = ""): string {
  switch (stepType) {
    case 'frontend':
      return frontendPrompt(digest);
    case 'backend':
      return backendPrompt(digest);
    case 'database':
      return dbPrompt(digest);
    default:
      // Fallback to frontend prompt if type is unknown
      return frontendPrompt(digest);
  }
}

// Alias for convenience so callers can simply use getPrompt(...)
export const getPrompt = getPromptForStep;
