import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { checkQuota, QuotaType } from "@/middleware/quota";
import { trackEvent } from "@/lib/analytics";
import { auth } from "@clerk/nextjs";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = params;

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if user has exceeded their deployment quota
    const quotaCheck = await checkQuota(userId, QuotaType.DEPLOY);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Quota exceeded", 
          message: quotaCheck.message,
          resetAt: quotaCheck.resetAt 
        }, 
        { status: 429 }
      );
    }

    // Send deploy event to Inngest
    await inngest.send({
      name: "project.deploy",
      data: {
        projectId,
      },
    });

    // Track the deployment in analytics
    await trackEvent({
      userId,
      projectId,
      action: "deploy",
      amount: 1,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: "Failed to initiate deployment" },
      { status: 500 }
    );
  }
}
