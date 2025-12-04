import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { subDays, startOfDay, endOfDay, format } from "date-fns"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin privileges
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30" // Default to 30 days
    const view = searchParams.get("view") || "overview"

    const days = parseInt(period)
    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())

    switch (view) {
      case "overview":
        return await getOverviewMonetization(startDate, endDate)
      case "subscriptions":
        return await getSubscriptionMonetization(startDate, endDate)
      case "api":
        return await getApiMonetization(startDate, endDate)
      case "partnerships":
        return await getPartnershipMonetization(startDate, endDate)
      case "data":
        return await getDataMonetization(startDate, endDate)
      case "forecast":
        return await getForecastData(startDate, endDate)
      default:
        return await getOverviewMonetization(startDate, endDate)
    }
  } catch (error) {
    console.error("Monetization API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function getOverviewMonetization(startDate: Date, endDate: Date) {
  // Get all revenue data
  const [subscriptions, apiUsage, partnerships, dataSales, tradingRevenue] = await Promise.all([
    getSubscriptionRevenue(startDate, endDate),
    getApiRevenue(startDate, endDate),
    getPartnershipRevenue(startDate, endDate),
    getDataRevenue(startDate, endDate),
    getTradingRevenue(startDate, endDate)
  ])

  const totalRevenue = subscriptions.total + apiUsage.total + partnerships.total + dataSales.total + tradingRevenue.total
  
  // Calculate key metrics
  const totalUsers = await prisma.user.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const activeSubscriptions = await prisma.subscription.count({
    where: {
      status: "ACTIVE",
      plan: {
        not: "FREE"
      }
    }
  })

  const monthlyRecurringRevenue = subscriptions.total
  const averageRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0
  const customerLifetimeValue = averageRevenuePerUser * 24 // Assume 24 month average lifetime
  const churnRate = 0.05 // 5% monthly churn (mock data)
  const conversionRate = 0.15 // 15% free to paid conversion (mock data)

  // Revenue trends for charts
  const revenueTrends = await generateRevenueTrends(startDate, endDate)

  // Customer acquisition data (mock)
  const customerAcquisition = [
    { channel: "Organic Search", cost: 2500, customers: 125, cac: 20, ltv: 1200, roi: 60 },
    { channel: "Paid Ads", cost: 5000, customers: 100, cac: 50, ltv: 1200, roi: 24 },
    { channel: "Social Media", cost: 1500, customers: 75, cac: 20, ltv: 1000, roi: 50 },
    { channel: "Referrals", cost: 500, customers: 50, cac: 10, ltv: 1500, roi: 150 },
    { channel: "Partnerships", cost: 3000, customers: 60, cac: 50, ltv: 2000, roi: 40 },
  ]

  // Top customers (mock)
  const topCustomers = [
    { id: "1", name: "Acme Corp", plan: "ENTERPRISE", revenue: 5988, growth: 0.12, ltv: 143712 },
    { id: "2", name: "Tech Solutions", plan: "PROFESSIONAL", revenue: 1188, growth: 0.08, ltv: 28512 },
    { id: "3", name: "Global Investments", plan: "ENTERPRISE", revenue: 5988, growth: 0.15, ltv: 143712 },
    { id: "4", name: "StartupXYZ", plan: "BASIC", revenue: 348, growth: 0.25, ltv: 8352 },
    { id: "5", name: "MegaCorp", plan: "ENTERPRISE", revenue: 5988, growth: 0.05, ltv: 143712 },
  ]

  return NextResponse.json({
    overview: {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      customerLifetimeValue,
      churnRate,
      conversionRate,
    },
    subscriptionRevenue: subscriptions.breakdown,
    apiRevenue: apiUsage.breakdown,
    partnershipRevenue: partnerships.breakdown,
    dataMonetization: dataSales.breakdown,
    tradingRevenue: tradingRevenue.breakdown,
    revenueTrends,
    customerAcquisition,
    topCustomers,
  })
}

async function getSubscriptionRevenue(startDate: Date, endDate: Date) {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const breakdown = {
    basic: { users: 0, revenue: 0, growth: 0.08 },
    professional: { users: 0, revenue: 0, growth: 0.12 },
    enterprise: { users: 0, revenue: 0, growth: 0.15 },
    free: { users: 0, conversions: 0 },
  }

  subscriptions.forEach(sub => {
    switch (sub.plan) {
      case "BASIC":
        breakdown.basic.users++
        breakdown.basic.revenue += sub.amount / 100 // Convert from cents
        break
      case "PROFESSIONAL":
        breakdown.professional.users++
        breakdown.professional.revenue += sub.amount / 100
        break
      case "ENTERPRISE":
        breakdown.enterprise.users++
        breakdown.enterprise.revenue += sub.amount / 100
        break
    }
  })

  // Get free users and conversions
  const freeUsers = await prisma.user.count({
    where: {
      subscription: {
        plan: "FREE"
      }
    }
  })

  const conversions = await prisma.subscription.count({
    where: {
      plan: {
        not: "FREE"
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  breakdown.free.users = freeUsers
  breakdown.free.conversions = conversions

  const total = breakdown.basic.revenue + breakdown.professional.revenue + breakdown.enterprise.revenue

  return { total, breakdown }
}

async function getApiRevenue(startDate: Date, endDate: Date) {
  const apiUsage = await prisma.usage.findMany({
    where: {
      type: "API_CALL",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const breakdown = {
    basicPredictions: { calls: 0, revenue: 0 },
    advancedPredictions: { calls: 0, revenue: 0 },
    institutionalPredictions: { calls: 0, revenue: 0 },
    bulkDiscounts: { amount: 0, count: 0 },
  }

  // Mock API pricing data
  const pricing = {
    basic: 0.01,
    advanced: 0.05,
    institutional: 0.10,
  }

  // Simulate different prediction types based on metadata
  apiUsage.forEach(usage => {
    const predictionType = usage.metadata?.predictionType || "basic"
    const calls = usage.amount

    switch (predictionType) {
      case "basic":
        breakdown.basicPredictions.calls += calls
        breakdown.basicPredictions.revenue += calls * pricing.basic
        break
      case "advanced":
        breakdown.advancedPredictions.calls += calls
        breakdown.advancedPredictions.revenue += calls * pricing.advanced
        break
      case "institutional":
        breakdown.institutionalPredictions.calls += calls
        breakdown.institutionalPredictions.revenue += calls * pricing.institutional
        break
    }

    // Check for bulk discounts
    if (calls >= 10000) {
      breakdown.bulkDiscounts.count++
      breakdown.bulkDiscounts.amount += (calls * pricing.basic) * 0.20 // 20% discount
    }
  })

  const total = breakdown.basicPredictions.revenue + breakdown.advancedPredictions.revenue + 
                breakdown.institutionalPredictions.revenue - breakdown.bulkDiscounts.amount

  return { total, breakdown }
}

async function getPartnershipRevenue(startDate: Date, endDate: Date) {
  const partnerships = await prisma.partnership.findMany({
    where: {
      status: "ACTIVE",
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const breakdown = {
    brokerage: { partners: 0, revenue: 0, growth: 0.10 },
    media: { partners: 0, revenue: 0, growth: 0.08 },
    dataProvider: { partners: 0, revenue: 0, growth: 0.12 },
    tradingPlatform: { partners: 0, revenue: 0, growth: 0.15 },
  }

  partnerships.forEach(partnership => {
    const revenue = partnership.revenueShare * 10000 // Mock revenue calculation

    switch (partnership.type) {
      case "BROKERAGE":
        breakdown.brokerage.partners++
        breakdown.brokerage.revenue += revenue
        break
      case "MEDIA":
        breakdown.media.partners++
        breakdown.media.revenue += revenue
        break
      case "DATA_PROVIDER":
        breakdown.dataProvider.partners++
        breakdown.dataProvider.revenue += revenue
        break
      case "TRADING_PLATFORM":
        breakdown.tradingPlatform.partners++
        breakdown.tradingPlatform.revenue += revenue
        break
    }
  })

  const total = breakdown.brokerage.revenue + breakdown.media.revenue + 
                breakdown.dataProvider.revenue + breakdown.tradingPlatform.revenue

  return { total, breakdown }
}

async function getDataRevenue(startDate: Date, endDate: Date) {
  const dataPurchases = await prisma.usage.findMany({
    where: {
      type: "DATA_PURCHASE",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const breakdown = {
    marketData: { sales: 0, revenue: 0 },
    predictions: { sales: 0, revenue: 0 },
    analytics: { sales: 0, revenue: 0 },
    historical: { sales: 0, revenue: 0 },
  }

  dataPurchases.forEach(purchase => {
    const category = purchase.metadata?.category || "marketData"
    const revenue = purchase.metadata?.price || 0

    switch (category) {
      case "market_data":
        breakdown.marketData.sales++
        breakdown.marketData.revenue += revenue
        break
      case "predictions":
        breakdown.predictions.sales++
        breakdown.predictions.revenue += revenue
        break
      case "analytics":
        breakdown.analytics.sales++
        breakdown.analytics.revenue += revenue
        break
      case "historical":
        breakdown.historical.sales++
        breakdown.historical.revenue += revenue
        break
    }
  })

  const total = breakdown.marketData.revenue + breakdown.predictions.revenue + 
                breakdown.analytics.revenue + breakdown.historical.revenue

  return { total, breakdown }
}

async function getTradingRevenue(startDate: Date, endDate: Date) {
  const tradingIntegrations = await prisma.tradingIntegration.findMany({
    where: {
      isActive: true,
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const breakdown = {
    perTradeFees: { trades: 0, revenue: 0 },
    successBonuses: { amount: 0, count: 0 },
    integrationFees: { revenue: 0, activeIntegrations: 0 },
  }

  // Mock trading revenue data
  breakdown.perTradeFees.trades = 50000 // Mock trade count
  breakdown.perTradeFees.revenue = breakdown.perTradeFees.trades * 0.001 // $0.001 per trade

  breakdown.successBonuses.count = 1500 // Mock successful trades
  breakdown.successBonuses.amount = breakdown.successBonuses.count * 50 // $50 average bonus

  breakdown.integrationFees.activeIntegrations = tradingIntegrations.length
  breakdown.integrationFees.revenue = breakdown.integrationFees.activeIntegrations * 100 // $100 per integration

  const total = breakdown.perTradeFees.revenue + breakdown.successBonuses.amount + breakdown.integrationFees.revenue

  return { total, breakdown }
}

async function generateRevenueTrends(startDate: Date, endDate: Date) {
  const trends = []
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // Mock daily revenue data with some randomness
    const baseRevenue = 5000
    const dayOfWeek = date.getDay()
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 to 1.2
    
    const dailyTotal = baseRevenue * weekendMultiplier * randomFactor
    
    trends.push({
      date: format(date, "yyyy-MM-dd"),
      subscription: dailyTotal * 0.6,
      api: dailyTotal * 0.2,
      partnerships: dailyTotal * 0.1,
      data: dailyTotal * 0.05,
      trading: dailyTotal * 0.05,
      total: dailyTotal,
    })
  }

  return trends
}

async function getForecastData(startDate: Date, endDate: Date) {
  // Get current revenue trends
  const currentRevenue = await getOverviewMonetization(startDate, endDate)
  
  // Simple growth forecasting
  const monthlyGrowthRate = 0.08 // 8% monthly growth
  const quarterlyGrowthRate = Math.pow(1 + monthlyGrowthRate, 3) - 1
  const yearlyGrowthRate = Math.pow(1 + monthlyGrowthRate, 12) - 1

  const currentMonthlyRevenue = currentRevenue.overview?.monthlyRecurringRevenue || 0
  
  const forecast = {
    nextMonth: currentMonthlyRevenue * (1 + monthlyGrowthRate),
    nextQuarter: currentMonthlyRevenue * 3 * (1 + quarterlyGrowthRate),
    nextYear: currentMonthlyRevenue * 12 * (1 + yearlyGrowthRate),
    confidence: 0.85, // 85% confidence
    drivers: [
      "Increasing subscription adoption",
      "API usage growth",
      "New partnership acquisitions",
      "Data marketplace expansion",
      "Trading integration adoption",
      "Enterprise customer acquisition",
    ]
  }

  return NextResponse.json(forecast)
}