import { SubscriptionPlan } from "@prisma/client"

export interface SubscriptionPlanConfig {
  id: SubscriptionPlan
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
  }
  features: string[]
  limits: {
    apiCalls: number
    predictions: number
    teamMembers: number
    stockCoverage: string
    updateFrequency: string
  }
  stripePriceIds: {
    monthly?: string
    yearly?: string
  }
}

export const subscriptionPlans: SubscriptionPlanConfig[] = [
  {
    id: SubscriptionPlan.FREE,
    name: "Free Tier",
    description: "Perfect for trying out our platform",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      "5 stock predictions per day",
      "Delayed predictions (15-minute delay)",
      "Basic dashboard",
      "Limited historical data",
      "Community support",
    ],
    limits: {
      apiCalls: 1000,
      predictions: 5,
      teamMembers: 1,
      stockCoverage: "50 major stocks (S&P 500)",
      updateFrequency: "15-minute delay",
    },
    stripePriceIds: {},
  },
  {
    id: SubscriptionPlan.BASIC,
    name: "Basic Tier",
    description: "Essential features for active traders",
    price: {
      monthly: 29,
      yearly: 290, // 2 months free
    },
    features: [
      "Real-time predictions for 50 major stocks (S&P 500)",
      "5-minute prediction updates",
      "Basic confidence scores",
      "Mobile app access",
      "Email alerts for significant predictions",
      "Priority customer support",
    ],
    limits: {
      apiCalls: 10000,
      predictions: 50,
      teamMembers: 1,
      stockCoverage: "50 major stocks (S&P 500)",
      updateFrequency: "5-minute updates",
    },
    stripePriceIds: {
      monthly: "price_basic_monthly",
      yearly: "price_basic_yearly",
    },
  },
  {
    id: SubscriptionPlan.PROFESSIONAL,
    name: "Professional Tier",
    description: "Advanced features for serious traders",
    price: {
      monthly: 99,
      yearly: 990, // 2 months free
    },
    features: [
      "Everything in Basic, plus:",
      "1000+ stocks coverage (NYSE, NASDAQ)",
      "Advanced technical indicators",
      "Sentiment analysis integration",
      "Risk management tools",
      "Portfolio tracking",
      "API access (1000 calls/month)",
      "Priority customer support",
    ],
    limits: {
      apiCalls: 100000,
      predictions: 1000,
      teamMembers: 5,
      stockCoverage: "1000+ stocks (NYSE, NASDAQ)",
      updateFrequency: "Real-time",
    },
    stripePriceIds: {
      monthly: "price_professional_monthly",
      yearly: "price_professional_yearly",
    },
  },
  {
    id: SubscriptionPlan.ENTERPRISE,
    name: "Enterprise Tier",
    description: "Institutional-grade features for teams",
    price: {
      monthly: 499,
      yearly: 4990, // 2 months free
    },
    features: [
      "Everything in Professional, plus:",
      "Unlimited stock coverage",
      "Custom prediction models",
      "Institutional-grade data feeds",
      "Advanced backtesting tools",
      "Team collaboration features",
      "Unlimited API access",
      "Dedicated account manager",
      "Custom integration support",
      "White-label options",
    ],
    limits: {
      apiCalls: -1, // Unlimited
      predictions: -1, // Unlimited
      teamMembers: -1, // Unlimited
      stockCoverage: "Unlimited",
      updateFrequency: "Real-time",
    },
    stripePriceIds: {
      monthly: "price_enterprise_monthly",
      yearly: "price_enterprise_yearly",
    },
  },
]

export function getPlanById(id: SubscriptionPlan): SubscriptionPlanConfig | undefined {
  return subscriptionPlans.find(plan => plan.id === id)
}

export function getPlanByStripePriceId(priceId: string): SubscriptionPlanConfig | undefined {
  for (const plan of subscriptionPlans) {
    if (plan.stripePriceIds.monthly === priceId || plan.stripePriceIds.yearly === priceId) {
      return plan
    }
  }
  return undefined
}

export const apiPricing = {
  basicPrediction: {
    price: 0.01, // $0.01 per prediction
    description: "Standard 5-minute stock prediction"
  },
  advancedPrediction: {
    price: 0.05, // $0.05 per prediction
    description: "Enhanced prediction with sentiment analysis"
  },
  institutionalPrediction: {
    price: 0.10, // $0.10 per prediction
    description: "Institutional-grade prediction with risk management"
  },
  bulkDiscount: {
    threshold: 10000, // 10,000 calls
    discount: 0.20 // 20% discount
  }
}