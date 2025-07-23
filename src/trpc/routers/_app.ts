import { messagesRouter } from "@/modules/messages/server/prodcedures";
import { createTRPCRouter } from "../init";
import { projectsRouter } from "@/modules/projects/server/prodcedures";
import { githubRouter } from "./github"; // new GitHub router

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectsRouter,
  github: githubRouter
});
// export type definition of API
export type AppRouter = typeof appRouter;
