import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { subDays, startOfDay, endOfDay } from "date-fns"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view audit logs
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const userId = searchParams.get("userId")
    const action = searchParams.get("action")
    const resource = searchParams.get("resource")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (action) {
      where.action = {
        contains: action,
        mode: "insensitive"
      }
    }
    
    if (resource) {
      where.resource = resource
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Get audit logs with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where })
    ])

    // Get unique actions and resources for filters
    const [uniqueActions, uniqueResources] = await Promise.all([
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" }
      }),
      prisma.auditLog.findMany({
        select: { resource: true },
        distinct: ["resource"],
        orderBy: { resource: "asc" }
      })
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        actions: uniqueActions.map(item => item.action),
        resources: uniqueResources.map(item => item.resource).filter(Boolean),
      }
    })
  } catch (error) {
    console.error("Audit logs API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Security monitoring endpoint
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view security reports
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { type } = await request.json()

    switch (type) {
      case "security_summary":
        return await getSecuritySummary()
      case "suspicious_activities":
        return await getSuspiciousActivities()
      case "failed_login_attempts":
        return await getFailedLoginAttempts()
      case "api_abuse":
        return await getApiAbuse()
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Security monitoring API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function getSecuritySummary() {
  const last30Days = subDays(new Date(), 30)
  
  const [
    totalLogs,
    uniqueUsers,
    failedLogins,
    securityEvents,
    apiAbuseEvents,
    suspiciousIPs
  ] = await Promise.all([
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: last30Days
        }
      }
    }),
    
    prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: last30Days
        }
      },
      select: { userId: true },
      distinct: ["userId"]
    }),
    
    prisma.auditLog.count({
      where: {
        action: "LOGIN_FAILED",
        createdAt: {
          gte: last30Days
        }
      }
    }),
    
    prisma.auditLog.count({
      where: {
        action: {
          in: ["SECURITY_ALERT", "UNAUTHORIZED_ACCESS", "SUSPICIOUS_ACTIVITY"]
        },
        createdAt: {
          gte: last30Days
        }
      }
    }),
    
    prisma.auditLog.count({
      where: {
        action: "RATE_LIMIT_EXCEEDED",
        createdAt: {
          gte: last30Days
        }
      }
    }),
    
    prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: last30Days
        }
      },
      select: { ipAddress: true },
      distinct: ["ipAddress"],
      having: {
        ipAddress: {
          _count: {
            gt: 100 // More than 100 requests from same IP
          }
        }
      }
    })
  ])

  // Daily security events for the last 30 days
  const dailyEvents = []
  for (let i = 29; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i))
    const dayEnd = endOfDay(date)
    
    const [dayLogs, dayFailedLogins, daySecurityEvents] = await Promise.all([
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: date,
            lte: dayEnd
          }
        }
      }),
      
      prisma.auditLog.count({
        where: {
          action: "LOGIN_FAILED",
          createdAt: {
            gte: date,
            lte: dayEnd
          }
        }
      }),
      
      prisma.auditLog.count({
        where: {
          action: {
            in: ["SECURITY_ALERT", "UNAUTHORIZED_ACCESS", "SUSPICIOUS_ACTIVITY"]
          },
          createdAt: {
            gte: date,
            lte: dayEnd
          }
        }
      })
    ])
    
    dailyEvents.push({
      date: date.toISOString().split('T')[0],
      totalLogs: dayLogs,
      failedLogins: dayFailedLogins,
      securityEvents: daySecurityEvents
    })
  }

  return NextResponse.json({
    summary: {
      totalLogs,
      uniqueUsers: uniqueUsers.length,
      failedLogins,
      securityEvents,
      apiAbuseEvents,
      suspiciousIPs: suspiciousIPs.length
    },
    dailyEvents
  })
}

async function getSuspiciousActivities() {
  const last7Days = subDays(new Date(), 7)
  
  const suspiciousActivities = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          action: {
            in: ["LOGIN_FAILED", "UNAUTHORIZED_ACCESS", "SUSPICIOUS_ACTIVITY"]
          }
        },
        {
          action: "RATE_LIMIT_EXCEEDED"
        },
        {
          metadata: {
            path: {
              contains: "admin"
            }
          }
        }
      ],
      createdAt: {
        gte: last7Days
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  })

  return NextResponse.json(suspiciousActivities)
}

async function getFailedLoginAttempts() {
  const last24Hours = subDays(new Date(), 1)
  
  const failedAttempts = await prisma.auditLog.findMany({
    where: {
      action: "LOGIN_FAILED",
      createdAt: {
        gte: last24Hours
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  // Group by IP address to detect potential brute force attacks
  const ipGroups = failedAttempts.reduce((acc, log) => {
    const ip = log.ipAddress || "unknown"
    if (!acc[ip]) {
      acc[ip] = []
    }
    acc[ip].push(log)
    return acc
  }, {} as Record<string, typeof failedAttempts>)

  const suspiciousIPs = Object.entries(ipGroups)
    .filter(([_, attempts]) => attempts.length > 5) // More than 5 failed attempts
    .map(([ip, attempts]) => ({
      ip,
      attempts: attempts.length,
      firstAttempt: attempts[0].createdAt,
      lastAttempt: attempts[attempts.length - 1].createdAt,
      userAgents: [...new Set(attempts.map(a => a.userAgent))],
      targetedUsers: [...new Set(attempts.map(a => a.metadata?.email).filter(Boolean))]
    }))

  return NextResponse.json({
    failedAttempts,
    suspiciousIPs
  })
}

async function getApiAbuse() {
  const last24Hours = subDays(new Date(), 1)
  
  const apiAbuseEvents = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          action: "RATE_LIMIT_EXCEEDED"
        },
        {
          action: "API_CALL",
          metadata: {
            responseStatus: {
              gte: 400
            }
          }
        }
      ],
      createdAt: {
        gte: last24Hours
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  // Group by API key to detect abuse
  const apiKeyGroups = apiAbuseEvents.reduce((acc, log) => {
    const apiKey = log.metadata?.apiKey || "unknown"
    if (!acc[apiKey]) {
      acc[apiKey] = []
    }
    acc[apiKey].push(log)
    return acc
  }, {} as Record<string, typeof apiAbuseEvents>)

  const abusiveApiKeys = Object.entries(apiKeyGroups)
    .filter(([_, events]) => events.length > 10) // More than 10 abuse events
    .map(([apiKey, events]) => ({
      apiKey,
      events: events.length,
      firstEvent: events[0].createdAt,
      lastEvent: events[events.length - 1].createdAt,
      user: events[0].user,
      eventTypes: [...new Set(events.map(e => e.action))]
    }))

  return NextResponse.json({
    apiAbuseEvents,
    abusiveApiKeys
  })
}