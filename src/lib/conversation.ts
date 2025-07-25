import { prisma } from './db';
import { MessageRole } from '@prisma/client';

export interface ConversationContext {
  projectId: string;
  turns: Array<{
    role: MessageRole;
    content: string;
    createdAt: Date;
  }>;
  currentFiles: Record<string, string>;
  lastSummary?: string;
}

/**
 * Get conversation history for context-aware prompts
 */
export async function getConversationContext(projectId: string): Promise<ConversationContext> {
  // Get recent conversation turns (last 10 to avoid token overflow)
  const turns = await prisma.conversationTurn.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      role: true,
      content: true,
      createdAt: true,
    },
  });

  // Get current project state (files from latest fragment)
  const latestFragment = await prisma.fragment.findFirst({
    where: { 
      message: { projectId } 
    },
    orderBy: { createdAt: 'desc' },
    select: { files: true },
  });

  // Get the last assistant summary for continuity
  const lastAssistantTurn = turns.find(turn => turn.role === 'ASSISTANT');

  return {
    projectId,
    turns: turns.reverse(), // Chronological order for context
    currentFiles: (latestFragment?.files as Record<string, string>) || {},
    lastSummary: lastAssistantTurn?.content,
  };
}

/**
 * -----------------------------------------------------------------
 * Public helpers expected by other modules (e.g. Inngest functions)
 * These are thin wrappers around the internal helpers above so that
 * we don’t break existing code while satisfying new import names.
 * -----------------------------------------------------------------
 */

/**
 * Alias for backwards-compatibility.
 * `functions.ts` imports getConversationHistory(...) so we expose it.
 */
export const getConversationHistory = getConversationContext;

/**
 * Add a turn to the conversation history
 */
export async function addConversationTurn(
  projectId: string,
  role: MessageRole,
  content: string
) {
  await prisma.conversationTurn.create({
    data: {
      projectId,
      role,
      content,
    },
  });
}

/**
 * Wrapper that matches the expected name in other modules.
 */
export interface SaveConversationTurnInput {
  projectId: string;
  role: MessageRole;
  content: string;
}

/**
 * saveConversationTurn
 * Accepts a single object (to align with calls elsewhere) and stores the turn
 * in the database via addConversationTurn.
 */
export function saveConversationTurn({
  projectId,
  role,
  content,
}: SaveConversationTurnInput) {
  return addConversationTurn(projectId, role, content);
}
/**
 * Generate context-aware prompt that includes conversation history
 */
function buildIterativePromptInternal(
  context: ConversationContext,
  basePrompt: string,
  newUserRequest: string
): string {
  // Build a readable conversation history string
  const conversationHistory = context.turns
    .map(turn => `${turn.role}: ${turn.content}`)
    .join('\n');

  const currentFilesContext = Object.keys(context.currentFiles).length > 0
    ? `\n\nCURRENT PROJECT FILES:\n${Object.entries(context.currentFiles)
        .map(([path, content]) => `${path}:\n\`\`\`\n${content.slice(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\``)
        .join('\n')}`
    : '';

  return `${basePrompt}

CONVERSATION CONTEXT:
You are continuing an ongoing conversation about this project. Previous exchanges:
${conversationHistory}

${currentFilesContext}

NEW USER REQUEST: ${newUserRequest}

IMPORTANT INSTRUCTIONS FOR ITERATIVE CHANGES:
1. This is a FOLLOW-UP request, not a new project. Build upon what already exists.
2. Only modify files that need changes for this specific request.
3. Preserve existing functionality unless explicitly asked to change it.
4. Reference the conversation history to understand context ("the header" refers to what we discussed before).
5. If modifying existing files, maintain the same structure and imports unless changes are needed.

Continue the conversation by implementing the user's request while maintaining project continuity.`;
}

/**
 * Re-ordered parameter signature expected by `functions.ts`
 * (history, basePrompt, newUserRequest)
 */
export function buildIterativePrompt(
  history: ConversationContext,
  basePrompt: string,
  newUserRequest: string
): string {
  return buildIterativePromptInternal(history, basePrompt, newUserRequest);
}

/**
 * Determine if this is a follow-up conversation vs. new project
 */
export async function isFollowUpConversation(projectId: string): Promise<boolean> {
  const turnCount = await prisma.conversationTurn.count({
    where: { projectId },
  });
  
  return turnCount > 0;
}
