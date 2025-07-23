// src/lib/analytics.ts
import { prisma } from './db';

export interface AnalyticsEventParams {
  userId: string;
  projectId?: string;
  action: string;
  amount: number;
}

/**
 * Track an analytics event
 * @param params Event parameters (userId, projectId, action, amount)
 */
export async function trackEvent(params: AnalyticsEventParams) {
  try {
    await prisma.analytics.create({
      data: {
        userId: params.userId,
        projectId: params.projectId,
        action: params.action,
        amount: params.amount,
      },
    });
  } catch (error) {
    // Don't fail the main flow if analytics fails
    console.error('Analytics tracking failed:', error);
  }
}

/**
 * Get usage statistics for a user
 * @param userId User identifier
 */
export async function getUserUsage(userId: string) {
  const [quota, recentEvents] = await Promise.all([
    prisma.usageQuota.findUnique({
      where: { userId },
    }),
    prisma.analytics.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return { quota, recentEvents };
}

/**
 * Initialize default quota for a new user
 * @param userId User identifier
 */
export async function initializeUserQuota(userId: string) {
  const DEFAULT_BUILDS_LIMIT = 100; // per month
  const DEFAULT_STORAGE_LIMIT_MB = 500; // 500MB
  
  // Calculate next month for reset date
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1);
  resetAt.setDate(1); // First day of next month
  resetAt.setHours(0, 0, 0, 0);

  await prisma.usageQuota.upsert({
    where: { userId },
    create: {
      userId,
      monthlyBuildCap: DEFAULT_BUILDS_LIMIT,
      buildsUsed: 0,
      storageCapMB: DEFAULT_STORAGE_LIMIT_MB,
      storageUsedMB: 0,
      resetAt,
    },
    update: {}, // No-op if already exists
  });
}

/**
 * Check if user has exceeded their quota
 * @param userId User identifier
 */
export async function checkQuotaExceeded(userId: string): Promise<{
  exceeded: boolean;
  reason?: string;
}> {
  const quota = await prisma.usageQuota.findUnique({
    where: { userId },
  });

  if (!quota) {
    // Initialize quota for new user
    await initializeUserQuota(userId);
    return { exceeded: false };
  }

  if (quota.buildsUsed >= quota.monthlyBuildCap) {
    return {
      exceeded: true,
      reason: `Monthly build limit exceeded (${quota.buildsUsed}/${quota.monthlyBuildCap})`,
    };
  }

  if (quota.storageUsedMB >= quota.storageCapMB) {
    return {
      exceeded: true,
      reason: `Storage limit exceeded (${quota.storageUsedMB}/${quota.storageCapMB} MB)`,
    };
  }

  return { exceeded: false };
}

/**
 * Increment build usage for a user
 * @param userId User identifier
 */
export async function incrementBuildUsage(userId: string) {
  // Calculate reset date if creating new record
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1);
  resetAt.setDate(1);
  resetAt.setHours(0, 0, 0, 0);

  await prisma.usageQuota.upsert({
    where: { userId },
    create: {
      userId,
      buildsUsed: 1,
      monthlyBuildCap: 100,
      storageCapMB: 500,
      storageUsedMB: 0,
      resetAt,
    },
    update: {
      buildsUsed: {
        increment: 1,
      },
    },
  });
}

/**
 * Update storage usage for a user
 * @param userId User identifier
 * @param additionalMB Additional storage used in MB
 */
export async function updateStorageUsage(userId: string, additionalMB: number) {
  // Calculate reset date if creating new record
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1);
  resetAt.setDate(1);
  resetAt.setHours(0, 0, 0, 0);

  await prisma.usageQuota.upsert({
    where: { userId },
    create: {
      userId,
      buildsUsed: 0,
      monthlyBuildCap: 100,
      storageCapMB: 500,
      storageUsedMB: additionalMB,
      resetAt,
    },
    update: {
      storageUsedMB: {
        increment: additionalMB,
      },
    },
  });
}
