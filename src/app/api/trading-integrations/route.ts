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

    if (action === "user_integrations") {
      // Get user's trading integrations
      const integrations = await prisma.tradingIntegration.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" }
      })

      return NextResponse.json({
        integrations: integrations.map(integration => ({
          id: integration.id,
          broker: integration.broker,
          isActive: integration.isActive,
          lastSyncAt: integration.lastSyncAt,
          config: integration.config,
        }))
      })
    }

    if (action === "available_brokers") {
      // Get list of available brokers for integration
      const brokers = [
        {
          id: "td_ameritrade",
          name: "TD Ameritrade",
          description: "Advanced trading platform with extensive API access",
          logo: "/brokers/td-ameritrade.png",
          features: ["Real-time quotes", "Order execution", "Account management", "Historical data"],
          authType: "OAuth",
          website: "https://www.tdameritrade.com",
          documentation: "https://developer.tdameritrade.com",
        },
        {
          id: "interactive_brokers",
          name: "Interactive Brokers",
          description: "Professional trading platform with global market access",
          logo: "/brokers/interactive-brokers.png",
          features: ["Global markets", "Advanced order types", "Portfolio management", "Algorithmic trading"],
          authType: "API Key",
          website: "https://www.interactivebrokers.com",
          documentation: "https://www.interactivebrokers.com/en/software/api/apiguide.htm",
        },
        {
          id: "alpaca",
          name: "Alpaca",
          description: "Commission-free trading API for stocks and ETFs",
          logo: "/brokers/alpaca.png",
          features: ["Commission-free trading", "Real-time data", "Paper trading", "Webhook support"],
          authType: "API Key",
          website: "https://alpaca.markets",
          documentation: "https://docs.alpaca.markets",
        },
        {
          id: "binance",
          name: "Binance",
          description: "Leading cryptocurrency exchange with advanced trading features",
          logo: "/brokers/binance.png",
          features: ["Crypto trading", "Futures", "Margin trading", "Staking"],
          authType: "API Key",
          website: "https://www.binance.com",
          documentation: "https://binance-docs.github.io/apidocs",
        },
        {
          id: "coinbase",
          name: "Coinbase",
          description: "User-friendly cryptocurrency exchange and wallet",
          logo: "/brokers/coinbase.png",
          features: ["Crypto trading", "Wallet integration", "API access", "Pro trading"],
          authType: "OAuth",
          website: "https://www.coinbase.com",
          documentation: "https://docs.cloud.coinbase.com",
        },
        {
          id: "schwab",
          name: "Charles Schwab",
          description: "Full-service brokerage with comprehensive API",
          logo: "/brokers/schwab.png",
          features: ["Stocks and ETFs", "Options trading", "Mutual funds", "Research tools"],
          authType: "OAuth",
          website: "https://www.schwab.com",
          documentation: "https://developer.schwab.com",
        },
      ]

      return NextResponse.json({ brokers })
    }

    if (action === "sync_status") {
      // Get sync status for all integrations
      const integrations = await prisma.tradingIntegration.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          broker: true,
          isActive: true,
          lastSyncAt: true,
        }
      })

      const syncStatus = await Promise.all(
        integrations.map(async (integration) => {
          // Mock sync status - in real implementation, you'd check actual sync status
          const isHealthy = Math.random() > 0.1 // 90% healthy
          const lastSync = integration.lastSyncAt || new Date(0)
          const timeSinceSync = Date.now() - lastSync.getTime()
          const isStale = timeSinceSync > 5 * 60 * 1000 // 5 minutes

          return {
            id: integration.id,
            broker: integration.broker,
            status: integration.isActive ? (isHealthy ? "healthy" : "error") : "disabled",
            lastSyncAt: integration.lastSyncAt,
            isStale,
            message: isStale ? "Sync overdue" : (isHealthy ? "Connected" : "Connection error"),
          }
        })
      )

      return NextResponse.json({ syncStatus })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Trading integrations API error:", error)
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

    const { action, broker, apiKey, apiSecret, config } = await request.json()

    if (action === "connect_broker") {
      // Connect to a new broker
      if (!broker || !apiKey) {
        return NextResponse.json({ error: "Broker and API key are required" }, { status: 400 })
      }

      // Validate broker
      const brokers = ["td_ameritrade", "interactive_brokers", "alpaca", "binance", "coinbase", "schwab"]
      if (!brokers.includes(broker)) {
        return NextResponse.json({ error: "Invalid broker" }, { status: 400 })
      }

      // Test connection (mock implementation)
      const isConnected = await testBrokerConnection(broker, apiKey, apiSecret)

      if (!isConnected) {
        return NextResponse.json({ error: "Failed to connect to broker. Please check your credentials." }, { status: 400 })
      }

      // Create integration record
      const integration = await prisma.tradingIntegration.create({
        data: {
          userId: session.user.id,
          broker,
          apiKey,
          apiSecret,
          config: config || {},
          isActive: true,
          lastSyncAt: new Date(),
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TRADING_INTEGRATION_CONNECTED",
          resource: "TradingIntegration",
          metadata: {
            integrationId: integration.id,
            broker,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        integration: {
          id: integration.id,
          broker: integration.broker,
          isActive: integration.isActive,
          lastSyncAt: integration.lastSyncAt,
        },
        message: "Successfully connected to broker"
      })
    }

    if (action === "sync_portfolio") {
      // Sync portfolio data from broker
      const { integrationId } = await request.json()

      if (!integrationId) {
        return NextResponse.json({ error: "Integration ID is required" }, { status: 400 })
      }

      const integration = await prisma.tradingIntegration.findFirst({
        where: {
          id: integrationId,
          userId: session.user.id,
          isActive: true
        }
      })

      if (!integration) {
        return NextResponse.json({ error: "Integration not found or inactive" }, { status: 404 })
      }

      // Mock portfolio sync - in real implementation, you'd fetch actual portfolio data
      const portfolioData = await fetchPortfolioData(integration.broker, integration.apiKey, integration.apiSecret)

      // Update last sync time
      await prisma.tradingIntegration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PORTFOLIO_SYNCED",
          resource: "TradingIntegration",
          metadata: {
            integrationId,
            broker: integration.broker,
            portfolioValue: portfolioData.totalValue,
            positionsCount: portfolioData.positions.length,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        portfolio: portfolioData,
        message: "Portfolio synced successfully"
      })
    }

    if (action === "execute_trade") {
      // Execute a trade through connected broker
      const { integrationId, symbol, quantity, orderType, side, price } = await request.json()

      if (!integrationId || !symbol || !quantity || !orderType || !side) {
        return NextResponse.json({ error: "Missing required trade parameters" }, { status: 400 })
      }

      const integration = await prisma.tradingIntegration.findFirst({
        where: {
          id: integrationId,
          userId: session.user.id,
          isActive: true
        }
      })

      if (!integration) {
        return NextResponse.json({ error: "Integration not found or inactive" }, { status: 404 })
      }

      // Mock trade execution - in real implementation, you'd execute actual trade
      const tradeResult = await executeTrade(
        integration.broker,
        integration.apiKey,
        integration.apiSecret,
        { symbol, quantity, orderType, side, price }
      )

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TRADE_EXECUTED",
          resource: "TradingIntegration",
          metadata: {
            integrationId,
            broker: integration.broker,
            symbol,
            quantity,
            orderType,
            side,
            price,
            tradeId: tradeResult.tradeId,
            status: tradeResult.status,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        success: true,
        trade: tradeResult,
        message: "Trade executed successfully"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Trading integrations API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 })
    }

    // Verify ownership
    const integration = await prisma.tradingIntegration.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const updatedIntegration = await prisma.tradingIntegration.update({
      where: { id },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TRADING_INTEGRATION_UPDATED",
        resource: "TradingIntegration",
        metadata: {
          integrationId: id,
          updates: updateData,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({
      success: true,
      integration: updatedIntegration,
      message: "Integration updated successfully"
    })
  } catch (error) {
    console.error("Trading integrations API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, action } = await request.json()

    if (!id || !action) {
      return NextResponse.json({ error: "Integration ID and action are required" }, { status: 400 })
    }

    // Verify ownership
    const integration = await prisma.tradingIntegration.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    let updateData = {}

    switch (action) {
      case "enable":
        updateData = { isActive: true }
        break
      case "disable":
        updateData = { isActive: false }
        break
      case "sync":
        updateData = { lastSyncAt: new Date() }
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const updatedIntegration = await prisma.tradingIntegration.update({
      where: { id },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `TRADING_INTEGRATION_${action.toUpperCase()}`,
        resource: "TradingIntegration",
        metadata: {
          integrationId: id,
          broker: integration.broker,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({
      success: true,
      integration: updatedIntegration,
      message: `Integration ${action}d successfully`
    })
  } catch (error) {
    console.error("Trading integrations API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get("id")

    if (!integrationId) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 })
    }

    // Verify ownership
    const integration = await prisma.tradingIntegration.findFirst({
      where: {
        id: integrationId,
        userId: session.user.id
      }
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    await prisma.tradingIntegration.delete({
      where: { id: integrationId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TRADING_INTEGRATION_DELETED",
        resource: "TradingIntegration",
        metadata: {
          integrationId,
          broker: integration.broker,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Integration deleted successfully"
    })
  } catch (error) {
    console.error("Trading integrations API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper functions (mock implementations)
async function testBrokerConnection(broker: string, apiKey: string, apiSecret: string): Promise<boolean> {
  // Mock connection test - in real implementation, you'd test actual API connection
  return Math.random() > 0.1 // 90% success rate
}

async function fetchPortfolioData(broker: string, apiKey: string, apiSecret: string) {
  // Mock portfolio data - in real implementation, you'd fetch actual portfolio
  return {
    totalValue: Math.random() * 100000 + 10000,
    cashBalance: Math.random() * 50000,
    positions: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
      symbol: ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN"][i % 5],
      quantity: Math.floor(Math.random() * 100) + 1,
      averagePrice: Math.random() * 500 + 50,
      currentPrice: Math.random() * 500 + 50,
      value: Math.random() * 10000 + 1000,
    })),
    lastUpdated: new Date().toISOString(),
  }
}

async function executeTrade(broker: string, apiKey: string, apiSecret: string, tradeData: any) {
  // Mock trade execution - in real implementation, you'd execute actual trade
  return {
    tradeId: `trade_${Date.now()}`,
    status: "filled",
    symbol: tradeData.symbol,
    quantity: tradeData.quantity,
    orderType: tradeData.orderType,
    side: tradeData.side,
    price: tradeData.price || Math.random() * 500 + 50,
    executedAt: new Date().toISOString(),
  }
}