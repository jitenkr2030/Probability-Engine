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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30" // Default to 30 days
    const type = searchParams.get("type") || "overview" // overview, api, predictions, teams

    const days = parseInt(period)
    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())

    switch (type) {
      case "overview":
        return await getOverviewAnalytics(session.user.id, startDate, endDate)
      case "api":
        return await getApiAnalytics(session.user.id, startDate, endDate)
      case "predictions":
        return await getPredictionAnalytics(session.user.id, startDate, endDate)
      case "teams":
        return await getTeamAnalytics(session.user.id, startDate, endDate)
      default:
        return await getOverviewAnalytics(session.user.id, startDate, endDate)
    }
  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function getOverviewAnalytics(userId: string, startDate: Date, endDate: Date) {
  // Get usage data
  const usageData = await prisma.usage.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Get API keys usage
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    include: {
      _count: {
        select: { usage: true }
      }
    }
  })

  // Get teams data
  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "ACTIVE" } } }
      ]
    },
    include: {
      members: {
        where: { status: "ACTIVE" }
      }
    }
  })

  // Calculate metrics
  const totalApiCalls = usageData.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0)
  const totalPredictions = usageData.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0)
  const totalDataExports = usageData.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0)

  // Daily usage for charts
  const dailyUsage = []
  for (let i = 0; i < 30; i++) {
    const date = startOfDay(subDays(endDate, i))
    const dayUsage = usageData.filter(u => 
      u.date >= date && u.date < endOfDay(date)
    )
    
    dailyUsage.unshift({
      date: format(date, "yyyy-MM-dd"),
      apiCalls: dayUsage.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0),
      predictions: dayUsage.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0),
      dataExports: dayUsage.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0),
    })
  }

  // Usage by type
  const usageByType = {
    apiCalls: totalApiCalls,
    predictions: totalPredictions,
    dataExports: totalDataExports,
    teamInvites: usageData.filter(u => u.type === "TEAM_INVITE").reduce((sum, u) => sum + u.amount, 0),
    notifications: usageData.filter(u => u.type === "NOTIFICATION").reduce((sum, u) => sum + u.amount, 0),
  }

  // Top API keys by usage
  const topApiKeys = apiKeys
    .sort((a, b) => b._count.usage - a._count.usage)
    .slice(0, 5)
    .map(key => ({
      id: key.id,
      name: key.name,
      usage: key._count.usage,
      lastUsed: key.lastUsedAt,
    }))

  // Team activity
  const teamActivity = teams.map(team => ({
    id: team.id,
    name: team.name,
    memberCount: team.members.length,
    isOwner: team.ownerId === userId,
  }))

  return NextResponse.json({
    overview: {
      totalApiCalls,
      totalPredictions,
      totalDataExports,
      activeApiKeys: apiKeys.filter(key => key.isActive).length,
      totalTeams: teams.length,
    },
    dailyUsage,
    usageByType,
    topApiKeys,
    teamActivity,
  })
}

