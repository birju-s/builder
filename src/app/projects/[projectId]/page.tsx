import { ProojectView } from "@/modules/projects/server/ui/project-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import dynamic from "next/dynamic";

/**
 * Server page for a single project.
 * Adds support for a visual-editor mode by checking `?mode=visual`.
 * When that flag is present we render the client-side VisualEditor instead
 * of the AI chat interface.
 */
interface Props {
  params: {
    projectId: string;
  };
  searchParams?: {
    /** mode can be "visual" to load the visual site builder */
    mode?: string;
  };
}

// VisualEditor runs entirely on the client; disable SSR.
const VisualEditor = dynamic(
  () => import("./visual-editor/VisualEditor").then((m) => m.VisualEditor),
  { ssr: false }
);

const Page = async ({ params, searchParams }: Props) => {
    const { projectId } = params;

    const queryCient =  getQueryClient();
    void queryCient.prefetchQuery(trpc.messages.getMany.queryOptions({
        projectId: projectId,
    }));
    void queryCient.prefetchQuery(trpc.projects.getOne.queryOptions({
        id: projectId,
    }));

    return(
        <HydrationBoundary state={dehydrate(queryCient)}>
            <Suspense fallback={<p>Loading Project...</p>}>

            {searchParams?.mode === "visual" ? (
              /* Visual site-builder view */
              <VisualEditor projectId={projectId} />
            ) : (
              /* Default AI chat / code interface */
              <ProojectView projectId={projectId} />
            )}

            </Suspense>
        </HydrationBoundary>
    );
}

export default Page;
