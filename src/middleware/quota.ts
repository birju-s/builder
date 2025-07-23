import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkQuotaExceeded, trackEvent } from '@/lib/analytics';

/**
 * Middleware to check quota before allowing build/deploy operations
 */
export async function enforceQuota(
  req: NextRequest,
  action: 'build' | 'deploy'
): Promise<NextResponse | null> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quotaCheck = await checkQuotaExceeded(userId);
    
    if (quotaCheck.exceeded) {
      // Track the denied action
      await trackEvent({
        userId,
        action: `${action}-denied`,
        amount: 1,
      });

      return NextResponse.json(
        { 
          error: 'Quota exceeded', 
          details: quotaCheck.reason,
          code: 'QUOTA_EXCEEDED'
        }, 
        { status: 429 }
      );
    }

    // Track the allowed action
    await trackEvent({
      userId,
      action: `${action}-initiated`,
      amount: 1,
    });

    return null; // Allow the request to proceed
  } catch (error) {
    console.error('Quota enforcement error:', error);
    // Don't block on quota check failures
    return null;
  }
}

/**
 * Helper function to apply quota middleware to API routes
 */
export function withQuotaCheck(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  action: 'build' | 'deploy'
) {
  return async (req: NextRequest, context?: any) => {
    const quotaResponse = await enforceQuota(req, action);
    
    if (quotaResponse) {
      return quotaResponse; // Quota exceeded, return error
    }
    
    return handler(req, context); // Proceed with original handler
  };
}
