"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { format } from "date-fns"

interface Notification {
  id: string
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "BILLING" | "SECURITY" | "TEAM" | "API"
  title: string
  message: string
  metadata?: any
  isRead: boolean
  isReadAt?: Date
  createdAt: Date
}

interface NotificationCenterProps {
  userId: string
  userRole: string
}

export function NotificationCenter({ userId, userRole }: NotificationCenterProps) {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeData, setComposeData] = useState({
    type: "INFO",
    title: "",
    message: "",
    metadata: "{}",
    sendToAll: false,
    userIds: [] as string[],
  })

  useEffect(() => {
    fetchNotifications()
    setupWebSocket()
  }, [])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications?unreadOnly=true&limit=50")
      const data = await response.json()
      
      if (response.ok) {
        setNotifications(data.notifications)
        setUnreadCount(data.pagination.total)
      } else {
        toast.error("Failed to load notifications")
      }
    } catch (error) {
      toast.error("An error occurred while fetching notifications")
    } finally {
      setIsLoading(false)
    }
  }

  const setupWebSocket = () => {
    if (typeof window === "undefined") return

    try {
      const token = localStorage.getItem("next-auth.token") || session?.accessToken
      if (!token) return

      const ws = new WebSocket(`ws://localhost:3002/?token=${token}`)

      ws.onopen = () => {
        console.log("WebSocket connected")
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case "new_notification":
            setNotifications(prev => [data.notification, ...prev])
            setUnreadCount(prev => prev + 1)
            toast(data.notification.title, {
              description: data.notification.message,
            })
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
        console.log("WebSocket disconnected")
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }

      return () => {
        ws.close()
      }
    } catch (error) {
      console.error("Failed to setup WebSocket:", error)
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

      const data = await response.json()
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, isRead: true, isReadAt: new Date() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      } else {
        toast.error(data.error || "Failed to mark notifications as read")
      }
    } catch (error) {
      toast.error("An error occurred while marking notifications as read")
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      })

      const data = await response.data()
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (!notifications.find(n => n.id === notificationId)?.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        toast.success("Notification deleted")
      } else {
        toast.error(data.error || "Failed to delete notification")
      }
    } catch (error) {
      toast.error("An error occurred while deleting notification")
    }
  }

  const sendNotification = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const payload = {
        type: composeData.type,
        title: composeData.title,
        message: composeData.message,
        metadata: JSON.parse(composeData.metadata),
        ...(composeData.sendToAll ? {} : { userIds: composeData.userIds }),
      }

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Notification sent to ${data.notificationsCreated} users`)
        setIsComposeOpen(false)
        setComposeData({
          type: "INFO",
          title: "",
          message: "",
          metadata: "{}",
          sendToAll: false,
          userIds: [],
        })
      } else {
        toast.error(data.error || "Failed to send notification")
      }
    } catch (error) {
      toast.error("An error occurred while sending notification")
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ERROR":
        return <Icons.alert className="h-5 w-5 text-red-500" />
      case "WARNING":
        return <Icons.alert className="h-5 w-5 text-yellow-500" />
      case "SUCCESS":
        return <Icons.check className="h-5 w-5 text-green-500" />
      case "BILLING":
        return <Icons.crown className="h-5 w-5 text-blue-500" />
      case "SECURITY":
        return <Icons.shield className="h-5 w-5 text-purple-500" />
      case "TEAM":
        return <Icons.users className="h-5 w-5 text-orange-500" />
      case "API":
        return <Icons.key className="h-5 w-5 text-indigo-500" />
      default:
        return <Icons.activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case "ERROR":
        return "destructive"
      case "WARNING":
        return "secondary"
      case "SUCCESS":
        return "default"
      case "BILLING":
        return "outline"
      case "SECURITY":
        return "destructive"
      case "TEAM":
        return "outline"
      case "API":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-bold">Notification Center</h2>
            <p className="text-muted-foreground">Manage your notifications and alerts</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {userRole === "ADMIN" || userRole === "SUPER_ADMIN" ? (
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Icons.plus className="mr-2 h-4 w-4" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                  <DialogDescription>
                    Send a notification to users
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <select 
                        value={composeData.type}
                        onChange={(e) => setComposeData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full mt-1 p-2 border rounded"
                      >
                        <option value="INFO">Info</option>
                        <option value="WARNING">Warning</option>
                        <option value="ERROR">Error</option>
                        <option value="SUCCESS">Success</option>
                        <option value="BILLING">Billing</option>
                        <option value="SECURITY">Security</option>
                        <option value="TEAM">Team</option>
                        <option value="API">API</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={composeData.title}
                        onChange={(e) => setComposeData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Notification title"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={composeData.message}
                      onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Notification message"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Metadata (JSON)</label>
                    <Textarea
                      value={composeData.metadata}
                      onChange={(e) => setComposeData(prev => ({ ...prev, metadata: e.target.value }))}
                      placeholder='{"key": "value"}'
                      rows={2}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendToAll"
                      checked={composeData.sendToAll}
                      onChange={(e) => setComposeData(prev => ({ ...prev, sendToAll: e.target.checked }))}
                    />
                    <label htmlFor="sendToAll">Send to all users</label>
                  </div>
                  
                  <Button 
                    onClick={sendNotification} 
                    disabled={isLoading || !composeData.title || !composeData.message}
                    className="w-full"
                  >
                    {isLoading ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )}
          
          <Button variant="outline" onClick={fetchNotifications}>
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icons.activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
                <p className="text-muted-foreground text-center">
                  You don't have any notifications yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-colors ${!notification.isRead ? 'border-primary' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getNotificationBadgeColor(notification.type)}>
                                {notification.type}
                              </Badge>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                            </span>
                            <div className="flex items-center space-x-2">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead([notification.id])}
                                >
                                  Mark as Read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedNotification(notification)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.filter(n => !n.isRead).map((notification) => (
                <Card key={notification.id} className="border-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            <Badge variant={getNotificationBadgeColor(notification.type)}>
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead([notification.id])}
                              >
                                Mark as Read
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedNotification(notification)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Icons.info className="h-4 w-4" />
                <AlertDescription>
                  Notification settings are currently managed at the system level. 
                  Contact your administrator for custom notification preferences.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <div className="w-12 h-6 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time push notifications
                    </p>
                  </div>
                  <div className="w-12 h-6 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Desktop Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Show notifications on your desktop
                    </p>
                  </div>
                  <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Details Dialog */}
      {selectedNotification && (
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center space-x-3">
                {getNotificationIcon(selectedNotification.type)}
                <div>
                  <DialogTitle>{selectedNotification.title}</DialogTitle>
                  <DialogDescription>
                    {format(new Date(selectedNotification.createdAt), "MMMM dd, yyyy 'at' HH:mm")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm">{selectedNotification.message}</p>
              </div>
              
              {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Badge variant={getNotificationBadgeColor(selectedNotification.type)}>
                    {selectedNotification.type}
                  </Badge>
                  {selectedNotification.isRead && (
                    <Badge variant="outline">
                      Read
                    </Badge>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {!selectedNotification.isRead && (
                    <Button
                      variant="outline"
                      onClick={() => markAsRead([selectedNotification.id])}
                    >
                      Mark as Read
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => deleteNotification(selectedNotification.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}