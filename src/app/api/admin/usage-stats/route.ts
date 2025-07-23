import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  
  // TODO: Add proper admin role check
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get total users count
    const totalUsers = await prisma.usageQuota.count();

    // Get total builds across all users
    const quotaSum = await prisma.usageQuota.aggregate({
      _sum: {
        buildsUsed: true,
        storageUsedMB: true,
      },
    });

    // Get top users by builds
    const topUsers = await prisma.usageQuota.findMany({
      orderBy: { buildsUsed: 'desc' },
      take: 10,
      select: {
        userId: true,
        buildsUsed: true,
        storageUsedMB: true,
      },
    });

    // Get recent activity
    const recentActivity = await prisma.analytics.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        userId: true,
        action: true,
        amount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      totalUsers,
      totalBuilds: quotaSum._sum.buildsUsed || 0,
      totalStorage: (quotaSum._sum.storageUsedMB || 0) * 1024 * 1024, // Convert to bytes
      topUsers: topUsers.map(user => ({
        userId: user.userId,
        builds: user.buildsUsed,
        storage: user.storageUsedMB * 1024 * 1024, // Convert to bytes
      })),
      recentActivity,
    });
  } catch (error) {
    console.error('Failed to fetch usage stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
