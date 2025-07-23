// src/inngest/setup-sandbox.ts
// After fan-out generation steps complete, copy generated files into a fresh e2b sandbox and start the dev server.

import { inngest } from "@/inngest/client";
import { getSandbox } from "./utils";
import { prisma } from "@/lib/db";

export const setupSandbox = inngest.createFunction(
  { id: "setup-sandbox" },
  { event: "sandbox.setup" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Load project with manifest and most recent fragment
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        id: true,
        manifest: true,
        digest: true
      }
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Load generated files from fragments (we'll need to combine frontend, backend, and db files)
    const fragments = await prisma.fragment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 3, // Get the most recent 3 fragments (frontend, backend, database)
    });

    if (!fragments.length) {
      throw new Error("No generated files found for sandbox setup.");
    }

    // Merge files from all fragments
    const allFiles = {};
    for (const fragment of fragments) {
      if (fragment.files) {
        Object.assign(allFiles, fragment.files);
      }
    }

    if (Object.keys(allFiles).length === 0) {
      throw new Error("No files found in fragments.");
    }

    // Create sandbox & write files
    const sandbox = await step.run("create-sandbox", async () => {
      return await getSandbox("builder-2"); // Use the same template as in functions.ts
    });

    await step.run("write-files", async () => {
      for (const path of Object.keys(allFiles)) {
        console.log(`Writing file to sandbox: ${path}`);
        await sandbox.files.write(path, allFiles[path]);
      }
    });

    // Run setup commands if needed (e.g., for backend)
    await step.run("setup-backend", async () => {
      try {
        // Check if we have Prisma schema - if so, generate client
        if (allFiles["prisma/schema.prisma"]) {
          await sandbox.commands.run("npx prisma generate");
        }
        
        // Install dependencies
        await sandbox.commands.run("pnpm install");
        
        // Start the dev server in background
        await sandbox.commands.run("pnpm dev &");
        
        return "Backend setup complete";
      } catch (error) {
        console.error("Error during backend setup:", error);
        return `Error during backend setup: ${error.message}`;
      }
    });

    const host = sandbox.getHost(3000);
    const previewUrl = `https://${host}`;

    // Save the sandbox ID and preview URL to the project
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        sandboxId: sandbox.sandboxId,
        previewUrl: previewUrl
      },
    });

    // Emit finished event
    await step.sendEvent("sandbox-ready", {
      name: "sandbox.ready",
      data: { 
        projectId, 
        previewUrl,
        sandboxId: sandbox.sandboxId
      },
    });

    return { 
      previewUrl,
      sandboxId: sandbox.sandboxId
    };
  }
);
