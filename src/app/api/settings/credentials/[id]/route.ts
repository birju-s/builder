import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credentialId = params.id;

  // Ensure the credential belongs to the authenticated user
  const credential = await prisma.gitCredential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  await prisma.gitCredential.delete({
    where: { id: credentialId },
  });

  return NextResponse.json({ success: true });
}
