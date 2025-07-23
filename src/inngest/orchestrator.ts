// src/inngest/orchestrator.ts
// Fan-out orchestrator: kicks off parallel frontend, backend and database generation steps.

import { inngest } from "@/inngest/client";

/** Event: project.generate
 *  data: { projectId: string, value: string }
 */
export const orchestrateProjectGeneration = inngest.createFunction(
  { id: "generate-project" },
  { event: "project.generate" },
  async ({ event, step }) => {
    const { projectId, value } = event.data;

    // 1. Emit fan-out events in parallel
    await step.sendEvent("fan-out", [
      {
        name: "code-agent/run",
        data: { projectId, value, stepType: "frontend" },
      },
      {
        name: "code-agent/run",
        data: { projectId, value, stepType: "backend" },
      },
      {
        name: "code-agent/run",
        data: { projectId, value, stepType: "database" },
      },
    ]);

    // 2. Wait for all 3 to complete (Inngest waitForEvents)
    await step.waitForEvents("wait-all", {
      events: [
        { event: "code-agent/finished", timeout: "30m", if: `data.stepType == 'frontend' && data.projectId == '${projectId}'` },
        { event: "code-agent/finished", timeout: "30m", if: `data.stepType == 'backend'  && data.projectId == '${projectId}'` },
        { event: "code-agent/finished", timeout: "30m", if: `data.stepType == 'database' && data.projectId == '${projectId}'` },
      ],
    });

    // 3. Trigger sandbox setup
    await step.sendEvent("setup-sandbox", {
      name: "sandbox.setup",
      data: { projectId },
    });

    return { status: "fan-out complete" };
  }
);
