"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface Notification {
  id: string
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "BILLING" | "SECURITY" | "TEAM" | "API"
  title: string
  message: string
  metadata?: any
  isRead: boolean
  createdAt: Date
}

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!session) return

    // Fetch initial notifications
    fetchUnreadCount()

    // Setup WebSocket connection
    const ws = setupWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [session])

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?unreadOnly=true&limit=1")
      const data = await response.json()
      
      if (response.ok) {
        setUnreadCount(data.pagination.total)
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error)
    }
  }

  const setupWebSocket = () => {
    if (typeof window === "undefined") return null

    try {
      const token = localStorage.getItem("next-auth.token") || session?.accessToken
      if (!token) return null

      const ws = new WebSocket(`ws://localhost:3002/?token=${token}`)

      ws.onopen = () => {
        console.log("Notification WebSocket connected")
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case "new_notification":
            setNotifications(prev => [data.notification, ...prev.slice(0, 49)]) // Keep last 50
            setUnreadCount(prev => prev + 1)
            break
          case "unread_count_updated":
            setUnreadCount(data.unreadCount)
            break
          case "connection_established":
            setUnreadCount(data.unreadCount)
            break
        }
      }

      ws.onclose = () => {
        console.log("Notification WebSocket disconnected")
        setIsConnected(false)
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000)
      }

      ws.onerror = (error) => {
        console.error("Notification WebSocket error:", error)
        setIsConnected(false)
      }

      return ws
    } catch (error) {
      console.error("Failed to setup notification WebSocket:", error)
      return null
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationIds,
          action: "mark_read",
        }),
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, isRead: true }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds)
    }
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refetch: fetchUnreadCount,
  }
}