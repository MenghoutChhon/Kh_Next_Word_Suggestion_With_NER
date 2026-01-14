'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check, Crown, Building2, Zap, Shield, Star, Calendar, DollarSign } from 'lucide-react';

interface UpgradePlanProps {
  currentTier: string;
  onUpgrade: (tier: string) => void;
  onCheckout?: (plan: any) => void;
}

export function UpgradePlan({ currentTier, onUpgrade, onCheckout }: UpgradePlanProps) {
  const [selectedPlan, setSelectedPlan] = useState(currentTier);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      price: '$0',
      period: 'forever',
      icon: <Shield className="h-6 w-6" />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      features: [
        'Daily generation limit',
        'Core Khmer suggestions',
        'Community support',
        'Standard response speed'
      ],
      limitations: [
        'No API access',
        'No team features',
        'No usage insights'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 29,
      annualPrice: 290,
      price: billingCycle === 'monthly' ? '$29' : '$290',
      period: billingCycle === 'monthly' ? 'per month' : 'per year',
      icon: <Crown className="h-6 w-6" />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      popular: true,
      features: [
        'Higher generation limits',
        'Advanced Khmer models',
        'API access (500 calls/hour)',
        'Team management (up to 5 members)',
        'Priority support',
        'Usage insights',
        'Quality and style analytics'
      ],
      limitations: [
        'Limited usage insights'
      ]
    },
    {
      id: 'business',
      name: 'Business',
      monthlyPrice: 99,
      annualPrice: 990,
      price: billingCycle === 'monthly' ? '$99' : '$990',
      period: billingCycle === 'monthly' ? 'per month' : 'per year',
      icon: <Building2 className="h-6 w-6" />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      features: [
        'Unlimited generations',
        'Enterprise Khmer models',
        'API access (2000 calls/hour)',
        'Team management',
        'Dedicated support',
        'Advanced analytics',
        'White-label options'
      ],
      limitations: []
    }
  ];

  const handleUpgrade = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (selectedPlan !== currentTier && plan) {
      if (onCheckout) {
        // Pass plan with billing cycle info
        onCheckout({
          ...plan,
          billingCycle
        });
      } else {
        onUpgrade(selectedPlan);
      }
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div className="text-center space-y-4 mb-6">
        <h2 className="text-3xl font-bold text-foreground">
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground text-lg">
          Upgrade to unlock advanced features and higher limits
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm ${billingCycle === 'monthly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Toggle billing cycle"
            title="Toggle billing cycle"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <span className={`text-sm ${billingCycle === 'annual' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Annual</span>
          {billingCycle === 'annual' && (
            <Badge className="bg-success/15 text-foreground ml-2">
              Save up to 17%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="relative">
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <Badge className="bg-primary text-white px-3 py-1 shadow-lg">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
          <Card 
            data-selected={selectedPlan === plan.id}
            className={`pricing-card selectable-card relative cursor-pointer transition-all duration-200 hover:shadow-xl ${
              selectedPlan === plan.id ? 'pricing-card-selected ring-2 ring-primary shadow-xl' : ''
            } ${plan.popular ? 'md:scale-105 mt-4' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <div className="text-white">
                  {plan.icon}
                </div>
              </div>
              
              <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
              
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground ml-1">
                  /{plan.period}
                </span>
              </div>
              
              {currentTier === plan.id && (
                <Badge variant="outline" className="mt-2">
                  Current Plan
                </Badge>
              )}
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground">
                  Features Included:
                </h4>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {plan.limitations.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="font-semibold text-sm text-muted-foreground">
                    Not Included:
                  </h4>
                  {plan.limitations.map((limitation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {limitation}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-white shadow-lg"
                disabled={currentTier === plan.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan(plan.id);
                }}
              >
                {currentTier === plan.id ? 'Current Plan' : `Select ${plan.name}`}
              </Button>
              
              {billingCycle === 'annual' && plan.id !== 'free' && (
                <div className="text-center mt-2">
                  <span className="text-xs text-success font-medium">
                    Save ${(plan.monthlyPrice * 12 - plan.annualPrice)} per year
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        ))}
      </div>

      {selectedPlan !== currentTier && (
        <div className="text-center space-y-4">
          <Button 
            onClick={handleUpgrade}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
            disabled={selectedPlan === currentTier}
          >
            <DollarSign className="h-5 w-5 mr-2" />
            {selectedPlan === 'free' ? 'Current Plan' : `Subscribe to ${plans.find(p => p.id === selectedPlan)?.name}`}
          </Button>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'} billing</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>30-day money back</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Secure payment via KHQR, Credit Card, or Bank Transfer
          </p>
        </div>
      )}

      <Card className="glass-card-premium border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary rounded-lg shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                30-Day Money Back Guarantee
              </h3>
              <p className="text-sm text-muted-foreground">
                Try any paid plan risk-free. If you're not satisfied, we'll refund your money within 30 days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
