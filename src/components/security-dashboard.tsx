"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { format } from "date-fns"

interface SecurityMetrics {
  totalFailedLogins: number
  totalSuccessfulLogins: number
  totalPasswordChanges: number
  totalApiKeyActivities: number
  totalSuspiciousActivities: number
  totalSecurityAlerts: number
  failedLoginRate: number
  uniqueIpsWithFailedLogins: number
  uniqueUsersWithFailedLogins: number
}

interface SecurityAlert {
  type: string
  severity: "HIGH" | "MEDIUM" | "LOW"
  title: string
  message: string
  timestamp: Date
  metrics?: any
}

interface SuspiciousActivity {
  type: string
  severity: "HIGH" | "MEDIUM" | "LOW"
  ip?: string
  userId?: string
  count?: number
  description: string
  timestamp: Date
}

interface LoginAttempt {
  ip: string
  successful: number
  failed: number
  firstSeen: Date
  lastSeen: Date
  userIds: Set<string>
}

interface ActiveSession {
  id: string
  userId: string
  userEmail: string
  ip: string
  location: string
  device: string
  loginTime: Date
  lastActivity: Date
  isActive: boolean
}

export function SecurityDashboard() {
  const [securityData, setSecurityData] = useState<{
    securityMetrics: SecurityMetrics
    failedLogins: any[]
    successfulLogins: any[]
    passwordChanges: any[]
    apiKeyActivities: any[]
    suspiciousActivities: SuspiciousActivity[]
    loginAttemptsByIp: LoginAttempt[]
    activeSessions: ActiveSession[]
    securityAlerts: SecurityAlert[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState("24h")

  useEffect(() => {
    fetchSecurityData()
  }, [period])

  const fetchSecurityData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/security?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setSecurityData(data)
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch security data")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return <Icons.alert className="h-4 w-4 text-red-600" />
      case "MEDIUM":
        return <Icons.alert className="h-4 w-4 text-yellow-600" />
      case "LOW":
        return <Icons.shield className="h-4 w-4 text-blue-600" />
      default:
        return <Icons.shield className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor security events and suspicious activities
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Button onClick={fetchSecurityData}>
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Icons.alert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {securityData?.securityMetrics.totalFailedLogins || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityData?.securityMetrics.failedLoginRate.toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <Icons.shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {securityData?.securityMetrics.totalSecurityAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
            <Icons.activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {securityData?.securityMetrics.totalSuspiciousActivities || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Detected automatically
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Icons.user className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {securityData?.activeSessions.filter(s => s.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="suspicious">Suspicious Activities</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="ip-analysis">IP Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Recent security alerts that require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityData?.securityAlerts.map((alert, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(alert.severity)}
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant="outline">{alert.severity}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(alert.timestamp), "MMM dd, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    {alert.metrics && (
                      <div className="text-xs space-y-1">
                        {Object.entries(alert.metrics).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!securityData?.securityAlerts || securityData.securityAlerts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No security alerts found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activities</CardTitle>
              <CardDescription>
                Automatically detected suspicious activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityData?.suspiciousActivities.map((activity, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${getSeverityColor(activity.severity)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(activity.severity)}
                        <h4 className="font-medium">{activity.type.replace(/_/g, " ")}</h4>
                        <Badge variant="outline">{activity.severity}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(activity.timestamp), "MMM dd, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{activity.description}</p>
                    <div className="text-xs space-y-1">
                      {activity.ip && (
                        <div><strong>IP:</strong> {activity.ip}</div>
                      )}
                      {activity.count && (
                        <div><strong>Count:</strong> {activity.count}</div>
                      )}
                    </div>
                  </div>
                ))}
                {(!securityData?.suspiciousActivities || securityData.suspiciousActivities.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No suspicious activities detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Currently active user sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityData?.activeSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{session.userEmail}</div>
                            <div className="text-sm text-muted-foreground">ID: {session.userId}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{session.ip}</TableCell>
                        <TableCell>{session.location}</TableCell>
                        <TableCell className="text-sm">{session.device}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(session.loginTime), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(session.lastActivity), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.isActive ? "default" : "secondary"}>
                            {session.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip-analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>IP Address Analysis</CardTitle>
              <CardDescription>
                Login attempts grouped by IP address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Successful Logins</TableHead>
                      <TableHead>Failed Logins</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Unique Users</TableHead>
                      <TableHead>First Seen</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityData?.loginAttemptsByIp.slice(0, 20).map((attempt, index) => {
                      const total = attempt.successful + attempt.failed
                      const successRate = total > 0 ? (attempt.successful / total) * 100 : 0
                      const isSuspicious = attempt.failed > attempt.successful && attempt.failed > 5

                      return (
                        <TableRow key={index} className={isSuspicious ? "bg-red-50" : ""}>
                          <TableCell className="font-mono text-sm">{attempt.ip}</TableCell>
                          <TableCell>
                            <span className="text-green-600">{attempt.successful}</span>
                          </TableCell>
                          <TableCell>
                            <span className={attempt.failed > 0 ? "text-red-600" : ""}>
                              {attempt.failed}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={successRate} className="w-16" />
                              <span className="text-sm">{successRate.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{attempt.userIds.size}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(attempt.firstSeen), "MMM dd, HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(attempt.lastSeen), "MMM dd, HH:mm")}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}