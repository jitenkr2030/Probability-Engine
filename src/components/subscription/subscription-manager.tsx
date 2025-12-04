"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { subscriptionPlans } from "@/lib/subscription-plans"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"

interface SubscriptionManagerProps {
  currentPlan?: any
}

export function SubscriptionManager({ currentPlan }: SubscriptionManagerProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  const handleSubscribe = async (priceId: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
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

      if (response.ok) {
        // Redirect to Stripe checkout
        if (data.latest_invoice?.payment_intent?.client_secret) {
          const stripe = await import("@stripe/stripe-js")
          const stripeInstance = await stripe.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
          
          if (stripeInstance) {
            await stripeInstance.confirmCardPayment(data.latest_invoice.payment_intent.client_secret)
          }
        }
        toast.success("Subscription created successfully!")
      } else {
        toast.error(data.error || "Failed to create subscription")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
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

      if (response.ok) {
        toast.success("Subscription cancelled successfully")
      } else {
        toast.error(data.error || "Failed to cancel subscription")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
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

      if (response.ok) {
        toast.success("Subscription reactivated successfully")
      } else {
        toast.error(data.error || "Failed to reactivate subscription")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentPlan = () => {
    if (!currentPlan) return subscriptionPlans[0] // Free plan
    return subscriptionPlans.find(plan => plan.id === currentPlan.plan) || subscriptionPlans[0]
  }

  const getPrice = (plan: typeof subscriptionPlans[0]) => {
    return billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly
  }

  const getPriceId = (plan: typeof subscriptionPlans[0]) => {
    return billingCycle === "yearly" ? plan.stripePriceIds.yearly : plan.stripePriceIds.monthly
  }

  const currentPlanData = getCurrentPlan()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <p className="text-muted-foreground mt-2">
          Choose the plan that best fits your trading needs
        </p>
      </div>

      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as "monthly" | "yearly")}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly (Save 20%)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {subscriptionPlans.map((plan) => {
          const price = getPrice(plan)
          const priceId = getPriceId(plan)
          const isCurrentPlan = currentPlanData.id === plan.id
          const canDowngrade = subscriptionPlans.indexOf(plan) < subscriptionPlans.indexOf(currentPlanData)
          const canUpgrade = subscriptionPlans.indexOf(plan) > subscriptionPlans.indexOf(currentPlanData)

          return (
            <Card key={plan.id} className={`relative ${isCurrentPlan ? "border-primary" : ""}`}>
              {isCurrentPlan && (
                <Badge className="absolute top-4 right-4">Current Plan</Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground">/{billingCycle}</span>
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

                {plan.id === "FREE" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isCurrentPlan ? (
                  <div className="space-y-2">
                    {currentPlan?.status === "CANCELLED" ? (
                      <Button 
                        onClick={handleReactivateSubscription}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? "Processing..." : "Reactivate"}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleCancelSubscription}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {isLoading ? "Processing..." : "Cancel Subscription"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={() => priceId && handleSubscribe(priceId)}
                    disabled={isLoading || !priceId}
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : canUpgrade ? "Upgrade" : "Downgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Plan</p>
                <p className="text-muted-foreground">{currentPlanData.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={currentPlan.status === "ACTIVE" ? "default" : "secondary"}>
                  {currentPlan.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">API Calls</p>
                <p className="text-muted-foreground">
                  {currentPlan.apiCallsUsed} / {currentPlan.apiCallsLimit === -1 ? "Unlimited" : currentPlan.apiCallsLimit}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Predictions</p>
                <p className="text-muted-foreground">
                  {currentPlan.predictionsUsed} / {currentPlan.predictionsLimit === -1 ? "Unlimited" : currentPlan.predictionsLimit}
                </p>
              </div>
            </div>

            {currentPlan.trialEndsAt && new Date(currentPlan.trialEndsAt) > new Date() && (
              <Alert>
                <AlertDescription>
                  Your trial ends on {new Date(currentPlan.trialEndsAt).toLocaleDateString()}. 
                  Upgrade to continue using all features.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}