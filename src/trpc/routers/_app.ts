import { messagesRouter } from "@/modules/messages/server/prodcedures";
import { createTRPCRouter } from "../init";
import { projectsRouter } from "@/modules/projects/server/prodcedures";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectsRouter
});
// export type definition of API
export type AppRouter = typeof appRouter;