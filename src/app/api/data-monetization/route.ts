import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "marketplace_listings") {
      // Get available data marketplace listings
      const listings = [
        {
          id: "market_data_1",
          title: "Real-time Stock Market Data",
          description: "Comprehensive real-time data for major stock exchanges",
          category: "market_data",
          price: 0.01, // per API call
          format: "JSON",
          updateFrequency: "real-time",
          dataSources: ["NYSE", "NASDAQ", "S&P 500"],
          sampleSize: "1000+ symbols",
          provider: "Probability Engine",
          rating: 4.8,
          reviews: 1247,
        },
        {
          id: "predictions_1",
          title: "AI Stock Predictions",
          description: "Machine learning-powered stock price predictions with 95% accuracy",
          category: "predictions",
          price: 0.05, // per prediction
          format: "JSON",
          updateFrequency: "5-minute intervals",
          dataSources: ["Historical data", "Technical indicators", "Sentiment analysis"],
          sampleSize: "500+ symbols",
          provider: "Probability Engine",
          rating: 4.9,
          reviews: 892,
        },
        {
          id: "analytics_1",
          title: "Market Analytics Dashboard",
          description: "Comprehensive analytics and insights for market trends",
          category: "analytics",
          price: 0.02, // per API call
          format: "JSON/CSV",
          updateFrequency: "daily",
          dataSources: ["Market data", "Economic indicators", "News sentiment"],
          sampleSize: "Market-wide",
          provider: "Probability Engine",
          rating: 4.7,
          reviews: 567,
        },
        {
          id: "historical_1",
          title: "Historical Market Data",
          description: "20+ years of historical market data for backtesting",
          category: "historical",
          price: 0.001, // per data point
          format: "CSV/JSON",
          updateFrequency: "static",
          dataSources: ["NYSE", "NASDAQ", "Global markets"],
          sampleSize: "20+ years",
          provider: "Probability Engine",
          rating: 4.6,
          reviews: 234,
        },
      ]

      return NextResponse.json({
        listings,
        categories: ["market_data", "predictions", "analytics", "historical"],
      })
    }

    if (action === "user_purchases") {
      // Get user's data purchases
      const purchases = await prisma.usage.findMany({
        where: {
          userId: session.user.id,
          type: "DATA_PURCHASE",
        },
        orderBy: { date: "desc" },
        take: 50,
      })

      return NextResponse.json({
        purchases: purchases.map(p => ({
          id: p.id,
          dataset: p.metadata?.dataset || "Unknown",
          category: p.metadata?.category || "Unknown",
          price: p.metadata?.price || 0,
          purchaseDate: p.date,
          downloadUrl: p.metadata?.downloadUrl,
          expiryDate: p.metadata?.expiryDate,
        }))
      })
    }

    if (action === "revenue_summary") {
      // Get revenue summary for data monetization (admin only)
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const purchases = await prisma.usage.findMany({
        where: {
          type: "DATA_PURCHASE",
          date: {
            gte: thirtyDaysAgo
          }
        }
      })

      const summary = {
        totalRevenue: purchases.reduce((sum, p) => sum + (p.metadata?.price || 0), 0),
        totalPurchases: purchases.length,
        averagePurchaseValue: purchases.length > 0 ? purchases.reduce((sum, p) => sum + (p.metadata?.price || 0), 0) / purchases.length : 0,
        topCategories: {} as Record<string, number>,
        dailyRevenue: [] as any[],
      }

      // Calculate top categories
      purchases.forEach(p => {
        const category = p.metadata?.category || "unknown"
        summary.topCategories[category] = (summary.topCategories[category] || 0) + (p.metadata?.price || 0)
      })

      // Generate daily revenue breakdown
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const dayPurchases = purchases.filter(p => 
          p.date >= dayStart && p.date <= dayEnd
        )

        summary.dailyRevenue.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: dayPurchases.reduce((sum, p) => sum + (p.metadata?.price || 0), 0),
          purchases: dayPurchases.length,
        })
      }

      return NextResponse.json(summary)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Data monetization API error:", error)
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

    const { action, datasetId, quantity = 1 } = await request.json()

    if (action === "purchase_data") {
      // Handle data purchase
      const datasetInfo = await getDatasetInfo(datasetId)
      
      if (!datasetInfo) {
        return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
      }

      const totalCost = datasetInfo.price * quantity

      // Check if user can afford this purchase
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { subscription: true }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // For enterprise users, they might have unlimited access
      if (user.subscription?.plan !== "ENTERPRISE") {
        // Check if user has sufficient balance or subscription limits
        // This is a simplified check - in real implementation, you'd integrate with billing system
        const subscription = user.subscription
        if (subscription && subscription.predictionsLimit !== -1) {
          const remainingBalance = subscription.predictionsLimit - subscription.predictionsUsed
          if (remainingBalance < quantity) {
            return NextResponse.json({ 
              error: "Insufficient balance",
              required: totalCost,
              available: remainingBalance * datasetInfo.price
            }, { status: 400 })
          }
        }
      }

      // Generate download URL (mock implementation)
      const downloadUrl = `/api/data-monetization/download/${datasetId}/${session.user.id}/${Date.now()}`
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7) // 7 days expiry

      // Record the purchase
      await prisma.usage.create({
        data: {
          userId: session.user.id,
          type: "DATA_PURCHASE",
          amount: quantity,
          metadata: {
            datasetId,
            dataset: datasetInfo.title,
            category: datasetInfo.category,
            price: datasetInfo.price,
            totalCost,
            downloadUrl,
            expiryDate: expiryDate.toISOString(),
            purchaseDate: new Date().toISOString(),
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
          action: "DATA_PURCHASED",
          resource: "DataMonetization",
          metadata: {
            datasetId,
            dataset: datasetInfo.title,
            quantity,
            totalCost,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        dataset: datasetInfo,
        quantity,
        totalCost,
        downloadUrl,
        expiryDate: expiryDate.toISOString(),
        message: "Data purchased successfully"
      })
    }

    if (action === "create_listing") {
      // Create new data marketplace listing (admin only)
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }

      const { title, description, category, price, format, updateFrequency, dataSources, sampleSize } = await request.json()

      if (!title || !description || !category || !price) {
        return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
      }

      // In a real implementation, this would create a database record for the listing
      const listing = {
        id: `listing_${Date.now()}`,
        title,
        description,
        category,
        price,
        format,
        updateFrequency,
        dataSources,
        sampleSize,
        provider: "Probability Engine",
        createdAt: new Date().toISOString(),
        status: "active"
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DATA_LISTING_CREATED",
          resource: "DataMonetization",
          metadata: {
            listingId: listing.id,
            title,
            category,
            price,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        listing,
        message: "Data listing created successfully"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Data monetization API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get dataset info
async function getDatasetInfo(datasetId: string) {
  const datasets = {
    "market_data_1": {
      id: "market_data_1",
      title: "Real-time Stock Market Data",
      description: "Comprehensive real-time data for major stock exchanges",
      category: "market_data",
      price: 0.01,
      format: "JSON",
      updateFrequency: "real-time",
      dataSources: ["NYSE", "NASDAQ", "S&P 500"],
      sampleSize: "1000+ symbols",
    },
    "predictions_1": {
      id: "predictions_1",
      title: "AI Stock Predictions",
      description: "Machine learning-powered stock price predictions with 95% accuracy",
      category: "predictions",
      price: 0.05,
      format: "JSON",
      updateFrequency: "5-minute intervals",
      dataSources: ["Historical data", "Technical indicators", "Sentiment analysis"],
      sampleSize: "500+ symbols",
    },
    "analytics_1": {
      id: "analytics_1",
      title: "Market Analytics Dashboard",
      description: "Comprehensive analytics and insights for market trends",
      category: "analytics",
      price: 0.02,
      format: "JSON/CSV",
      updateFrequency: "daily",
      dataSources: ["Market data", "Economic indicators", "News sentiment"],
      sampleSize: "Market-wide",
    },
    "historical_1": {
      id: "historical_1",
      title: "Historical Market Data",
      description: "20+ years of historical market data for backtesting",
      category: "historical",
      price: 0.001,
      format: "CSV/JSON",
      updateFrequency: "static",
      dataSources: ["NYSE", "NASDAQ", "Global markets"],
      sampleSize: "20+ years",
    },
  }

  return datasets[datasetId as keyof typeof datasets] || null
}