"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/ui/icons"
import { SubscriptionManager } from "@/components/subscription/subscription-manager"
import { TeamManager } from "@/components/teams/team-manager"
import { ApiKeyManager } from "@/components/api-keys/api-key-manager"
import { DataExportManager } from "@/components/data-exports/data-export-manager"
import { WhiteLabelManager } from "@/components/white-label/white-label-manager"
import { PartnershipManager } from "@/components/partnerships/partnership-manager"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    image?: string
    role: string
    status: string
  }
  subscription?: {
    id: string
    plan: string
    status: string
    apiCallsLimit: number
    apiCallsUsed: number
    predictionsLimit: number
    predictionsUsed: number
    trialEndsAt?: Date
  }
  profile?: {
    id: string
    company?: string
    phone?: string
    timezone: string
    language: string
  }
  teams: any[]
  apiKeys: any[]
  recentActivity: any[]
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData()
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, apiKeysRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/api-keys"),
      ])

      const teams = teamsRes.ok ? await teamsRes.json() : []
      const apiKeys = apiKeysRes.ok ? await apiKeysRes.json() : []

      setDashboardData({
        user: session!.user,
        subscription: session!.user.subscription,
        profile: session!.user.profile,
        teams,
        apiKeys,
        recentActivity: [], // TODO: Fetch recent activity
      })
    } catch (error) {
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500"
    if (percentage >= 70) return "text-yellow-500"
    return "text-green-500"
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/auth/signin"}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load dashboard data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { user, subscription, profile, teams, apiKeys } = dashboardData

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image} />
              <AvatarFallback className="text-lg">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.href = "/api/auth/signout"}>
            Sign Out
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Plan</CardTitle>
              <Icons.crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription?.plan || "FREE"}</div>
              <p className="text-xs text-muted-foreground">
                {subscription?.status || "TRIAL"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Usage</CardTitle>
              <Icons.activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.apiCallsUsed || 0}
                <span className="text-sm font-normal text-muted-foreground">
                  /{subscription?.apiCallsLimit === -1 ? "∞" : subscription?.apiCallsLimit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                API calls this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Predictions</CardTitle>
              <Icons.brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.predictionsUsed || 0}
                <span className="text-sm font-normal text-muted-foreground">
                  /{subscription?.predictionsLimit === -1 ? "∞" : subscription?.predictionsLimit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Predictions this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams</CardTitle>
              <Icons.users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground">
                Active teams
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Progress */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>
                Track your resource usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Calls</span>
                  <span className={getUsageColor(getUsagePercentage(subscription.apiCallsUsed, subscription.apiCallsLimit))}>
                    {subscription.apiCallsUsed} / {subscription.apiCallsLimit === -1 ? "Unlimited" : subscription.apiCallsLimit}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${subscription.apiCallsLimit === -1 ? 0 : getUsagePercentage(subscription.apiCallsUsed, subscription.apiCallsLimit)}%` 
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Predictions</span>
                  <span className={getUsageColor(getUsagePercentage(subscription.predictionsUsed, subscription.predictionsLimit))}>
                    {subscription.predictionsUsed} / {subscription.predictionsLimit === -1 ? "Unlimited" : subscription.predictionsLimit}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${subscription.predictionsLimit === -1 ? 0 : getUsagePercentage(subscription.predictionsUsed, subscription.predictionsLimit)}%` 
                    }}
                  />
                </div>
              </div>

              {subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date() && (
                <Alert>
                  <Icons.clock className="h-4 w-4" />
                  <p className="text-sm">
                    Your trial ends on {format(new Date(subscription.trialEndsAt), "MMMM dd, yyyy")}. 
                    Upgrade to continue using all features.
                  </p>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="data-exports">Data Exports</TabsTrigger>
            {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
              <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
            )}
            {userSubscription?.plan === "ENTERPRISE" && (
              <TabsTrigger value="white-label">White Label</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                      dashboardData.recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <div className="flex-1">
                            <p className="text-sm">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), "MMM dd, HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => document.querySelector('[value="subscription"]')?.click()}
                  >
                    <Icons.crown className="mr-2 h-4 w-4" />
                    Manage Subscription
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => document.querySelector('[value="teams"]')?.click()}
                  >
                    <Icons.users className="mr-2 h-4 w-4" />
                    Manage Teams
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => document.querySelector('[value="api-keys"]')?.click()}
                  >
                    <Icons.key className="mr-2 h-4 w-4" />
                    Manage API Keys
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open("/api/docs", "_blank")}
                  >
                    <Icons.shield className="mr-2 h-4 w-4" />
                    API Documentation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManager 
              currentPlan={subscription}
              onSubscriptionUpdate={fetchDashboardData}
            />
          </TabsContent>

          <TabsContent value="teams">
            <TeamManager 
              teams={teams}
              onTeamsUpdate={fetchDashboardData}
            />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeyManager 
              apiKeys={apiKeys}
              onApiKeysUpdate={fetchDashboardData}
            />
          </TabsContent>

          <TabsContent value="data-exports">
            <DataExportManager 
              userId={user.id}
              userSubscription={subscription}
            />
          </TabsContent>

          {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
            <TabsContent value="partnerships">
              <PartnershipManager 
                userId={user.id}
                userRole={user.role}
              />
            </TabsContent>
          )}

          {userSubscription?.plan === "ENTERPRISE" && (
            <TabsContent value="white-label">
              <WhiteLabelManager 
                userId={user.id}
                userSubscription={subscription}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}