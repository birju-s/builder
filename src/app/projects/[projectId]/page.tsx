import { ProojectView } from "@/modules/projects/server/ui/project-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

interface Props{
    params: Promise<{
        projectId: string;
    }>
}

const Page = async ({params}: Props) => {
    const { projectId } = await params; 

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

            <ProojectView projectId={projectId} />

            </Suspense>
        </HydrationBoundary>
    );
}

export default Page;
