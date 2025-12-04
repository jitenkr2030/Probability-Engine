import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export interface UsageTrackingConfig {
  enableRateLimiting: boolean
  enableBilling: boolean
  enableRealTimeTracking: boolean
  billingThreshold: number // Amount in cents before triggering billing
}

export class UsageTracker {
  private config: UsageTrackingConfig

  constructor(config: UsageTrackingConfig) {
    this.config = config
  }

  async trackApiUsage(request: NextRequest, userId: string, apiKey?: string, predictionType: string = "basic"): Promise<boolean> {
    try {
      // Check if user exists and has active subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      })

      if (!user) {
        return false
      }

      // Check subscription limits
      const subscription = user.subscription
      if (!subscription || subscription.status !== "ACTIVE") {
        return false
      }

      // Check API call limits
      if (subscription.apiCallsLimit !== -1 && subscription.apiCallsUsed >= subscription.apiCallsLimit) {
        return false
      }

      // Get pricing based on prediction type
      const pricing = this.getPricing(predictionType)
      const cost = pricing.price

      // Track usage
      await prisma.usage.create({
        data: {
          userId,
          type: "API_CALL",
          amount: 1,
          metadata: {
            predictionType,
            cost,
            apiKey,
            endpoint: request.nextUrl.pathname,
            method: request.method,
            userAgent: request.headers.get("user-agent"),
            ip: request.headers.get("x-forwarded-for") || "unknown",
            timestamp: new Date().toISOString(),
          }
        }
      })

      // Update subscription usage
      await prisma.subscription.update({
        where: { userId },
        data: {
          apiCallsUsed: {
            increment: 1
          }
        }
      })

      // Update API key usage if provided
      if (apiKey) {
        await prisma.apiKey.update({
          where: { key: apiKey },
          data: {
            usageCount: {
              increment: 1
            },
            lastUsedAt: new Date()
          }
        })
      }

      // Real-time billing check
      if (this.config.enableBilling && this.config.enableRealTimeTracking) {
        await this.checkBillingThreshold(userId, cost)
      }

      return true
    } catch (error) {
      console.error("Error tracking API usage:", error)
      return false
    }
  }

