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
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = { userId: session.user.id }
    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    const totalCount = await prisma.notification.count({ where })

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      }
    })
  } catch (error) {
    console.error("Notifications API error:", error)
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

    const { type, title, message, metadata, userIds } = await request.json()

    if (!type || !title || !message) {
      return NextResponse.json({ error: "Type, title, and message are required" }, { status: 400 })
    }

    // Check if user has permission to send notifications
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const notifications = []

    // Send to specific users or all users
    if (userIds && Array.isArray(userIds)) {
      // Send to specific users
      for (const userId of userIds) {
        const notification = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            metadata: metadata || {},
          }
        })
        notifications.push(notification)
      }
    } else {
      // Send to all users
      const allUsers = await prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true }
      })

      for (const user of allUsers) {
        const notification = await prisma.notification.create({
          data: {
            userId: user.id,
            type,
            title,
            message,
            metadata: metadata || {},
          }
        })
        notifications.push(notification)
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "NOTIFICATION_BROADCAST",
        resource: "Notification",
        metadata: {
          type,
          title,
          recipientCount: notifications.length,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({
      success: true,
      notificationsCreated: notifications.length,
    }, { status: 201 })
  } catch (error) {
    console.error("Notifications API error:", error)
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

    const { notificationIds, action } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds) || !action) {
      return NextResponse.json({ error: "Notification IDs and action are required" }, { status: 400 })
    }

    let updateData = {}

    switch (action) {
      case "mark_read":
        updateData = { isRead: true, isReadAt: new Date() }
        break
      case "mark_unread":
        updateData = { isRead: false, isReadAt: null }
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const updatedNotifications = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      updatedCount: updatedNotifications.count,
    })
  } catch (error) {
    console.error("Notifications API error:", error)
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
    const notificationId = searchParams.get("id")

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    const deletedNotification = await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      deletedNotification,
    })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}