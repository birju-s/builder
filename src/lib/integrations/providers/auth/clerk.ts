import { IntegrationProvider } from '../../types';

export const clerkIntegration: IntegrationProvider = {
  id: 'clerk',
  name: 'Clerk',
  type: 'auth',
  description: 'Complete authentication and user management platform with pre-built UI components',
  icon: 'https://clerk.com/favicon.ico',
  website: 'https://clerk.com',
  
  configSchema: [
    {
      key: 'publishableKey',
      label: 'Publishable Key',
      type: 'text',
      description: 'Your Clerk publishable key (starts with pk_)',
      required: true,
      placeholder: 'pk_test_...',
      validation: {
        pattern: '^pk_(test|live)_',
      },
    },
    {
      key: 'signInUrl',
      label: 'Sign In URL',
      type: 'text',
      description: 'Custom sign-in page URL (optional)',
      required: false,
      placeholder: '/sign-in',
    },
    {
      key: 'signUpUrl',
      label: 'Sign Up URL', 
      type: 'text',
      description: 'Custom sign-up page URL (optional)',
      required: false,
      placeholder: '/sign-up',
    },
  ],
  
  envVars: [
    {
      key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      description: 'Clerk publishable key for client-side',
      required: true,
      sensitive: false,
    },
    {
      key: 'CLERK_SECRET_KEY',
      description: 'Clerk secret key for server-side',
      required: true,
      sensitive: true,
    },
  ],
  
  templates: {
    setup: `
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
`,
    
    components: [
      {
        name: 'SignInButton',
        description: 'Pre-built sign-in button component',
        category: 'auth',
        code: `
import { SignInButton as ClerkSignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

interface SignInButtonProps {
  mode?: 'modal' | 'redirect';
  children?: React.ReactNode;
  className?: string;
}

export function SignInButton({ 
  mode = 'modal', 
  children = 'Sign In',
  className 
}: SignInButtonProps) {
  return (
    <ClerkSignInButton mode={mode}>
      <Button className={className}>
        {children}
      </Button>
    </ClerkSignInButton>
  );
}
`,
        props: [
          {
            name: 'mode',
            type: "'modal' | 'redirect'",
            required: false,
            description: 'Whether to show sign-in in modal or redirect to page',
            defaultValue: 'modal',
          },
          {
            name: 'children',
            type: 'React.ReactNode',
            required: false,
            description: 'Button content',
            defaultValue: 'Sign In',
          },
          {
            name: 'className',
            type: 'string',
            required: false,
            description: 'Additional CSS classes',
          },
        ],
        examples: [
          '<SignInButton />',
          '<SignInButton mode="redirect">Log In</SignInButton>',
          '<SignInButton className="bg-blue-500">Sign In</SignInButton>',
        ],
      },
      
      {
        name: 'UserButton',
        description: 'User profile button with dropdown menu',
        category: 'auth',
        code: `
import { UserButton as ClerkUserButton } from '@clerk/nextjs';

interface UserButtonProps {
  showName?: boolean;
  className?: string;
}

export function UserButton({ showName = false, className }: UserButtonProps) {
  return (
    <ClerkUserButton 
      showName={showName}
      className={className}
      appearance={{
        elements: {
          avatarBox: "h-8 w-8",
        }
      }}
    />
  );
}
`,
        props: [
          {
            name: 'showName',
            type: 'boolean',
            required: false,
            description: 'Whether to show user name next to avatar',
            defaultValue: false,
          },
          {
            name: 'className',
            type: 'string',
            required: false,
            description: 'Additional CSS classes',
          },
        ],
        examples: [
          '<UserButton />',
          '<UserButton showName />',
          '<UserButton className="ml-4" />',
        ],
      },
      
      {
        name: 'ProtectedRoute',
        description: 'Wrapper component for protected pages',
        category: 'auth',
        code: `
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/sign-in',
  fallback = <div>Loading...</div>
}: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(redirectTo);
    }
  }, [isLoaded, isSignedIn, router, redirectTo]);

  if (!isLoaded) {
    return <>{fallback}</>;
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
`,
        props: [
          {
            name: 'children',
            type: 'React.ReactNode',
            required: true,
            description: 'Content to show when user is authenticated',
          },
          {
            name: 'redirectTo',
            type: 'string',
            required: false,
            description: 'URL to redirect unauthenticated users',
            defaultValue: '/sign-in',
          },
          {
            name: 'fallback',
            type: 'React.ReactNode',
            required: false,
            description: 'Loading component while checking auth',
            defaultValue: '<div>Loading...</div>',
          },
        ],
        examples: [
          '<ProtectedRoute><Dashboard /></ProtectedRoute>',
          '<ProtectedRoute redirectTo="/login"><AdminPanel /></ProtectedRoute>',
        ],
      },
    ],
    
    hooks: [
      {
        name: 'useUser',
        description: 'Get current user information',
        code: `
import { useUser as useClerkUser } from '@clerk/nextjs';

export function useUser() {
  const { user, isLoaded, isSignedIn } = useClerkUser();
  
  return {
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
    } : null,
    isLoaded,
    isSignedIn,
  };
}
`,
        params: [],
        returns: '{ user: User | null, isLoaded: boolean, isSignedIn: boolean }',
        examples: [
          'const { user, isSignedIn } = useUser();',
          'const { user } = useUser(); // user?.email',
        ],
      },
    ],
    
    utils: [
      {
        name: 'authMiddleware',
        description: 'Middleware for protecting API routes',
        code: `
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ["/", "/api/public"],
  ignoredRoutes: ["/api/webhook"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
`,
        examples: [
          'Add to middleware.ts in your project root',
          'Customize publicRoutes and ignoredRoutes as needed',
        ],
      },
    ],
  },
  
  docs: {
    quickStart: `
1. Sign up at https://clerk.com and create a new application
2. Copy your publishable key and secret key from the dashboard
3. Add the environment variables to your project
4. Wrap your app with ClerkProvider in layout.tsx
5. Use SignInButton and UserButton components in your UI
`,
    examples: [
      'Simple auth flow with modal sign-in',
      'Protected dashboard with user profile',
      'Custom sign-in/sign-up pages',
    ],
    troubleshooting: `
Common issues:
- Make sure environment variables are set correctly
- Check that ClerkProvider wraps your entire app
- Verify middleware configuration for protected routes
`,
  },
  
  pricing: {
    freeTier: true,
    paidPlans: 'Pro plans start at $25/month for 10,000 MAU',
  },
  
  dependencies: {
    npm: ['@clerk/nextjs'],
    types: ['@types/clerk'],
  },
};