async function getApiAnalytics(userId: string, startDate: Date, endDate: Date) {
  const apiUsage = await prisma.usage.findMany({
    where: {
      userId,
      type: "API_CALL",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Group by hour for detailed analysis
  const hourlyUsage = []
  for (let i = 0; i < 24; i++) {
    const hourUsage = apiUsage.filter(u => 
      new Date(u.date).getHours() === i
    )
    hourlyUsage.push({
      hour: i,
      calls: hourUsage.reduce((sum, u) => sum + u.amount, 0),
    })
  }

  // Group by day
  const dailyUsage = []
  for (let i = 0; i < 30; i++) {
    const date = startOfDay(subDays(endDate, i))
    const dayUsage = apiUsage.filter(u => 
      u.date >= date && u.date < endOfDay(date)
    )
    dailyUsage.unshift({
      date: format(date, "yyyy-MM-dd"),
      calls: dayUsage.reduce((sum, u) => sum + u.amount, 0),
    })
  }

  // API key usage distribution
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    include: {
      usage: {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    },
  })

  const apiKeyUsage = apiKeys.map(key => ({
    id: key.id,
    name: key.name,
    usage: key.usage.reduce((sum, u) => sum + u.amount, 0),
    lastUsed: key.lastUsedAt,
  }))

  // Error rates (from audit logs)
  const errorLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      action: {
        contains: "ERROR",
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const errorRate = apiUsage.length > 0 ? (errorLogs.length / apiUsage.length) * 100 : 0

  return NextResponse.json({
    hourlyUsage,
    dailyUsage,
    apiKeyUsage,
    errorRate: errorRate.toFixed(2),
    totalCalls: apiUsage.reduce((sum, u) => sum + u.amount, 0),
    averageCallsPerDay: (apiUsage.reduce((sum, u) => sum + u.amount, 0) / 30).toFixed(2),
  })
}

async function getPredictionAnalytics(userId: string, startDate: Date, endDate: Date) {
  const predictionUsage = await prisma.usage.findMany({
    where: {
      userId,
      type: "PREDICTION",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Daily prediction trends
  const dailyPredictions = []
  for (let i = 0; i < 30; i++) {
    const date = startOfDay(subDays(endDate, i))
    const dayPredictions = predictionUsage.filter(u => 
      u.date >= date && u.date < endOfDay(date)
    )
    dailyPredictions.unshift({
      date: format(date, "yyyy-MM-dd"),
      predictions: dayPredictions.reduce((sum, u) => sum + u.amount, 0),
    })
  }

  // Prediction accuracy (mock data - would come from actual prediction results)
  const accuracyData = [
    { date: format(subDays(endDate, 6), "yyyy-MM-dd"), accuracy: 85.2 },
    { date: format(subDays(endDate, 5), "yyyy-MM-dd"), accuracy: 87.1 },
    { date: format(subDays(endDate, 4), "yyyy-MM-dd"), accuracy: 83.5 },
    { date: format(subDays(endDate, 3), "yyyy-MM-dd"), accuracy: 89.3 },
    { date: format(subDays(endDate, 2), "yyyy-MM-dd"), accuracy: 86.8 },
    { date: format(subDays(endDate, 1), "yyyy-MM-dd"), accuracy: 88.7 },
    { date: format(endDate, "yyyy-MM-dd"), accuracy: 90.1 },
  ]

  // Top predicted symbols (mock data)
  const topSymbols = [
    { symbol: "AAPL", predictions: 156, accuracy: 88.5 },
    { symbol: "TSLA", predictions: 142, accuracy: 85.2 },
    { symbol: "MSFT", predictions: 138, accuracy: 91.3 },
    { symbol: "GOOGL", predictions: 125, accuracy: 87.8 },
    { symbol: "AMZN", predictions: 119, accuracy: 86.1 },
  ]

  return NextResponse.json({
    dailyPredictions,
    accuracyData,
    topSymbols,
    totalPredictions: predictionUsage.reduce((sum, u) => sum + u.amount, 0),
    averageAccuracy: accuracyData.reduce((sum, d) => sum + d.accuracy, 0) / accuracyData.length,
  })
}

async function getTeamAnalytics(userId: string, startDate: Date, endDate: Date) {
  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "ACTIVE" } } }
      ]
    },
    include: {
      members: {
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      },
      _count: {
        select: { members: true }
      }
    }
  })

  // Team activity
  const teamActivity = await Promise.all(
    teams.map(async (team) => {
      const teamUsage = await prisma.usage.findMany({
        where: {
          userId: {
            in: team.members.map(m => m.userId)
          },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      return {
        id: team.id,
        name: team.name,
        memberCount: team.members.length,
        isOwner: team.ownerId === userId,
        totalUsage: teamUsage.reduce((sum, u) => sum + u.amount, 0),
        activeMembers: team.members.filter(m => {
          const lastUsage = teamUsage.filter(u => u.userId === m.userId)
          return lastUsage.length > 0
        }).length,
      }
    })
  )

  // Member contributions
  const memberContributions = teams.flatMap(team => 
    team.members.map(member => ({
      teamId: team.id,
      teamName: team.name,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      role: member.role,
    }))
  )

  // Get usage for each member
  const memberUsage = await Promise.all(
    memberContributions.map(async (member) => {
      const usage = await prisma.usage.findMany({
        where: {
          userId: member.userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      return {
        ...member,
        totalUsage: usage.reduce((sum, u) => sum + u.amount, 0),
        apiCalls: usage.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0),
        predictions: usage.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0),
      }
    })
  )

  return NextResponse.json({
    teamActivity,
    memberContributions: memberUsage,
    totalTeams: teams.length,
    totalMembers: teams.reduce((sum, team) => sum + team.members.length, 0),
    averageTeamSize: (teams.reduce((sum, team) => sum + team.members.length, 0) / teams.length).toFixed(1),
  })
}