import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  await inngest.send({
    name: 'project.deploy',
    data: { projectId: params.projectId },
  });
  return NextResponse.json({ ok: true });
}
