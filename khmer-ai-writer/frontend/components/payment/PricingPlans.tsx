import React from 'react'

const plans = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: ['Core writing and chat', 'Standard speed', 'Community support', 'Basic limits'],
    popular: false
  },
  {
    name: 'Premium',
    price: { monthly: 29, yearly: 290 },
    features: ['Longer context', 'Higher quality output', 'API access', 'Priority support', 'Extended limits', 'Usage insights'],
    popular: true
  },
  {
    name: 'Business',
    price: { monthly: 99, yearly: 990 },
    features: ['Unlimited usage', 'Team management', 'Enterprise models', 'Dedicated support', 'Highest limits', 'Advanced analytics'],
    popular: false
  }
]

export default function PricingPlans() {
  const [billing, setBilling] = React.useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded ${billing === 'monthly' ? 'bg-primary text-white' : 'bg-card text-foreground'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-2 rounded ${billing === 'yearly' ? 'bg-primary text-white' : 'bg-card text-foreground'}`}
          >
            Yearly (Save 17%)
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`pricing-card rounded-lg p-6 ${plan.popular ? 'pricing-card-selected' : ''}`}
          >
            {plan.popular && (
              <div className="bg-primary text-white text-sm px-3 py-1 rounded-full mb-4 text-center">
                Most Popular
              </div>
            )}
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold mb-4">
              ${plan.price[billing]}
              <span className="text-sm text-muted-foreground">/{billing === 'yearly' ? 'year' : 'month'}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="text-success mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90">
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
