import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { ExportType, ExportFormat, ExportStatus } from "@prisma/client"
import { join } from "path"
import { writeFile, mkdir, statSync } from "fs/promises"
import { format, subDays } from "date-fns"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type") as ExportType | null
    const status = searchParams.get("status") as ExportStatus | null

    const skip = (page - 1) * limit

    const where: any = { userId: session.user.id }
    if (type) where.type = type
    if (status) where.status = status

    const [exports, total] = await Promise.all([
      prisma.dataExport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dataExport.count({ where })
    ])

    return NextResponse.json({
      exports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error("Data exports API error:", error)
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

    const { type, format, dateRange, filters } = await request.json()

    if (!type || !format) {
      return NextResponse.json({ error: "Type and format are required" }, { status: 400 })
    }

    // Validate export type and format
    if (!Object.values(ExportType).includes(type)) {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
    }

    if (!Object.values(ExportFormat).includes(format)) {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 })
    }

    // Create export record
    const exportRecord = await prisma.dataExport.create({
      data: {
        userId: session.user.id,
        type,
        format,
        status: ExportStatus.PENDING,
        metadata: {
          dateRange,
          filters,
          requestedAt: new Date().toISOString(),
        }
      }
    })

    // Start processing the export in the background
    processExport(exportRecord.id, session.user.id, type, format, dateRange, filters)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DATA_EXPORT_REQUESTED",
        resource: "DataExport",
        metadata: {
          exportId: exportRecord.id,
          type,
          format,
          dateRange,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({
      success: true,
      exportId: exportRecord.id,
      message: "Export request received and is being processed"
    }, { status: 202 })
  } catch (error) {
    console.error("Data exports API error:", error)
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
    const exportId = searchParams.get("id")

    if (!exportId) {
      return NextResponse.json({ error: "Export ID is required" }, { status: 400 })
    }

    const exportRecord = await prisma.dataExport.findFirst({
      where: {
        id: exportId,
        userId: session.user.id
      }
    })

    if (!exportRecord) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 })
    }

    await prisma.dataExport.delete({
      where: { id: exportId }
    })

    return NextResponse.json({
      success: true,
      message: "Export deleted successfully"
    })
  } catch (error) {
    console.error("Data exports API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function processExport(
  exportId: string,
  userId: string,
  type: ExportType,
  format: ExportFormat,
  dateRange: { start: string; end: string },
  filters: any
) {
  try {
    // Update status to processing
    await prisma.dataExport.update({
      where: { id: exportId },
      data: { status: ExportStatus.PROCESSING }
    })

    // Fetch data based on export type
    let data: any[] = []
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    switch (type) {
      case ExportType.PREDICTIONS:
        data = await fetchPredictionData(userId, startDate, endDate, filters)
        break
      case ExportType.USAGE:
        data = await fetchUsageData(userId, startDate, endDate, filters)
        break
      case ExportType.AUDIT_LOGS:
        data = await fetchAuditLogData(userId, startDate, endDate, filters)
        break
      case ExportType.TEAM_DATA:
        data = await fetchTeamData(userId, startDate, endDate, filters)
        break
      case ExportType.BILLING:
        data = await fetchBillingData(userId, startDate, endDate, filters)
        break
      case ExportType.ANALYTICS:
        data = await fetchAnalyticsData(userId, startDate, endDate, filters)
        break
      default:
        throw new Error(`Unsupported export type: ${type}`)
    }

    // Format data based on export format
    let formattedData: string
    let fileName: string
    let mimeType: string

    switch (format) {
      case ExportFormat.CSV:
        formattedData = convertToCSV(data)
        fileName = `${type.toLowerCase()}_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
        mimeType = "text/csv"
        break
      case ExportFormat.JSON:
        formattedData = JSON.stringify(data, null, 2)
        fileName = `${type.toLowerCase()}_export_${format(new Date(), 'yyyy-MM-dd')}.json`
        mimeType = "application/json"
        break
      case ExportFormat.XML:
        formattedData = convertToXML(data, type)
        fileName = `${type.toLowerCase()}_export_${format(new Date(), 'yyyy-MM-dd')}.xml`
        mimeType = "application/xml"
        break
      case ExportFormat.EXCEL:
        // For Excel, we'll create a CSV that can be easily converted
        formattedData = convertToCSV(data)
        fileName = `${type.toLowerCase()}_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
        mimeType = "text/csv"
        break
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }

    // Create exports directory if it doesn't exist
    const exportsDir = join(process.cwd(), "public", "exports")
    try {
      await mkdir(exportsDir, { recursive: true })
    } catch (error) {
      // Directory already exists
    }

    // Save file
    const filePath = join(exportsDir, fileName)
    await writeFile(filePath, formattedData)

    // Update export record with completion info
    const fileStats = statSync(filePath)
    
    await prisma.dataExport.update({
      where: { id: exportId },
      data: {
        status: ExportStatus.COMPLETED,
        filename: fileName,
        filePath: `/exports/${fileName}`,
        fileSize: fileStats.size,
        completedAt: new Date()
      }
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        type: "SUCCESS",
        title: "Export Completed",
        message: `Your ${type.toLowerCase()} export is ready for download.`,
        metadata: {
          exportId,
          fileName,
          downloadUrl: `/exports/${fileName}`,
        }
      }
    })

  } catch (error) {
    console.error("Export processing error:", error)
    
    // Update export record with error
    await prisma.dataExport.update({
      where: { id: exportId },
      data: {
        status: ExportStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    })

    // Create error notification
    await prisma.notification.create({
      data: {
        userId,
        type: "ERROR",
        title: "Export Failed",
        message: `Your ${type.toLowerCase()} export failed to process.`,
        metadata: {
          exportId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    })
  }
}

async function fetchPredictionData(userId: string, startDate: Date, endDate: Date, filters: any) {
  // Mock prediction data - in real implementation, this would fetch from prediction service
  const mockData = []
  for (let i = 0; i < 100; i++) {
    mockData.push({
      id: `pred_${i}`,
      symbol: ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN"][Math.floor(Math.random() * 5)],
      predictedValue: Math.random() * 1000 + 100,
      actualValue: Math.random() * 1000 + 100,
      confidence: Math.random() * 30 + 70,
      timestamp: new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())),
      accuracy: Math.random() * 20 + 80,
    })
  }
  return mockData
}

async function fetchUsageData(userId: string, startDate: Date, endDate: Date, filters: any) {
  const usage = await prisma.usage.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.type && { type: filters.type }),
    },
    orderBy: { date: "desc" }
  })

  return usage.map(u => ({
    id: u.id,
    type: u.type,
    amount: u.amount,
    date: u.date,
    metadata: u.metadata,
  }))
}

