import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSubscription, cancelSubscription, reactivateSubscription, updateSubscription } from "@/lib/stripe"
import { subscriptionPlans } from "@/lib/subscription-plans"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { priceId, action } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    let result

    switch (action) {
      case "create":
        result = await createSubscription(session.user.id, priceId)
        break
      case "cancel":
        result = await cancelSubscription(session.user.id)
        break
      case "reactivate":
        result = await reactivateSubscription(session.user.id)
        break
      case "update":
        result = await updateSubscription(session.user.id, priceId)
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Subscription API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return subscription plans
    return NextResponse.json({
      plans: subscriptionPlans,
      currentPlan: session.user.subscription,
    })
  } catch (error) {
    console.error("Subscription API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}