  async trackPredictionUsage(request: NextRequest, userId: string, symbol: string, predictionType: string = "basic"): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      })

      if (!user) {
        return false
      }

      const subscription = user.subscription
      if (!subscription || subscription.status !== "ACTIVE") {
        return false
      }

      // Check prediction limits
      if (subscription.predictionsLimit !== -1 && subscription.predictionsUsed >= subscription.predictionsLimit) {
        return false
      }

      const pricing = this.getPricing(predictionType)
      const cost = pricing.price

      // Track prediction usage
      await prisma.usage.create({
        data: {
          userId,
          type: "PREDICTION",
          amount: 1,
          metadata: {
            predictionType,
            symbol,
            cost,
            endpoint: request.nextUrl.pathname,
            method: request.method,
            userAgent: request.headers.get("user-agent"),
            ip: request.headers.get("x-forwarded-for") || "unknown",
            timestamp: new Date().toISOString(),
          }
        }
      })

      // Update subscription usage
      await prisma.subscription.update({
        where: { userId },
        data: {
          predictionsUsed: {
            increment: 1
          }
        }
      })

      // Real-time billing check
      if (this.config.enableBilling && this.config.enableRealTimeTracking) {
        await this.checkBillingThreshold(userId, cost)
      }

      return true
    } catch (error) {
      console.error("Error tracking prediction usage:", error)
      return false
    }
  }

  async trackDataExport(request: NextRequest, userId: string, exportType: string, dataSize: number): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      })

      if (!user) {
        return false
      }

      const subscription = user.subscription
      if (!subscription || subscription.status !== "ACTIVE") {
        return false
      }

      // Check if user has data export permissions
      if (subscription.plan === "FREE" && dataSize > 1000) {
        return false
      }

      const cost = this.calculateDataExportCost(exportType, dataSize)

      // Track data export usage
      await prisma.usage.create({
        data: {
          userId,
          type: "DATA_EXPORT",
          amount: dataSize,
          metadata: {
            exportType,
            dataSize,
            cost,
            endpoint: request.nextUrl.pathname,
            method: request.method,
            userAgent: request.headers.get("user-agent"),
            ip: request.headers.get("x-forwarded-for") || "unknown",
            timestamp: new Date().toISOString(),
          }
        }
      })

      // Real-time billing check
      if (this.config.enableBilling && this.config.enableRealTimeTracking) {
        await this.checkBillingThreshold(userId, cost)
      }

      return true
    } catch (error) {
      console.error("Error tracking data export usage:", error)
      return false
    }
  }

  private async checkBillingThreshold(userId: string, cost: number): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      })

      if (!subscription) return

      // Calculate total usage cost for current billing cycle
      const usage = await prisma.usage.findMany({
        where: {
          userId,
          date: {
            gte: subscription.stripeCurrentPeriodEnd || new Date(0)
          }
        }
      })

      const totalCost = usage.reduce((sum, u) => sum + (u.metadata?.cost || 0), 0) + cost

      // Check if billing threshold is reached
      if (totalCost >= this.config.billingThreshold) {
        await this.triggerBillingEvent(userId, totalCost)
      }
    } catch (error) {
      console.error("Error checking billing threshold:", error)
    }
  }

  private async triggerBillingEvent(userId: string, totalCost: number): Promise<void> {
    try {
      // Create billing event notification
      await prisma.notification.create({
        data: {
          userId,
          type: "BILLING",
          title: "Billing Threshold Reached",
          message: `Your usage has reached $${(totalCost / 100).toFixed(2)}. A billing event has been triggered.`,
          metadata: {
            totalCost,
            threshold: this.config.billingThreshold,
            timestamp: new Date().toISOString(),
          }
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BILLING_THRESHOLD_REACHED",
          resource: "UsageTracker",
          metadata: {
            totalCost,
            threshold: this.config.billingThreshold,
          }
        }
      })

      // In a real implementation, this would integrate with Stripe for automatic billing
      console.log(`Billing event triggered for user ${userId}: $${(totalCost / 100).toFixed(2)}`)
    } catch (error) {
      console.error("Error triggering billing event:", error)
    }
  }

  private getPricing(predictionType: string): { price: number; description: string } {
    const pricing = {
      basic: { price: 0.01, description: "Standard 5-minute stock prediction" },
      advanced: { price: 0.05, description: "Enhanced prediction with sentiment analysis" },
      institutional: { price: 0.10, description: "Institutional-grade prediction with risk management" },
    }

    return pricing[predictionType as keyof typeof pricing] || pricing.basic
  }

  private calculateDataExportCost(exportType: string, dataSize: number): number {
    const baseCost = {
      CSV: 0.001,
      JSON: 0.002,
      XML: 0.0015,
      EXCEL: 0.003,
    }

    return (baseCost[exportType as keyof typeof baseCost] || baseCost.CSV) * dataSize
  }

  async getUserUsageStats(userId: string): Promise<{
    apiCalls: { used: number; limit: number; percentage: number }
    predictions: { used: number; limit: number; percentage: number }
    dataExports: { used: number; limit: number; percentage: number }
    totalCost: number
    billingCycle: { start: Date; end: Date }
  }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      })

      if (!subscription) {
        throw new Error("Subscription not found")
      }

      const currentUsage = await prisma.usage.findMany({
        where: {
          userId,
          date: {
            gte: subscription.stripeCurrentPeriodEnd || new Date(0)
          }
        }
      })

      const apiCalls = currentUsage.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0)
      const predictions = currentUsage.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0)
      const dataExports = currentUsage.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0)
      const totalCost = currentUsage.reduce((sum, u) => sum + (u.metadata?.cost || 0), 0)

      const billingCycleStart = subscription.stripeCurrentPeriodEnd || new Date(0)
      const billingCycleEnd = new Date(billingCycleStart)
      billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1)

      return {
        apiCalls: {
          used: subscription.apiCallsUsed,
          limit: subscription.apiCallsLimit,
          percentage: subscription.apiCallsLimit !== -1 ? (subscription.apiCallsUsed / subscription.apiCallsLimit) * 100 : 0
        },
        predictions: {
          used: subscription.predictionsUsed,
          limit: subscription.predictionsLimit,
          percentage: subscription.predictionsLimit !== -1 ? (subscription.predictionsUsed / subscription.predictionsLimit) * 100 : 0
        },
        dataExports: {
          used: dataExports,
          limit: subscription.plan === "FREE" ? 1000 : -1,
          percentage: subscription.plan === "FREE" ? (dataExports / 1000) * 100 : 0
        },
        totalCost,
        billingCycle: {
          start: billingCycleStart,
          end: billingCycleEnd
        }
      }
    } catch (error) {
      console.error("Error getting user usage stats:", error)
      throw error
    }
  }

  async getRealTimeUsageMetrics(userId: string): Promise<{
    currentSession: {
      apiCalls: number
      predictions: number
      dataExports: number
      startTime: Date
    }
    dailyTotals: {
      apiCalls: number
      predictions: number
      dataExports: number
      cost: number
    }
    alerts: Array<{
      type: string
      message: string
      severity: "info" | "warning" | "error"
      timestamp: Date
    }>
  }> {
    try {
      const now = new Date()
      const sessionStart = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours

      const currentSession = await prisma.usage.findMany({
        where: {
          userId,
          date: {
            gte: sessionStart
          }
        }
      })

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const dailyTotals = await prisma.usage.findMany({
        where: {
          userId,
          date: {
            gte: todayStart
          }
        }
      })

      const alerts = await this.generateUsageAlerts(userId)

      return {
        currentSession: {
          apiCalls: currentSession.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0),
          predictions: currentSession.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0),
          dataExports: currentSession.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0),
          startTime: sessionStart
        },
        dailyTotals: {
          apiCalls: dailyTotals.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0),
          predictions: dailyTotals.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0),
          dataExports: dailyTotals.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0),
          cost: dailyTotals.reduce((sum, u) => sum + (u.metadata?.cost || 0), 0)
        },
        alerts
      }
    } catch (error) {
      console.error("Error getting real-time usage metrics:", error)
      throw error
    }
  }

  private async generateUsageAlerts(userId: string): Promise<Array<{
    type: string
    message: string
    severity: "info" | "warning" | "error"
    timestamp: Date
  }>> {
    const alerts = []
    const now = new Date()

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      })

      if (!subscription) return alerts

      // Check API call limits
      if (subscription.apiCallsLimit !== -1) {
        const apiPercentage = (subscription.apiCallsUsed / subscription.apiCallsLimit) * 100
        if (apiPercentage >= 90) {
          alerts.push({
            type: "API_LIMIT_WARNING",
            message: `API usage at ${apiPercentage.toFixed(1)}% of limit`,
            severity: "warning",
            timestamp: now
          })
        }
      }

      // Check prediction limits
      if (subscription.predictionsLimit !== -1) {
        const predPercentage = (subscription.predictionsUsed / subscription.predictionsLimit) * 100
        if (predPercentage >= 90) {
          alerts.push({
            type: "PREDICTION_LIMIT_WARNING",
            message: `Prediction usage at ${predPercentage.toFixed(1)}% of limit`,
            severity: "warning",
            timestamp: now
          })
        }
      }

      // Check for unusual activity patterns
      const recentUsage = await prisma.usage.findMany({
        where: {
          userId,
          date: {
            gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
          }
        }
      })

      if (recentUsage.length > 1000) {
        alerts.push({
          type: "HIGH_ACTIVITY",
          message: "Unusually high activity detected in the last hour",
          severity: "info",
          timestamp: now
        })
      }

      return alerts
    } catch (error) {
      console.error("Error generating usage alerts:", error)
      return alerts
    }
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker({
  enableRateLimiting: true,
  enableBilling: true,
  enableRealTimeTracking: true,
  billingThreshold: 1000 // $10.00 threshold
})

