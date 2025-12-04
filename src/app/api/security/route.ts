import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { subDays, subHours, isAfter, isBefore, addHours } from "date-fns"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view security data
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "24h" // 24h, 7d, 30d

    let startDate: Date
    const now = new Date()

    switch (period) {
      case "7d":
        startDate = subDays(now, 7)
        break
      case "30d":
        startDate = subDays(now, 30)
        break
      default:
        startDate = subHours(now, 24)
    }

    // Get failed login attempts
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: "LOGIN_FAILED",
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Get successful logins
    const successfulLogins = await prisma.auditLog.findMany({
      where: {
        action: "LOGIN_SUCCESS",
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Get password changes
    const passwordChanges = await prisma.auditLog.findMany({
      where: {
        action: "PASSWORD_CHANGED",
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Get API key creations/deletions
    const apiKeyActivities = await prisma.auditLog.findMany({
      where: {
        action: { in: ["API_KEY_CREATED", "API_KEY_DELETED", "API_KEY_UPDATED"] },
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Get suspicious activities
    const suspiciousActivities = await detectSuspiciousActivities(startDate)

    // Get login attempts by IP
    const loginAttemptsByIp = await getLoginAttemptsByIp(startDate)

    // Get active sessions (mock data for now)
    const activeSessions = await getActiveSessions()

    // Get security alerts
    const securityAlerts = await generateSecurityAlerts(
      failedLogins,
      successfulLogins,
      suspiciousActivities,
      startDate
    )

    // Calculate security metrics
    const securityMetrics = {
      totalFailedLogins: failedLogins.length,
      totalSuccessfulLogins: successfulLogins.length,
      totalPasswordChanges: passwordChanges.length,
      totalApiKeyActivities: apiKeyActivities.length,
      totalSuspiciousActivities: suspiciousActivities.length,
      totalSecurityAlerts: securityAlerts.length,
      failedLoginRate: successfulLogins.length > 0 
        ? (failedLogins.length / (failedLogins.length + successfulLogins.length)) * 100 
        : 0,
      uniqueIpsWithFailedLogins: new Set(failedLogins.map(log => log.metadata?.ip)).size,
      uniqueUsersWithFailedLogins: new Set(failedLogins.map(log => log.userId)).size,
    }

    return NextResponse.json({
      securityMetrics,
      failedLogins,
      successfulLogins,
      passwordChanges,
      apiKeyActivities,
      suspiciousActivities,
      loginAttemptsByIp,
      activeSessions,
      securityAlerts,
      period: {
        start: startDate,
        end: now
      }
    })
  } catch (error) {
    console.error("Security API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function detectSuspiciousActivities(startDate: Date) {
  const suspiciousActivities = []

  // Detect multiple failed login attempts from same IP
  const failedLoginsByIp = await prisma.auditLog.groupBy({
    by: ["metadata"],
    where: {
      action: "LOGIN_FAILED",
      createdAt: { gte: startDate }
    },
    _count: {
      id: true
    },
    having: {
      id: {
        _count: {
          gte: 5 // 5+ failed attempts
        }
      }
    }
  })

  for (const group of failedLoginsByIp) {
    const ip = group.metadata?.ip
    if (ip) {
      suspiciousActivities.push({
        type: "MULTIPLE_FAILED_LOGINS",
        severity: "HIGH",
        ip,
        count: group._count.id,
        description: `${group._count.id} failed login attempts from IP ${ip}`,
        timestamp: new Date()
      })
    }
  }

  // Detect logins from unusual locations (mock implementation)
  const unusualLogins = await prisma.auditLog.findMany({
    where: {
      action: "LOGIN_SUCCESS",
      createdAt: { gte: startDate },
      metadata: {
        path: "$.isUnusualLocation",
        equals: true
      }
    }
  })

  for (const login of unusualLogins) {
    suspiciousActivities.push({
      type: "UNUSUAL_LOCATION",
      severity: "MEDIUM",
      userId: login.userId,
      ip: login.metadata?.ip,
      location: login.metadata?.location,
      description: `Login from unusual location for user ${login.user?.name}`,
      timestamp: login.createdAt
    })
  }

  // Detect rapid API key usage
  const rapidApiKeyUsage = await prisma.auditLog.findMany({
    where: {
      action: "API_KEY_USED",
      createdAt: { gte: subHours(new Date(), 1) }
    },
    include: {
      user: true
    }
  })

  const apiKeyUsageByUser = new Map()
  rapidApiKeyUsage.forEach(log => {
    const userId = log.userId
    if (!apiKeyUsageByUser.has(userId)) {
      apiKeyUsageByUser.set(userId, [])
    }
    apiKeyUsageByUser.get(userId).push(log)
  })

  for (const [userId, logs] of apiKeyUsageByUser) {
    if (logs.length > 100) { // More than 100 API calls in an hour
      suspiciousActivities.push({
        type: "RAPID_API_USAGE",
        severity: "MEDIUM",
        userId,
        count: logs.length,
        description: `${logs.length} API calls in the last hour`,
        timestamp: new Date()
      })
    }
  }

  return suspiciousActivities
}

async function getLoginAttemptsByIp(startDate: Date) {
  const loginAttempts = await prisma.auditLog.findMany({
    where: {
      action: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED"] },
      createdAt: { gte: startDate }
    },
    select: {
      metadata: true,
      action: true,
      createdAt: true
    }
  })

  const ipStats = new Map()
  
  loginAttempts.forEach(attempt => {
    const ip = attempt.metadata?.ip || "unknown"
    if (!ipStats.has(ip)) {
      ipStats.set(ip, {
        ip,
        successful: 0,
        failed: 0,
        firstSeen: attempt.createdAt,
        lastSeen: attempt.createdAt,
        userIds: new Set()
      })
    }
    
    const stats = ipStats.get(ip)
    if (attempt.action === "LOGIN_SUCCESS") {
      stats.successful++
    } else {
      stats.failed++
    }
    stats.lastSeen = attempt.createdAt
    if (attempt.metadata?.userId) {
      stats.userIds.add(attempt.metadata.userId)
    }
  })

  return Array.from(ipStats.values()).sort((a, b) => b.failed - a.failed)
}

async function getActiveSessions() {
  // Mock implementation - in a real app, you'd track active sessions
  return [
    {
      id: "session_1",
      userId: "user_1",
      userEmail: "user@example.com",
      ip: "192.168.1.1",
      location: "New York, US",
      device: "Chrome on Windows",
      loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      isActive: true
    },
    {
      id: "session_2",
      userId: "user_2",
      userEmail: "admin@example.com",
      ip: "192.168.1.2",
      location: "London, UK",
      device: "Safari on macOS",
      loginTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      lastActivity: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      isActive: true
    }
  ]
}

async function generateSecurityAlerts(
  failedLogins: any[],
  successfulLogins: any[],
  suspiciousActivities: any[],
  startDate: Date
) {
  const alerts = []

  // High failed login rate alert
  const totalLogins = failedLogins.length + successfulLogins.length
  const failedRate = totalLogins > 0 ? (failedLogins.length / totalLogins) * 100 : 0
  
  if (failedRate > 20) { // More than 20% failed logins
    alerts.push({
      type: "HIGH_FAILED_LOGIN_RATE",
      severity: "HIGH",
      title: "High Failed Login Rate Detected",
      message: `${failedRate.toFixed(1)}% of login attempts have failed in the selected period`,
      timestamp: new Date(),
      metrics: {
        failedLogins: failedLogins.length,
        totalLogins,
        failedRate
      }
    })
  }

  // Brute force attack alert
  const ipsWithManyFailures = new Set(
    failedLogins
      .filter(log => log.metadata?.ip)
      .map(log => log.metadata.ip)
  )

  for (const ip of ipsWithManyFailures) {
    const ipFailedLogins = failedLogins.filter(log => log.metadata?.ip === ip)
    if (ipFailedLogins.length > 10) {
      alerts.push({
        type: "BRUTE_FORCE_ATTACK",
        severity: "HIGH",
        title: "Potential Brute Force Attack",
        message: `${ipFailedLogins.length} failed login attempts from IP ${ip}`,
        timestamp: new Date(),
        metrics: {
          ip,
          failedAttempts: ipFailedLogins.length,
          timeRange: period
        }
      })
    }
  }

  // Suspicious activity alerts
  suspiciousActivities.forEach(activity => {
    alerts.push({
      type: activity.type,
      severity: activity.severity,
      title: "Suspicious Activity Detected",
      message: activity.description,
      timestamp: activity.timestamp,
      metrics: activity
    })
  })

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}