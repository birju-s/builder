// src/inngest/deploy.ts
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { deployToCpanel } from "packages/adapters/cpanel";
import { deployThroughWhmcs } from "packages/adapters/cpanel/whmcs";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const deployToCpanelFn = inngest.createFunction(
  { id: "deploy-cpanel" },
  { event: "project.deploy" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // 1. Fetch project + user credentials & determine deployment mode
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    // Determine which credential provider we need
    const providerNeeded = project.deployMode === "WHMCS" ? "whmcs" : "cpanel";

    const cred = await prisma.gitCredential.findFirst({
      where: { userId: project.ownerId, provider: providerNeeded },
    });
    if (!cred) throw new Error(`No ${providerNeeded} credential on file`);

    // 2. Build project (assumes repo checkout in /tmp/workspace/{projectId})
    const buildDir = `/tmp/workspace/${projectId}`;
    await step.run("build-project", async () => {
      if (!fs.existsSync(buildDir)) {
        throw new Error(`Build directory missing: ${buildDir}`);
      }
      
      console.log(`Building project in ${buildDir}...`);
      
      try {
        // Install dependencies
        console.log("Installing dependencies...");
        await execAsync("pnpm install", { cwd: buildDir });
        
        // Generate Prisma client if schema exists
        if (fs.existsSync(path.join(buildDir, "prisma", "schema.prisma"))) {
          console.log("Generating Prisma client...");
          await execAsync("npx prisma generate", { cwd: buildDir });
        }
        
        // Build the Next.js project
        console.log("Building Next.js project...");
        await execAsync("pnpm build", { cwd: buildDir });
        
        // Create dist directory if it doesn't exist
        const distDir = path.join(buildDir, "dist");
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        
        // Copy necessary files to dist
        console.log("Preparing deployment package...");
        fs.cpSync(path.join(buildDir, ".next"), path.join(distDir, ".next"), { recursive: true });
        fs.cpSync(path.join(buildDir, "public"), path.join(distDir, "public"), { recursive: true });
        fs.cpSync(path.join(buildDir, "package.json"), path.join(distDir, "package.json"));
        
        // Copy Prisma files if they exist
        const prismaDir = path.join(buildDir, "prisma");
        if (fs.existsSync(prismaDir)) {
          fs.cpSync(prismaDir, path.join(distDir, "prisma"), { recursive: true });
        }
        
        // Create start script
        const startScript = `#!/bin/bash
export NODE_ENV=production
npx prisma generate
node server.js
`;
        fs.writeFileSync(path.join(distDir, "start.sh"), startScript);
        fs.chmodSync(path.join(distDir, "start.sh"), 0o755);
        
        console.log("Build completed successfully");
      } catch (error) {
        console.error("Build failed:", error);
        throw new Error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // 3. Deploy via chosen adapter
    const url = await step.run("deploy-site", async () => {
      const token = Buffer.from(cred.encrypted, "base64").toString("utf8");

      if (project.deployMode === "WHMCS") {
        console.log("Deploying via WHMCS MCP…");
        return await deployThroughWhmcs({
          apiUrl: process.env.WHMCS_MCP_URL!,
          apiToken: token,
          projectDir: path.join(buildDir, "dist"),
          siteName: project.name,
        });
      }

      console.log("Deploying to cPanel…");
      return await deployToCpanel({
        apiUrl: process.env.CPANEL_API_URL!,
        apiToken: token,
        projectDir: path.join(buildDir, "dist"),
        siteName: project.name,
      });
    });

    // 4. Update project with published URL
    await step.run("update-project", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: { publishedUrl: url },
      });
      console.log(`Project published at: ${url}`);
    });

    return { url };
  }
);