// Middleware function for usage tracking
export async function usageTrackingMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return null
    }

    const userId = session.user.id
    const apiKey = request.headers.get("x-api-key")
    const pathname = request.nextUrl.pathname

    // Track different types of usage based on endpoint
    if (pathname.startsWith("/api/predictions")) {
      const symbol = pathname.split("/").pop() || "UNKNOWN"
      const predictionType = request.nextUrl.searchParams.get("type") || "basic"
      
      const canProceed = await usageTracker.trackPredictionUsage(request, userId, symbol, predictionType)
      if (!canProceed) {
        return NextResponse.json({ error: "Prediction limit reached" }, { status: 429 })
      }
    } else if (pathname.startsWith("/api/data-exports")) {
      const exportType = request.nextUrl.searchParams.get("format") || "CSV"
      const dataSize = parseInt(request.nextUrl.searchParams.get("size") || "1000")
      
      const canProceed = await usageTracker.trackDataExport(request, userId, exportType, dataSize)
      if (!canProceed) {
        return NextResponse.json({ error: "Data export limit reached" }, { status: 429 })
      }
    } else if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      const predictionType = request.nextUrl.searchParams.get("predictionType") || "basic"
      
      const canProceed = await usageTracker.trackApiUsage(request, userId, apiKey || undefined, predictionType)
      if (!canProceed) {
        return NextResponse.json({ error: "API limit reached" }, { status: 429 })
      }
    }

    return null // Allow request to proceed
  } catch (error) {
    console.error("Usage tracking middleware error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}