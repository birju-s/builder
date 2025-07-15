"use client"
import { Suspense } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessagesContainer } from "./components/messages-container";


interface Props {
    projectId: string;
};

export const ProojectView = ({projectId}: Props) =>{
 return (
        <div className="h-screen">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={30} minSize={20} className="flex flex-col min-h-0">
                   <Suspense fallback={<p>Loading messages...</p>}>
                    <MessagesContainer projectId={projectId} />
                    </Suspense>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={70} minSize={50} className="flex flex-col min-h-0">
          
                TODO: Preview
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
            
    );

};


