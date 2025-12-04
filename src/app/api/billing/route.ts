import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { apiPricing } from "@/lib/subscription-plans"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, predictionType, quantity = 1 } = await request.json()

    if (action === "check_balance") {
      // Check user's available balance for pay-per-use
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { subscription: true }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Calculate available balance based on subscription
      let availableBalance = 0
      let costPerPrediction = 0

      switch (predictionType) {
        case "basic":
          costPerPrediction = apiPricing.basicPrediction.price
          break
        case "advanced":
          costPerPrediction = apiPricing.advancedPrediction.price
          break
        case "institutional":
          costPerPrediction = apiPricing.institutionalPrediction.price
          break
        default:
          return NextResponse.json({ error: "Invalid prediction type" }, { status: 400 })
      }

      // For enterprise users, they might have unlimited balance
      if (user.subscription?.plan === "ENTERPRISE") {
        availableBalance = -1 // Unlimited
      } else {
        // For other users, calculate based on their subscription limits and usage
        const subscription = user.subscription
        if (subscription) {
          const remainingPredictions = subscription.predictionsLimit === -1 
            ? -1 
            : Math.max(0, subscription.predictionsLimit - subscription.predictionsUsed)
          
          availableBalance = remainingPredictions === -1 ? -1 : remainingPredictions * costPerPrediction
        }
      }

      const totalCost = costPerPrediction * quantity

      return NextResponse.json({
        availableBalance,
        costPerPrediction,
        totalCost,
        canAfford: availableBalance === -1 || availableBalance >= totalCost,
        predictionType,
        quantity
      })
    }

    if (action === "process_usage") {
      // Process pay-per-use usage and deduct from balance
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { subscription: true }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      let costPerPrediction = 0

      switch (predictionType) {
        case "basic":
          costPerPrediction = apiPricing.basicPrediction.price
          break
        case "advanced":
          costPerPrediction = apiPricing.advancedPrediction.price
          break
        case "institutional":
          costPerPrediction = apiPricing.institutionalPrediction.price
          break
        default:
          return NextResponse.json({ error: "Invalid prediction type" }, { status: 400 })
      }

      const totalCost = costPerPrediction * quantity

      // Check if user can afford this usage
      if (user.subscription?.plan !== "ENTERPRISE") {
        const subscription = user.subscription
        if (subscription && subscription.predictionsLimit !== -1) {
          const remainingPredictions = subscription.predictionsLimit - subscription.predictionsUsed
          if (remainingPredictions < quantity) {
            return NextResponse.json({ 
              error: "Insufficient balance",
              required: totalCost,
              available: remainingPredictions * costPerPrediction
            }, { status: 400 })
          }
        }
      }

      // Record the usage
      await prisma.usage.create({
        data: {
          userId: session.user.id,
          type: "PREDICTION",
          amount: quantity,
          metadata: {
            predictionType,
            costPerPrediction,
            totalCost,
            billingType: "pay_per_use",
            timestamp: new Date().toISOString()
          }
        }
      })

      // Update subscription usage if applicable
      if (user.subscription && user.subscription.predictionsLimit !== -1) {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: {
            predictionsUsed: {
              increment: quantity
            }
          }
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PAY_PER_USE_PREDICTION",
          resource: "Prediction",
          metadata: {
            predictionType,
            quantity,
            costPerPrediction,
            totalCost,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        processed: quantity,
        totalCost,
        remainingBalance: user.subscription?.plan === "ENTERPRISE" 
          ? "Unlimited" 
          : user.subscription && user.subscription.predictionsLimit !== -1
            ? Math.max(0, user.subscription.predictionsLimit - user.subscription.predictionsUsed - quantity)
            : "Unknown"
      })
    }

    if (action === "get_pricing_info") {
      // Return current pricing information
      return NextResponse.json({
        pricing: apiPricing,
        userPlan: session.user.subscription?.plan || "FREE"
      })
    }

    if (action === "purchase_credits") {
      // Handle credit purchase (would integrate with Stripe in real implementation)
      const { amount, currency = "usd" } = await request.json()

      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }

      // Mock credit purchase - in real implementation, this would create a Stripe payment intent
      const creditsPurchased = amount / apiPricing.basicPrediction.price // Convert to prediction credits

      // Create a record of the purchase
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREDITS_PURCHASED",
          resource: "Billing",
          metadata: {
            amount,
            currency,
            creditsPurchased,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        amount,
        currency,
        creditsPurchased,
        message: "Credit purchase initiated (mock implementation)"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Billing API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "usage_summary") {
      // Get pay-per-use usage summary
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const usage = await prisma.usage.findMany({
        where: {
          userId: session.user.id,
          type: "PREDICTION",
          date: {
            gte: thirtyDaysAgo
          },
          metadata: {
            path: ["billingType"],
            equals: "pay_per_use"
          }
        }
      })

      const summary = {
        totalPredictions: usage.reduce((sum, u) => sum + u.amount, 0),
        totalCost: usage.reduce((sum, u) => sum + (u.metadata?.totalCost || 0), 0),
        byType: {
          basic: usage.filter(u => u.metadata?.predictionType === "basic").reduce((sum, u) => sum + u.amount, 0),
          advanced: usage.filter(u => u.metadata?.predictionType === "advanced").reduce((sum, u) => sum + u.amount, 0),
          institutional: usage.filter(u => u.metadata?.predictionType === "institutional").reduce((sum, u) => sum + u.amount, 0),
        },
        dailyBreakdown: [] as any[]
      }

      // Generate daily breakdown
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const dayUsage = usage.filter(u => 
          u.date >= dayStart && u.date <= dayEnd
        )

        summary.dailyBreakdown.push({
          date: dayStart.toISOString().split('T')[0],
          predictions: dayUsage.reduce((sum, u) => sum + u.amount, 0),
          cost: dayUsage.reduce((sum, u) => sum + (u.metadata?.totalCost || 0), 0),
        })
      }

      return NextResponse.json(summary)
    }

    if (action === "billing_history") {
      // Get billing history for pay-per-use
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "20")
      const skip = (page - 1) * limit

      const [usage, total] = await Promise.all([
        prisma.usage.findMany({
          where: {
            userId: session.user.id,
            type: "PREDICTION",
            metadata: {
              path: ["billingType"],
              equals: "pay_per_use"
            }
          },
          orderBy: { date: "desc" },
          skip,
          take: limit,
        }),
        prisma.usage.count({
          where: {
            userId: session.user.id,
            type: "PREDICTION",
            metadata: {
              path: ["billingType"],
              equals: "pay_per_use"
            }
          }
        })
      ])

      const billingHistory = usage.map(u => ({
        id: u.id,
        date: u.date,
        predictionType: u.metadata?.predictionType,
        quantity: u.amount,
        costPerPrediction: u.metadata?.costPerPrediction,
        totalCost: u.metadata?.totalCost,
      }))

      return NextResponse.json({
        billingHistory,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Billing API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}