async function fetchAuditLogData(userId: string, startDate: Date, endDate: Date, filters: any) {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.action && { action: { contains: filters.action, mode: "insensitive" } }),
    },
    orderBy: { createdAt: "desc" }
  })

  return auditLogs.map(log => ({
    id: log.id,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    timestamp: log.createdAt,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadata,
  }))
}

async function fetchTeamData(userId: string, startDate: Date, endDate: Date, filters: any) {
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
      }
    }
  })

  return teams.map(team => ({
    id: team.id,
    name: team.name,
    description: team.description,
    memberCount: team.members.length,
    members: team.members.map(m => ({
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    settings: team.settings,
  }))
}

async function fetchBillingData(userId: string, startDate: Date, endDate: Date, filters: any) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      user: {
        select: { customerId: true }
      }
    }
  })

  if (!subscription) {
    return []
  }

  // Mock billing data - in real implementation, this would integrate with Stripe
  return [
    {
      id: "bill_1",
      date: new Date(),
      amount: subscription.amount,
      currency: subscription.currency,
      status: subscription.status,
      plan: subscription.plan,
      billingCycle: subscription.billingCycle,
      description: `${subscription.plan} subscription`,
    }
  ]
}

async function fetchAnalyticsData(userId: string, startDate: Date, endDate: Date, filters: any) {
  const usage = await prisma.usage.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Group by type and calculate totals
  const analytics = {
    totalApiCalls: usage.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0),
    totalPredictions: usage.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0),
    totalDataExports: usage.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0),
    period: {
      start: startDate,
      end: endDate,
    },
    dailyBreakdown: [],
  }

  // Generate daily breakdown
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d)
    const dayEnd = new Date(d)
    dayEnd.setHours(23, 59, 59, 999)

    const dayUsage = usage.filter(u => 
      u.date >= dayStart && u.date <= dayEnd
    )

    analytics.dailyBreakdown.push({
      date: dayStart.toISOString().split('T')[0],
      apiCalls: dayUsage.filter(u => u.type === "API_CALL").reduce((sum, u) => sum + u.amount, 0),
      predictions: dayUsage.filter(u => u.type === "PREDICTION").reduce((sum, u) => sum + u.amount, 0),
      dataExports: dayUsage.filter(u => u.type === "DATA_EXPORT").reduce((sum, u) => sum + u.amount, 0),
    })
  }

  return [analytics]
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ""

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle nested objects and arrays
        if (typeof value === "object" && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        // Escape quotes and commas
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(",")
    )
  ]

  return csvRows.join("\n")
}

function convertToXML(data: any[], rootType: string): string {
  const rootName = rootType.toLowerCase()
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`

  data.forEach((item, index) => {
    xml += `  <item index="${index}">\n`
    Object.entries(item).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`
      } else {
        xml += `    <${key}>${value}</${key}>\n`
      }
    })
    xml += `  </item>\n`
  })

  xml += `</${rootName}>`
  return xml
}