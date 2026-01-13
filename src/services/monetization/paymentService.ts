/**
 * Payment Service
 * Handles monetization: Stripe, PayPal, GitHub Sponsors
 * Open-source friendly: Core remains free, premium features optional
 */

export interface PaymentProvider {
  id: 'stripe' | 'paypal' | 'github_sponsors';
  name: string;
  enabled: boolean;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

export interface PaymentStatus {
  subscribed: boolean;
  tier?: string;
  provider?: string;
  expiresAt?: number;
}

class PaymentService {
  private providers: PaymentProvider[] = [
    { id: 'stripe', name: 'Stripe', enabled: false },
    { id: 'paypal', name: 'PayPal', enabled: false },
    { id: 'github_sponsors', name: 'GitHub Sponsors', enabled: true },
  ];

  private tiers: SubscriptionTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'USD',
      features: [
        'Core browser (open-source)',
        'Basic AI features',
        'Local-first privacy',
        'Community support',
      ],
    },
    {
      id: 'supporter',
      name: 'Supporter',
      price: 5,
      currency: 'USD',
      features: [
        'Everything in Free',
        'GitHub Sponsors badge',
        'Early access to features',
        'Priority support',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 10,
      currency: 'USD',
      features: [
        'Everything in Supporter',
        'Advanced AI models',
        'Cloud sync (optional)',
        'Custom AI patterns',
        'Commercial license',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 50,
      currency: 'USD',
      features: [
        'Everything in Premium',
        'Custom integrations',
        'Dedicated support',
        'On-premise deployment',
        'SLA guarantee',
      ],
    },
  ];

  /**
   * Get available payment providers
   */
  getProviders(): PaymentProvider[] {
    return this.providers.filter(p => p.enabled);
  }

  /**
   * Get subscription tiers
   */
  getTiers(): SubscriptionTier[] {
    return this.tiers;
  }

  /**
   * Get current payment status
   */
  async getPaymentStatus(): Promise<PaymentStatus> {
    // Check localStorage for subscription status
    const stored = localStorage.getItem('regen:subscription');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid data
      }
    }

    // Default: free tier
    return {
      subscribed: false,
      tier: 'free',
    };
  }

  /**
   * Subscribe via GitHub Sponsors (open-source friendly)
   */
  async subscribeGitHubSponsors(tierId: string): Promise<void> {
    const tier = this.tiers.find(t => t.id === tierId);
    if (!tier) {
      throw new Error('Invalid tier');
    }

    // Redirect to GitHub Sponsors
    const username = 'nrbns'; // Replace with actual GitHub username
    window.open(`https://github.com/sponsors/${username}`, '_blank');
    
    // Store subscription intent
    localStorage.setItem(
      'regen:subscription:pending',
      JSON.stringify({ tier: tierId, provider: 'github_sponsors' })
    );
  }

  /**
   * Subscribe via Stripe (for premium features)
   */
  async subscribeStripe(tierId: string): Promise<void> {
    // TODO: Integrate Stripe Checkout
    // For now, stub implementation
    console.log('[PaymentService] Stripe subscription:', tierId);
    throw new Error('Stripe integration not yet implemented');
  }

  /**
   * Subscribe via PayPal
   */
  async subscribePayPal(tierId: string): Promise<void> {
    // TODO: Integrate PayPal
    console.log('[PaymentService] PayPal subscription:', tierId);
    throw new Error('PayPal integration not yet implemented');
  }

  /**
   * Check if user has premium features
   */
  async hasPremiumAccess(): Promise<boolean> {
    const status = await this.getPaymentStatus();
    return status.subscribed && status.tier !== 'free';
  }

  /**
   * Get feature access level
   */
  async getFeatureAccess(feature: string): Promise<boolean> {
    const status = await this.getPaymentStatus();
    
    // Free features available to all
    const freeFeatures = [
      'core_browser',
      'basic_ai',
      'local_storage',
      'privacy_mode',
    ];
    
    if (freeFeatures.includes(feature)) {
      return true;
    }

    // Premium features require subscription
    return status.subscribed && status.tier !== 'free';
  }
}

export const paymentService = new PaymentService();
