import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const { message, isFollowUp } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Send the iterative request to the code agent
    await inngest.send({
      name: 'code-agent/run',
      data: {
        projectId,
        value: message,
        isFollowUp: Boolean(isFollowUp),
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Processing your request...'
    });
  } catch (error) {
    console.error('Iterate error:', error);
    return NextResponse.json(
      { error: 'Failed to process iterative request' },
      { status: 500 }
    );
  }
}
