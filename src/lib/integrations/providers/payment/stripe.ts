import { IntegrationProvider } from '../../types';

export const stripeIntegration: IntegrationProvider = {
  id: 'stripe',
  name: 'Stripe',
  type: 'payment',
  description: 'Complete payment platform with subscriptions, one-time payments, and marketplace support',
  icon: 'https://stripe.com/favicon.ico',
  website: 'https://stripe.com',
  
  configSchema: [
    {
      key: 'publishableKey',
      label: 'Publishable Key',
      type: 'text',
      description: 'Your Stripe publishable key (starts with pk_)',
      required: true,
      placeholder: 'pk_test_...',
      validation: {
        pattern: '^pk_(test|live)_',
      },
    },
    {
      key: 'webhookSecret',
      label: 'Webhook Endpoint Secret',
      type: 'password',
      description: 'Webhook endpoint secret for verifying events',
      required: false,
      placeholder: 'whsec_...',
    },
    {
      key: 'currency',
      label: 'Default Currency',
      type: 'select',
      description: 'Default currency for payments',
      required: true,
      options: [
        { label: 'USD - US Dollar', value: 'usd' },
        { label: 'EUR - Euro', value: 'eur' },
        { label: 'GBP - British Pound', value: 'gbp' },
        { label: 'CAD - Canadian Dollar', value: 'cad' },
        { label: 'AUD - Australian Dollar', value: 'aud' },
        { label: 'JPY - Japanese Yen', value: 'jpy' },
      ],
    },
  ],
  
  envVars: [
    {
      key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      description: 'Stripe publishable key for client-side',
      required: true,
      sensitive: false,
    },
    {
      key: 'STRIPE_SECRET_KEY',
      description: 'Stripe secret key for server-side',
      required: true,
      sensitive: true,
    },
    {
      key: 'STRIPE_WEBHOOK_SECRET',
      description: 'Webhook endpoint secret',
      required: false,
      sensitive: true,
    },
  ],
  
  templates: {
    setup: `
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// app/layout.tsx - Add Stripe Elements provider
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Elements stripe={stripePromise}>
          {children}
        </Elements>
      </body>
    </html>
  );
}
`,
    
    components: [
      {
        name: 'CheckoutButton',
        description: 'One-click checkout button for products',
        category: 'payment',
        code: `
import { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';

interface CheckoutButtonProps {
  priceId: string;
  quantity?: number;
  children?: React.ReactNode;
  className?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function CheckoutButton({
  priceId,
  quantity = 1,
  children = 'Buy Now',
  className,
  successUrl = window.location.origin + '/success',
  cancelUrl = window.location.origin,
}: CheckoutButtonProps) {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!stripe) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          quantity,
          successUrl,
          cancelUrl,
        }),
      });
      
      const { sessionId } = await response.json();
      
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        console.error('Checkout error:', error);
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={!stripe || loading}
      className={className}
    >
      {loading ? 'Processing...' : children}
    </Button>
  );
}
`,
        props: [
          {
            name: 'priceId',
            type: 'string',
            required: true,
            description: 'Stripe Price ID for the product',
          },
          {
            name: 'quantity',
            type: 'number',
            required: false,
            description: 'Quantity to purchase',
            defaultValue: 1,
          },
          {
            name: 'children',
            type: 'React.ReactNode',
            required: false,
            description: 'Button content',
            defaultValue: 'Buy Now',
          },
          {
            name: 'successUrl',
            type: 'string',
            required: false,
            description: 'URL to redirect after successful payment',
          },
          {
            name: 'cancelUrl',
            type: 'string',
            required: false,
            description: 'URL to redirect when payment is cancelled',
          },
        ],
        examples: [
          '<CheckoutButton priceId="price_1234">Buy Product</CheckoutButton>',
          '<CheckoutButton priceId="price_1234" quantity={2} />',
        ],
      },
      
      {
        name: 'SubscriptionButton',
        description: 'Subscription checkout with plan selection',
        category: 'payment',
        code: `
import { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

interface SubscriptionButtonProps {
  plan: SubscriptionPlan;
  userId?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SubscriptionButton({
  plan,
  userId,
  className,
  children,
}: SubscriptionButtonProps) {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!stripe) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId,
        }),
      });
      
      const { sessionId } = await response.json();
      
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        console.error('Subscription error:', error);
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="border rounded-lg p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <div className="text-2xl font-bold">
            ${plan.price}
            <span className="text-sm font-normal text-muted-foreground">
              /{plan.interval}
            </span>
          </div>
        </div>
        
        <ul className="space-y-2 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <Badge variant="outline" className="mr-2">✓</Badge>
              {feature}
            </li>
          ))}
        </ul>
        
        <Button
          onClick={handleSubscribe}
          disabled={!stripe || loading}
          className="w-full"
        >
          {loading ? 'Processing...' : (children || 'Subscribe')}
        </Button>
      </div>
    </div>
  );
}
`,
        props: [
          {
            name: 'plan',
            type: 'SubscriptionPlan',
            required: true,
            description: 'Subscription plan configuration',
          },
          {
            name: 'userId',
            type: 'string',
            required: false,
            description: 'User ID for subscription tracking',
          },
          {
            name: 'className',
            type: 'string',
            required: false,
            description: 'Additional CSS classes',
          },
        ],
        examples: [
          '<SubscriptionButton plan={basicPlan} />',
          '<SubscriptionButton plan={proPlan} userId={user.id} />',
        ],
      },
      
      {
        name: 'PaymentForm',
        description: 'Inline payment form with card element',
        category: 'payment',
        code: `
import { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  className?: string;
}

export function PaymentForm({
  amount,
  currency = 'usd',
  onSuccess,
  onError,
  className,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create payment intent
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });
      
      const { clientSecret } = await response.json();
      
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required',
      });
      
      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        onError?.(stripeError);
      } else {
        onSuccess?.(paymentIntent);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-lg font-semibold text-center">
            ${(amount / 100).toFixed(2)} {currency.toUpperCase()}
          </div>
          
          <PaymentElement />
          
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          
          <Button
            type="submit"
            disabled={!stripe || loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
`,
        props: [
          {
            name: 'amount',
            type: 'number',
            required: true,
            description: 'Amount in cents (e.g., 2000 for $20.00)',
          },
          {
            name: 'currency',
            type: 'string',
            required: false,
            description: 'Currency code',
            defaultValue: 'usd',
          },
          {
            name: 'onSuccess',
            type: '(paymentIntent: any) => void',
            required: false,
            description: 'Callback when payment succeeds',
          },
          {
            name: 'onError',
            type: '(error: any) => void',
            required: false,
            description: 'Callback when payment fails',
          },
        ],
        examples: [
          '<PaymentForm amount={2000} />',
          '<PaymentForm amount={5000} currency="eur" onSuccess={handleSuccess} />',
        ],
      },
    ],
    
    hooks: [
      {
        name: 'useSubscription',
        description: 'Get current user subscription status',
        code: `
import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodEnd: Date;
  priceId: string;
  planName: string;
}

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetch(\`/api/stripe/subscription/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setSubscription(data.subscription);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  return {
    subscription,
    loading,
    error,
    isActive: subscription?.status === 'active',
    isPastDue: subscription?.status === 'past_due',
  };
}
`,
        params: [
          {
            name: 'userId',
            type: 'string',
            description: 'User ID to check subscription for',
          },
        ],
        returns: '{ subscription: Subscription | null, loading: boolean, error: string | null, isActive: boolean, isPastDue: boolean }',
        examples: [
          'const { subscription, isActive } = useSubscription(user.id);',
          'const { loading, error } = useSubscription(userId);',
        ],
      },
    ],
    
    utils: [
      {
        name: 'webhookHandler',
        description: 'Webhook handler for Stripe events',
        code: `
// app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        // Handle subscription changes
        console.log('Subscription updated:', event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        // Handle successful payment
        console.log('Payment succeeded:', event.data.object);
        break;
        
      case 'invoice.payment_failed':
        // Handle failed payment
        console.log('Payment failed:', event.data.object);
        break;
        
      default:
        console.log(\`Unhandled event type: \${event.type}\`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
`,
        examples: [
          'Add webhook endpoint at /api/stripe/webhook',
          'Configure webhook URL in Stripe dashboard',
          'Handle subscription and payment events',
        ],
      },
    ],
  },
  
  docs: {
    quickStart: `
1. Sign up at https://stripe.com and get your API keys
2. Add environment variables to your project
3. Install Stripe dependencies
4. Add Elements provider to your app layout
5. Create API routes for checkout and webhooks
6. Use payment components in your UI
`,
    examples: [
      'One-time payment checkout',
      'Subscription billing with multiple plans',
      'Custom payment form with card element',
      'Webhook handling for payment events',
    ],
    troubleshooting: `
Common issues:
- Make sure webhook secret is configured correctly
- Test with Stripe test cards in development
- Check CORS settings for client-side requests
- Verify amount is in cents, not dollars
`,
  },
  
  pricing: {
    freeTier: false,
    paidPlans: '2.9% + 30¢ per successful card charge',
  },
  
  dependencies: {
    npm: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js'],
    types: ['@types/stripe'],
  },
};
