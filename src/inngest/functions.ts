import {z} from 'zod';
import { openai, createAgent, createTool, createNetwork , type Tool } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter"

import { inngest } from "@/inngest/client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
// Use the new modular prompt system
import { getPrompt, GenerationStepType } from "@/prompts";
// Import rolling summary utility
import { updateRollingSummary } from "packages/core/summary/rollingSummary";
// GitHub adapter for auto-push
import { pushFiles } from "packages/adapters/github";
// Import conversation context utilities
import { getConversationHistory, buildIterativePrompt, saveConversationTurn } from "@/lib/conversation";
// Code quality analysis
import { analyzeCode, autoFixIssues } from "@/lib/code-analysis";

// Prisma client (already imported below but moved up for clarity)
import { prisma } from '@/lib/db';

interface AgentState{
  summary: string;
  files: {[path: string]: string};
};

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" }, 
    { event: "code-agent/run" },
      async({ event, step} ) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
          const sandbox = await Sandbox.create("builder-2");
          return sandbox.sandboxId;
        });

      /*
       * Determine which generation step we are running.  The orchestrator
       * should eventually pass this via `event.data.stepType`, but we default
       * to `"frontend"` to stay backward-compatible with existing events.
       */
      const stepType: GenerationStepType =
        (event.data?.stepType as GenerationStepType) ?? "frontend";

      // Load the project row to retrieve the existing rolling-summary digest
      const project = await prisma.project.findUnique({
        where: { id: event.data.projectId },
        select: { id: true, digest: true, manifest: true, repoUrl: true },
      });

      if (!project) {
        throw new Error(`Project not found: ${event.data.projectId}`);
      }

      const digest = project.digest ?? "";
      
      // Determine if this is a follow-up request or initial generation
      const isFollowUp = event.data.isFollowUp === true;
      
      // Get system prompt based on conversation context
      const systemPrompt = await step.run("prepare-prompt", async () => {
        if (isFollowUp) {
          // For follow-up requests, build an iterative prompt with conversation history
          const conversationHistory = await getConversationHistory(event.data.projectId);
          return buildIterativePrompt(conversationHistory, digest, event.data.value);
        } else {
          // For initial requests, use the standard prompt
          return getPrompt(stepType, digest);
        }
      });

      // Save the user's request as a conversation turn
      await step.run("save-user-turn", async () => {
        await saveConversationTurn({
          projectId: event.data.projectId,
          role: "USER",
          content: event.data.value
        });
      });

      const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description:"An expert coding agent",
      // Use the context-aware system prompt
      system: systemPrompt,
      model: openai({ 
        model: "gpt-4.1", 
        defaultParameters:{
          temperature:0.1
        }
      }),
      
      tools:[
        createTool({
          name: "terminal",
          description: "Use this to run shell commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, {step}) => {
            return await step?.run("terminal", async() => {
              const buffers = {stdout: "", stderr: ""};
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command,{
                  onStdout:(data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  } 
                });
                return result.stdout;
              } catch (e) {
                console.error(
                  `Command failed: ${e} \n stdout ${buffers.stdout}\nstderror:${buffers.stderr}`,
                );
                return `Command failed: ${e} \n stdout ${buffers.stdout}\nstderror:${buffers.stderr}`;
              }
            });
          },          
          }),
        createTool({ 
          name: "createOrUpdateFiles",
          description: "Use this to create or update files in the sandbox",  
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              }),
            ),
          }),
          handler: async (
              { files }, 
              {step , network}: Tool.Options<AgentState>
            ) => {
              const newFiles = await step?.run("createOrUpdateFiles",async() => {
                try{
                    const updatedFiles = network.state.data.files || {};
                    const sandbox = await getSandbox(sandboxId);
                    for (const file of files) {
                      console.log(`Creating or updating file: ${file.path}`);
                      await sandbox.files.write(file.path, file.content);
                      updatedFiles[file.path] = file.content;
                    }
                    console.log("Updated files:", updatedFiles);
                    return updatedFiles;
                  }catch (e) {
                    return `Error creating or updating files:` + e;
                  }
              });
            
            if(typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }            
          }
        }),
         createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(            
              z.object({
                path: z.string(),
                content: z.string(),
              }),
            ),
          }),
          handler: async (data, {step}) => {
            console.log("Reading files from readFiles:", data.files);
            return await step?.run("readFiles", async () => {
              try{              
              const sandbox = await getSandbox(sandboxId);
              const contents = [];
              console.log("File.count:", data.files.length);
              for ( const file of data.files) {   
                const content = await sandbox.files.read(file.path);
                contents.push({path: file, content});
                console.log("-----------------------------");
                console.log(`Read file ${file}:`, content);
                console.log("-----------------------------");

              }
              console.log("Read files:", JSON.stringify(contents));
              return JSON.stringify (contents);
              } catch (e) { 
                return `Error reading files: ${e}`;
              }
            })
          },
        })      
      ],
      lifecycle: {
        onResponse:async ({ result, network }) =>  {
          const lastAssistantMessageText = 
          lastAssistantTextMessageContent(result);

          if(lastAssistantMessageText && network){
            if(lastAssistantMessageText.includes("<task_summary>")){
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
      },
    }); 

    const network = createNetwork<AgentState>({
      name: "code-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async({network}) => {
        const summary = network.state.data.summary;
        if(summary)
          return;
        return codeAgent;
      }
    });

    const result = await network.run(event.data.value);    

    const isError = 
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    // Update rolling summary based on the generated files
    if (!isError && result.state.data.files) {
      await step.run("update-rolling-summary", async () => {
        try {
          // Get existing manifest or create empty one
          const existingManifest = project?.manifest ? project.manifest : {};
          
          // Update the manifest and generate a new digest
          const { manifest, digest } = updateRollingSummary(
            existingManifest,
            result.state.data.files
          );
          
          // Save the updated manifest and digest to the project
          await prisma.project.update({
            where: { id: event.data.projectId },
            data: {
              manifest,
              digest
            }
          });
          
          console.log("Updated rolling summary for project:", event.data.projectId);
        } catch (error) {
          console.error("Failed to update rolling summary:", error);
        }
      });

      /**
       * ─────────────────────────────────────────────────────────────
       * Code-analysis & optional auto-fix
       * We run analysis once files are present, auto-fix simple
       * issues (e.g., console.log removal, missing alt text) and
       * persist the analysis for later display.
       * ─────────────────────────────────────────────────────────────
       */
      const { analysis, fixedFiles } = await step.run("code-analysis", async () => {
        const analysis = await analyzeCode(result.state.data.files);
        const fixedFiles = autoFixIssues(result.state.data.files, analysis.issues);
        return { analysis, fixedFiles };
      });

      // Replace files in state with auto-fixed version so Git push & fragment store correct code
      result.state.data.files = fixedFiles;
      // attach analysis for later persistence
      (result.state.data as any).analysis = analysis;

      // Push updated files to GitHub if the project is linked to a repository
      if (project?.repoUrl) {
        await step.run("push-to-github", async () => {
          try {
            await pushFiles({
              repoUrl: project.repoUrl!,
              branch: "main",
              files: result.state.data.files,
              commitMessage: "chore(builder): auto-sync generated files",
            });
            console.log("Pushed updated files to GitHub for project:", event.data.projectId);
          } catch (err) {
            console.error("GitHub push failed:", err);
          }
        });
      }
    }

    // Save the assistant's response as a conversation turn
    await step.run("save-assistant-turn", async () => {
      if (!isError && result.state.data.summary) {
        await saveConversationTurn({
          projectId: event.data.projectId,
          role: "ASSISTANT",
          content: result.state.data.summary
        });
      }
    });

    await step.run("save-result", async () => {
      if(isError){
        return prisma.message.create({
          data:{
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again.",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      })

    });
    return { 
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  });  
