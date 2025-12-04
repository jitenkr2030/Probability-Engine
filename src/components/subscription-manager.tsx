"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { subscriptionPlans, SubscriptionPlanConfig } from "@/lib/subscription-plans"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface SubscriptionManagerProps {
  currentPlan?: any
}

export function SubscriptionManager({ currentPlan }: SubscriptionManagerProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (!session?.user?.id) return

    setIsLoading(planName)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          action: "create",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription")
      }

      // Redirect to Stripe checkout
      const stripe = await stripePromise
      if (stripe && data.clientSecret) {
        const { error } = await stripe.confirmCardPayment(data.clientSecret)
        if (error) {
          throw new Error(error.message || "Payment failed")
        }
      }

      setSuccess(`Successfully subscribed to ${planName}!`)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!session?.user?.id) return

    setIsLoading("cancel")
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription")
      }

      setSuccess("Subscription cancelled successfully")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!session?.user?.id) return

    setIsLoading("reactivate")
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reactivate",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate subscription")
      }

      setSuccess("Subscription reactivated successfully")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  const handleUpdateSubscription = async (priceId: string, planName: string) => {
    if (!session?.user?.id) return

    setIsLoading(planName)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          action: "update",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update subscription")
      }

      setSuccess(`Successfully updated to ${planName}!`)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  const isCurrentPlan = (plan: SubscriptionPlanConfig) => {
    return currentPlan?.plan === plan.id
  }

  const canUpgrade = (plan: SubscriptionPlanConfig) => {
    if (!currentPlan) return true
    const planOrder = ["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"]
    const currentIndex = planOrder.indexOf(currentPlan.plan)
    const planIndex = planOrder.indexOf(plan.id)
    return planIndex > currentIndex
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {subscriptionPlans.map((plan) => (
          <Card key={plan.id} className={`relative ${isCurrentPlan(plan) ? "border-primary" : ""}`}>
            {isCurrentPlan(plan) && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Badge variant="default">Current Plan</Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">${plan.price.monthly}</span>
                <span className="text-muted-foreground">/month</span>
                {plan.price.yearly < plan.price.monthly * 12 && (
                  <div className="text-sm text-green-600">
                    ${plan.price.yearly}/year (save ${(plan.price.monthly * 12 - plan.price.yearly)})
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Icons.check className="mr-2 h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrentPlan(plan) ? (
                <div className="space-y-2">
                  {currentPlan?.status === "CANCELLED" ? (
                    <Button 
                      className="w-full" 
                      onClick={handleReactivateSubscription}
                      disabled={isLoading === "reactivate"}
                    >
                      {isLoading === "reactivate" && (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Reactivate
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleCancelSubscription}
                      disabled={isLoading === "cancel"}
                    >
                      {isLoading === "cancel" && (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      if (canUpgrade(plan)) {
                        handleUpdateSubscription(plan.stripePriceIds.monthly!, plan.name)
                      } else {
                        handleSubscribe(plan.stripePriceIds.monthly!, plan.name)
                      }
                    }}
                    disabled={isLoading === plan.name || plan.id === "FREE"}
                  >
                    {isLoading === plan.name && (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {canUpgrade(plan) ? "Upgrade" : "Subscribe"}
                  </Button>
                  
                  {plan.price.yearly < plan.price.monthly * 12 && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        if (canUpgrade(plan)) {
                          handleUpdateSubscription(plan.stripePriceIds.yearly!, plan.name)
                        } else {
                          handleSubscribe(plan.stripePriceIds.yearly!, plan.name)
                        }
                      }}
                      disabled={isLoading === `${plan.name}-yearly` || plan.id === "FREE"}
                    >
                      {isLoading === `${plan.name}-yearly` && (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Yearly Plan
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}