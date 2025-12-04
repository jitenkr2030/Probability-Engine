"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/ui/icons"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { toast } from "sonner"

interface AnalyticsData {
  overview?: {
    totalApiCalls: number
    totalPredictions: number
    totalDataExports: number
    activeApiKeys: number
    totalTeams: number
  }
  dailyUsage?: Array<{
    date: string
    apiCalls: number
    predictions: number
    dataExports: number
  }>
  usageByType?: {
    apiCalls: number
    predictions: number
    dataExports: number
    teamInvites: number
    notifications: number
  }
  topApiKeys?: Array<{
    id: string
    name: string
    usage: number
    lastUsed?: Date
  }>
  teamActivity?: Array<{
    id: string
    name: string
    memberCount: number
    isOwner: boolean
  }>
  hourlyUsage?: Array<{
    hour: number
    calls: number
  }>
  apiKeyUsage?: Array<{
    id: string
    name: string
    usage: number
    lastUsed?: Date
  }>
  errorRate?: string
  totalCalls?: number
  averageCallsPerDay?: string
  dailyPredictions?: Array<{
    date: string
    predictions: number
  }>
  accuracyData?: Array<{
    date: string
    accuracy: number
  }>
  topSymbols?: Array<{
    symbol: string
    predictions: number
    accuracy: number
  }>
  totalPredictions?: number
  averageAccuracy?: number
  memberContributions?: Array<{
    teamId: string
    teamName: string
    userId: string
    userName: string
    userEmail: string
    role: string
    totalUsage: number
    apiCalls: number
    predictions: number
  }>
  totalTeams?: number
  totalMembers?: number
  averageTeamSize?: string
}

interface AnalyticsDashboardProps {
  userId: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [selectedType, setSelectedType] = useState("overview")

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod, selectedType])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?period=${selectedPeriod}&type=${selectedType}`)
      const data = await response.json()
      
      if (response.ok) {
        setAnalyticsData(data)
      } else {
        toast.error("Failed to load analytics data")
      }
    } catch (error) {
      toast.error("An error occurred while fetching analytics")
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    })
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
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track your usage and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchAnalytics}>
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {analyticsData.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Icons.activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalApiCalls)}</div>
              <p className="text-xs text-muted-foreground">
                Total calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Predictions</CardTitle>
              <Icons.brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalPredictions)}</div>
              <p className="text-xs text-muted-foreground">
                Total predictions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Exports</CardTitle>
              <Icons.download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.totalDataExports}</div>
              <p className="text-xs text-muted-foreground">
                Total exports
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Keys</CardTitle>
              <Icons.key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.activeApiKeys}</div>
              <p className="text-xs text-muted-foreground">
                Active keys
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams</CardTitle>
              <Icons.users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.totalTeams}</div>
              <p className="text-xs text-muted-foreground">
                Total teams
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Usage</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Daily Usage Chart */}
          {analyticsData.dailyUsage && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage Trends</CardTitle>
                <CardDescription>Your usage patterns over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="apiCalls" stroke="#8884d8" name="API Calls" />
                    <Line type="monotone" dataKey="predictions" stroke="#82ca9d" name="Predictions" />
                    <Line type="monotone" dataKey="dataExports" stroke="#ffc658" name="Data Exports" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Usage by Type */}
          {analyticsData.usageByType && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Type</CardTitle>
                  <CardDescription>Breakdown of your usage by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "API Calls", value: analyticsData.usageByType.apiCalls },
                          { name: "Predictions", value: analyticsData.usageByType.predictions },
                          { name: "Data Exports", value: analyticsData.usageByType.dataExports },
                          { name: "Team Invites", value: analyticsData.usageByType.teamInvites },
                          { name: "Notifications", value: analyticsData.usageByType.notifications },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: "API Calls", value: analyticsData.usageByType.apiCalls },
                          { name: "Predictions", value: analyticsData.usageByType.predictions },
                          { name: "Data Exports", value: analyticsData.usageByType.dataExports },
                          { name: "Team Invites", value: analyticsData.usageByType.teamInvites },
                          { name: "Notifications", value: analyticsData.usageByType.notifications },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top API Keys */}
              {analyticsData.topApiKeys && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top API Keys</CardTitle>
                    <CardDescription>Your most used API keys</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.topApiKeys.map((key, index) => (
                        <div key={key.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{key.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {key.lastUsed ? `Last used: ${new Date(key.lastUsed).toLocaleDateString()}` : "Never used"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {formatNumber(key.usage)} calls
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          {/* Hourly Usage */}
          {analyticsData.hourlyUsage && (
            <Card>
              <CardHeader>
                <CardTitle>Hourly Usage Pattern</CardTitle>
                <CardDescription>Your API usage throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.hourlyUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* API Key Usage */}
          {analyticsData.apiKeyUsage && (
            <Card>
              <CardHeader>
                <CardTitle>API Key Usage Distribution</CardTitle>
                <CardDescription>Usage distribution across your API keys</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.apiKeyUsage.map(key => ({ name: key.name, usage: key.usage }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* API Stats */}
          {analyticsData.totalCalls !== undefined && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(analyticsData.totalCalls)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average per Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.averageCallsPerDay}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.errorRate}%</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {/* Prediction Trends */}
          {analyticsData.dailyPredictions && (
            <Card>
              <CardHeader>
                <CardTitle>Prediction Trends</CardTitle>
                <CardDescription>Your prediction usage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.dailyPredictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="predictions" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Accuracy Trends */}
          {analyticsData.accuracyData && (
            <Card>
              <CardHeader>
                <CardTitle>Prediction Accuracy</CardTitle>
                <CardDescription>Accuracy trends over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.accuracyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis domain={[80, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                    <Line type="monotone" dataKey="accuracy" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Symbols */}
          {analyticsData.topSymbols && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Predicted Symbols</CardTitle>
                  <CardDescription>Your most frequently predicted stocks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.topSymbols.map((symbol, index) => (
                      <div key={symbol.symbol} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{symbol.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {symbol.predictions} predictions
                            </p>
                          </div>
                        </div>
                        <Badge variant={symbol.accuracy > 85 ? "default" : "secondary"}>
                          {symbol.accuracy.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Prediction Stats */}
              {analyticsData.totalPredictions !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prediction Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Predictions</span>
                      <span className="font-medium">{formatNumber(analyticsData.totalPredictions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Accuracy</span>
                      <span className="font-medium">{analyticsData.averageAccuracy?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Average</span>
                      <span className="font-medium">
                        {(analyticsData.totalPredictions / 30).toFixed(0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {/* Team Activity */}
          {analyticsData.teamActivity && (
            <Card>
              <CardHeader>
                <CardTitle>Team Activity</CardTitle>
                <CardDescription>Usage and activity across your teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.teamActivity.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icons.users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {team.memberCount} members
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {team.isOwner && (
                          <Badge variant="outline">Owner</Badge>
                        )}
                        <Badge variant="secondary">
                          {team.totalUsage} usage
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Member Contributions */}
          {analyticsData.memberContributions && (
            <Card>
              <CardHeader>
                <CardTitle>Member Contributions</CardTitle>
                <CardDescription>Usage breakdown by team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.memberContributions
                    .sort((a, b) => b.totalUsage - a.totalUsage)
                    .slice(0, 10)
                    .map((member, index) => (
                      <div key={`${member.teamId}-${member.userId}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{member.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.teamName} • {member.userEmail}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatNumber(member.totalUsage)}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.apiCalls} API • {member.predictions} predictions
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Stats */}
          {analyticsData.totalTeams !== undefined && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalTeams}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalMembers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.averageTeamSize}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}