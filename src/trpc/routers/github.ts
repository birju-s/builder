import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../init';
import { prisma } from '@/lib/db';
import { GitHubAdapter } from 'packages/adapters/github';

export const githubRouter = createTRPCRouter({
  createRepo: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch Git credential
      const cred = await prisma.gitCredential.findFirst({
        where: {
          userId: ctx.userId,
          provider: 'github',
        },
      });
      if (!cred) throw new Error('GitHub not connected');
      const token = Buffer.from(cred.encrypted, 'base64').toString('utf8');

      const github = new GitHubAdapter({ accessToken: token });
      const url = await github.createRepo(input.name);

      // Optionally store repo URL on project etc.
      return { url };
    }),

  pushInitialCommit: protectedProcedure
    .input(z.object({ 
      repoUrl: z.string().url(),
      projectId: z.string(),
      branch: z.string().default('main')
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch Git credential
      const cred = await prisma.gitCredential.findFirst({
        where: {
          userId: ctx.userId,
          provider: 'github',
        },
      });
      if (!cred) throw new Error('GitHub not connected');
      const token = Buffer.from(cred.encrypted, 'base64').toString('utf8');

      // Fetch project files
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          messages: {
            where: { type: 'RESULT' },
            include: { fragment: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      
      if (!project) throw new Error('Project not found');
      if (!project.messages[0]?.fragment?.files) {
        throw new Error('No files to push');
      }

      const github = new GitHubAdapter({ accessToken: token });
      const result = await github.pushFiles({
        repoUrl: input.repoUrl,
        branch: input.branch,
        files: project.messages[0].fragment.files,
        message: 'Initial commit from AI Builder',
      });

      // Update project with repo URL
      await prisma.project.update({
        where: { id: input.projectId },
        data: { repoUrl: input.repoUrl },
      });

      return result;
    }),

  connectRepo: protectedProcedure
    .input(z.object({ 
      repoUrl: z.string().url(),
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Just store the repo URL on the project
      const project = await prisma.project.update({
        where: { 
          id: input.projectId,
          // Safety check: only allow connecting repos to user's own projects
          // This assumes Project has a userId field
          // userId: ctx.userId 
        },
        data: { repoUrl: input.repoUrl },
      });

      return { success: true, project };
    }),
});
