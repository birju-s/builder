import {z} from 'zod';
import { openai, createAgent, createTool, createNetwork , type Tool } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter"

import { inngest } from "@/inngest/client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from '@/prompt';
// Import conversation context utilities
import { getConversationHistory, buildIterativePrompt, saveConversationTurn } from "@/lib/conversation";

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

        // Get project information for context
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
            return PROMPT;
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
      title: "Frangment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  });  
