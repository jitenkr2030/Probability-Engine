import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const wss = new WebSocketServer({ port: 3002 })

// Store active connections
const connections = new Map<string, WebSocket>()

console.log('Notification WebSocket server running on port 3002')

wss.on('connection', async (ws: WebSocket, req) => {
  console.log('New WebSocket connection')

  // Extract token from query parameters
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const token = url.searchParams.get('token')

  if (!token) {
    ws.close(1008, 'Token required')
    return
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
    const userId = decoded.sub

    if (!userId) {
      ws.close(1008, 'Invalid token')
      return
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId, status: 'ACTIVE' }
    })

    if (!user) {
      ws.close(1008, 'User not found or inactive')
      return
    }

    // Store connection
    connections.set(userId, ws)

    console.log(`User ${userId} connected`)

    // Send unread notifications count
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    })

    ws.send(JSON.stringify({
      type: 'connection_established',
      unreadCount
    }))

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString())

        switch (data.type) {
          case 'mark_read':
            if (data.notificationIds) {
              await prisma.notification.updateMany({
                where: {
                  id: { in: data.notificationIds },
                  userId
                },
                data: { isRead: true, isReadAt: new Date() }
              })

              // Send updated unread count
              const newUnreadCount = await prisma.notification.count({
                where: { userId, isRead: false }
              })

              ws.send(JSON.stringify({
                type: 'unread_count_updated',
                unreadCount: newUnreadCount
              }))
            }
            break

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }))
            break
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }))
      }
    })

    // Handle disconnection
    ws.on('close', () => {
      console.log(`User ${userId} disconnected`)
      connections.delete(userId)
    })

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error)
      connections.delete(userId)
    })

  } catch (error) {
    console.error('WebSocket authentication error:', error)
    ws.close(1008, 'Authentication failed')
  }
})

// Function to send notification to specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const ws = connections.get(userId)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'new_notification',
      notification
    }))
  }
}

// Function to broadcast notification to all users
export function broadcastNotification(notification: any) {
  connections.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'new_notification',
        notification
      }))
    }
  })
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...')
  wss.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})