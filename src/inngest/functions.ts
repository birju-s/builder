import {z} from 'zod';
import { openai, createAgent, createTool, createNetwork , type Tool } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter"

import { inngest } from "@/inngest/client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
// Use the new modular prompt system
import { getPrompt, GenerationStepType } from "@/prompts";
// Import rolling summary utility
import { updateRollingSummary } from "packages/core/summary/rollingSummary";

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
        select: { id: true, digest: true, manifest: true },
      });

      const digest = project?.digest ?? "";

      const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description:"An expert coding agent",
      // Inject the rolling summary digest into the prompt
      system: getPrompt(stepType, digest),
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
    }

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
