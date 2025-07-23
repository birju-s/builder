import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider, token } = await req.json();
  if (!provider || !token) {
    return NextResponse.json({ error: 'Missing provider or token' }, { status: 400 });
  }

  // Simple base64 encoding (in production, use proper encryption)
  const encrypted = Buffer.from(token);

  await prisma.gitCredential.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, encrypted },
    update: { encrypted },
  });

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credentials = await prisma.gitCredential.findMany({
    where: { userId },
    select: { id: true, provider: true, createdAt: true },
  });

  return NextResponse.json({ credentials });
}
