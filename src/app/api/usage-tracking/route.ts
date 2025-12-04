import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { usageTracker } from "@/lib/usage-tracker"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "usage_stats") {
      const stats = await usageTracker.getUserUsageStats(session.user.id)
      return NextResponse.json(stats)
    }

    if (action === "real_time_metrics") {
      const metrics = await usageTracker.getRealTimeUsageMetrics(session.user.id)
      return NextResponse.json(metrics)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Usage tracking API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, ...data } = await request.json()

    if (action === "track_manual_usage") {
      const { type, amount, metadata } = data

      if (!type || !amount) {
        return NextResponse.json({ error: "Type and amount are required" }, { status: 400 })
      }

      // Track manual usage (for admin purposes or special cases)
      const result = await usageTracker.trackApiUsage(
        request,
        session.user.id,
        metadata?.apiKey,
        metadata?.predictionType || "basic"
      )

      return NextResponse.json({ success: result })
    }

    if (action === "simulate_billing_event") {
      // Only allow admins to simulate billing events
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }

      const { userId, cost } = data
      if (!userId || !cost) {
        return NextResponse.json({ error: "User ID and cost are required" }, { status: 400 })
      }

      // Simulate billing event
      await usageTracker["checkBillingThreshold"](userId, cost)

      return NextResponse.json({ success: true, message: "Billing event simulated" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Usage tracking API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}