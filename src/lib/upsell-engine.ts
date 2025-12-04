import { PrismaClient } from "@prisma/client"
import { subDays, startOfDay, endOfDay } from "date-fns"

const prisma = new PrismaClient()

export interface UpsellTrigger {
  id: string
  name: string
  description: string
  condition: (userData: any) => Promise<boolean>
  action: (userId: string) => Promise<void>
  priority: number
  enabled: boolean
}

export class UpsellEngine {
  private triggers: UpsellTrigger[]

  constructor() {
    this.triggers = [
      {
        id: "high_api_usage",
        name: "High API Usage",
        description: "User is approaching API call limits",
        condition: async (userData) => {
          const { subscription, recentUsage } = userData
          if (subscription.apiCallsLimit === -1) return false
          
          const usagePercentage = (subscription.apiCallsUsed / subscription.apiCallsLimit) * 100
          return usagePercentage >= 80 // 80% of limit
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "api_limit", {
            currentUsage: userData.subscription.apiCallsUsed,
            limit: userData.subscription.apiCallsLimit,
            suggestedPlan: "PROFESSIONAL"
          })
        },
        priority: 1,
        enabled: true
      },
      {
        id: "high_prediction_usage",
        name: "High Prediction Usage",
        description: "User is approaching prediction limits",
        condition: async (userData) => {
          const { subscription, recentUsage } = userData
          if (subscription.predictionsLimit === -1) return false
          
          const usagePercentage = (subscription.predictionsUsed / subscription.predictionsLimit) * 100
          return usagePercentage >= 80 // 80% of limit
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "prediction_limit", {
            currentUsage: userData.subscription.predictionsUsed,
            limit: userData.subscription.predictionsLimit,
            suggestedPlan: "PROFESSIONAL"
          })
        },
        priority: 1,
        enabled: true
      },
      {
        id: "frequent_api_calls",
        name: "Frequent API Calls",
        description: "User makes frequent API calls indicating high engagement",
        condition: async (userData) => {
          const { recentUsage } = userData
          const apiCalls = recentUsage.filter(u => u.type === "API_CALL")
          
          // Check if user made more than 100 API calls in the last 7 days
          return apiCalls.length > 100
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "high_engagement", {
            apiCalls: userData.recentUsage.filter(u => u.type === "API_CALL").length,
            suggestedPlan: "PROFESSIONAL"
          })
        },
        priority: 2,
        enabled: true
      },
      {
        id: "enterprise_features_needed",
        name: "Enterprise Features Needed",
        description: "User is requesting features only available in Enterprise plan",
        condition: async (userData) => {
          const { recentUsage, subscription } = userData
          
          // Check for usage patterns that indicate need for enterprise features
          const hasTeamActivity = recentUsage.some(u => u.type === "TEAM_INVITE")
          const hasDataExports = recentUsage.some(u => u.type === "DATA_EXPORT")
          const hasHighVolumeApi = recentUsage
            .filter(u => u.type === "API_CALL")
            .reduce((sum, u) => sum + u.amount, 0) > 1000
          
          return (hasTeamActivity || hasDataExports || hasHighVolumeApi) && 
                 subscription.plan !== "ENTERPRISE"
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "enterprise_features", {
            suggestedPlan: "ENTERPRISE",
            features: ["Unlimited API calls", "Team collaboration", "Advanced data exports"]
          })
        },
        priority: 3,
        enabled: true
      },
      {
        id: "consistency_pattern",
        name: "Consistent Usage Pattern",
        description: "User shows consistent daily usage indicating commitment",
        condition: async (userData) => {
          const { recentUsage } = userData
          
          // Group usage by day
          const dailyUsage = new Map()
          recentUsage.forEach(usage => {
            const day = usage.date.toISOString().split('T')[0]
            if (!dailyUsage.has(day)) {
              dailyUsage.set(day, 0)
            }
            dailyUsage.set(day, dailyUsage.get(day)! + usage.amount)
          })
          
          // Check if user has been active for at least 20 of the last 30 days
          return dailyUsage.size >= 20
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "consistency", {
            activeDays: userData.recentUsage.length,
            suggestedPlan: "PROFESSIONAL"
          })
        },
        priority: 4,
        enabled: true
      },
      {
        id: "weekend_usage",
        name: "Weekend Usage",
        description: "User is active on weekends indicating professional use",
        condition: async (userData) => {
          const { recentUsage } = userData
          
          const weekendUsage = recentUsage.filter(usage => {
            const day = usage.date.getDay()
            return day === 0 || day === 6 // Saturday or Sunday
          })
          
          return weekendUsage.length > 10 // More than 10 weekend uses
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "professional_use", {
            weekendUses: weekendUsage.length,
            suggestedPlan: "PROFESSIONAL"
          })
        },
        priority: 5,
        enabled: true
      },
      {
        id: "multiple_symbols",
        name: "Multiple Symbols",
        description: "User is tracking multiple stock symbols",
        condition: async (userData) => {
          const { recentUsage } = userData
          
          const symbols = new Set()
          recentUsage.forEach(usage => {
            if (usage.metadata?.symbol) {
              symbols.add(usage.metadata.symbol)
            }
          })
          
          return symbols.size > 10 // Tracking more than 10 symbols
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "multiple_symbols", {
            symbolCount: symbols.size,
            suggestedPlan: "PROFESSIONAL"
          })
        },
        priority: 6,
        enabled: true
      },
      {
        id: "advanced_features_usage",
        name: "Advanced Features Usage",
        description: "User is using advanced features indicating need for higher tier",
        condition: async (userData) => {
          const { recentUsage } = userData
          
          const advancedFeatures = recentUsage.filter(usage => 
            usage.metadata?.predictionType === "advanced" || 
            usage.metadata?.predictionType === "institutional"
          )
          
          return advancedFeatures.length > 20 // More than 20 advanced feature uses
        },
        action: async (userId) => {
          await this.createUpsellNotification(userId, "advanced_features", {
            advancedUses: advancedFeatures.length,
            suggestedPlan: "ENTERPRISE"
          })
        },
        priority: 7,
        enabled: true
      }
    ]
  }

  async evaluateTriggers(): Promise<void> {
    try {
      // Get all active users with subscriptions
      const users = await prisma.user.findMany({
        where: {
          subscription: {
            status: "ACTIVE",
            plan: {
              not: "ENTERPRISE" // Don't upsell enterprise users
            }
          }
        },
        include: {
          subscription: true
        }
      })

      const thirtyDaysAgo = subDays(new Date(), 30)

      for (const user of users) {
        try {
          // Get user's recent usage data
          const recentUsage = await prisma.usage.findMany({
            where: {
              userId: user.id,
              date: {
                gte: thirtyDaysAgo
              }
            }
          })

          const userData = {
            user,
            subscription: user.subscription!,
            recentUsage
          }

          // Evaluate each trigger
          for (const trigger of this.triggers) {
            if (!trigger.enabled) continue

            try {
              const shouldTrigger = await trigger.condition(userData)
              if (shouldTrigger) {
                console.log(`Upsell trigger "${trigger.name}" activated for user ${user.id}`)
                await trigger.action(user.id)
              }
            } catch (error) {
              console.error(`Error evaluating trigger ${trigger.id}:`, error)
            }
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error)
        }
      }
    } catch (error) {
      console.error("Error in upsell evaluation:", error)
    }
  }

  private async createUpsellNotification(userId: string, triggerType: string, metadata: any): Promise<void> {
    try {
      // Check if user already has a recent upsell notification for this trigger
      const recentNotification = await prisma.notification.findFirst({
        where: {
          userId,
          type: "BILLING",
          title: {
            contains: "Upgrade"
          },
          createdAt: {
            gte: subDays(new Date(), 7) // Last 7 days
          }
        }
      })

      if (recentNotification) {
        console.log(`User ${userId} already has a recent upsell notification`)
        return
      }

      // Create personalized upsell message
      const message = this.generateUpsellMessage(triggerType, metadata)

      await prisma.notification.create({
        data: {
          userId,
          type: "BILLING",
          title: "Upgrade Your Plan",
          message,
          metadata: {
            triggerType,
            ...metadata,
            timestamp: new Date().toISOString(),
            action: "UPSELL"
          }
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: "UPSELL_TRIGGERED",
          resource: "Subscription",
          metadata: {
            triggerType,
            ...metadata
          }
        }
      })

      console.log(`Created upsell notification for user ${userId}: ${triggerType}`)
    } catch (error) {
      console.error(`Error creating upsell notification for user ${userId}:`, error)
    }
  }

  private generateUpsellMessage(triggerType: string, metadata: any): string {
    const messages = {
      api_limit: `You've used ${metadata.currentUsage} of ${metadata.limit} API calls this month. Upgrade to ${metadata.suggestedPlan} for unlimited API access and advanced features.`,
      prediction_limit: `You've used ${metadata.currentUsage} of ${metadata.limit} predictions this month. Upgrade to ${metadata.suggestedPlan} for unlimited predictions and enhanced accuracy.`,
      high_engagement: `Great job! You've made ${metadata.apiCalls} API calls recently. Upgrade to ${metadata.suggestedPlan} to unlock more features and higher limits.`,
      enterprise_features: `We noticed you're using features that are enhanced in our Enterprise plan. Upgrade to unlock unlimited team collaboration, advanced data exports, and more.`,
      consistency: `You've been consistently active for ${metadata.activeDays} days! Upgrade to ${metadata.suggestedPlan} to maximize your productivity with enhanced features.`,
      professional_use: `We see you're actively using our platform on weekends. Upgrade to ${metadata.suggestedPlan} for professional-grade tools and support.`,
      multiple_symbols: `You're tracking ${metadata.symbolCount} different symbols! Upgrade to ${metadata.suggestedPlan} for enhanced multi-symbol analysis and insights.`,
      advanced_features: `You've used advanced features ${metadata.advancedUses} times! Upgrade to ${metadata.suggestedPlan} for access to our most powerful tools and institutional-grade data.`
    }

    return messages[triggerType as keyof typeof messages] || 
           "Upgrade your plan to unlock more features and higher limits."
  }

  async getUpsellOpportunities(): Promise<Array<{
    userId: string
    userEmail: string
    currentPlan: string
    suggestedPlan: string
    triggerReason: string
    priority: number
    estimatedRevenue: number
  }>> {
    try {
      const opportunities = await prisma.notification.findMany({
        where: {
          type: "BILLING",
          title: "Upgrade Your Plan",
          isRead: false,
          createdAt: {
            gte: subDays(new Date(), 30) // Last 30 days
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              subscription: {
                select: {
                  plan: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })

      return opportunities.map(notification => ({
        userId: notification.user.id,
        userEmail: notification.user.email,
        currentPlan: notification.user.subscription?.plan || "FREE",
        suggestedPlan: notification.metadata?.suggestedPlan || "PROFESSIONAL",
        triggerReason: notification.metadata?.triggerType || "Unknown",
        priority: this.getTriggerPriority(notification.metadata?.triggerType),
        estimatedRevenue: this.calculateEstimatedRevenue(
          notification.user.subscription?.plan || "FREE",
          notification.metadata?.suggestedPlan || "PROFESSIONAL"
        )
      }))
    } catch (error) {
      console.error("Error getting upsell opportunities:", error)
      return []
    }
  }

  private getTriggerPriority(triggerType: string): number {
    const trigger = this.triggers.find(t => t.id === triggerType)
    return trigger?.priority || 99
  }

  private calculateEstimatedRevenue(currentPlan: string, suggestedPlan: string): number {
    const planPrices = {
      FREE: 0,
      BASIC: 29,
      PROFESSIONAL: 99,
      ENTERPRISE: 499
    }

    const currentPrice = planPrices[currentPlan as keyof typeof planPrices] || 0
    const suggestedPrice = planPrices[suggestedPlan as keyof typeof planPrices] || 0
    
    return Math.max(0, suggestedPrice - currentPrice)
  }

  async enableTrigger(triggerId: string): Promise<void> {
    const trigger = this.triggers.find(t => t.id === triggerId)
    if (trigger) {
      trigger.enabled = true
    }
  }

  async disableTrigger(triggerId: string): Promise<void> {
    const trigger = this.triggers.find(t => t.id === triggerId)
    if (trigger) {
      trigger.enabled = false
    }
  }

  getTriggerStatus(): Array<{
    id: string
    name: string
    enabled: boolean
    priority: number
    description: string
  }> {
    return this.triggers.map(trigger => ({
      id: trigger.id,
      name: trigger.name,
      enabled: trigger.enabled,
      priority: trigger.priority,
      description: trigger.description
    }))
  }
}

// Export singleton instance
export const upsellEngine = new UpsellEngine()