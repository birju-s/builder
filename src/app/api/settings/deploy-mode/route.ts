import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // For now, get deploy mode from the first project owned by user
  // In a real app, this might be a user-level setting
  const project = await prisma.project.findFirst({
    where: { ownerId: userId },
    select: { deployMode: true },
  });

  return NextResponse.json({ 
    mode: project?.deployMode || 'CPANEL' 
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { mode } = await req.json();
  if (!mode || !['cpanel', 'whmcs'].includes(mode.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid deploy mode' }, { status: 400 });
  }

  const deployMode = mode.toUpperCase() as 'CPANEL' | 'WHMCS';

  // Update all projects owned by this user
  await prisma.project.updateMany({
    where: { ownerId: userId },
    data: { deployMode },
  });

  return NextResponse.json({ success: true, mode: deployMode });
}
