"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/ui/icons"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

interface AnalyticsData {
  overview?: {
    totalApiCalls: number
    totalPredictions: number
    totalTeamApiCalls: number
    totalTeamPredictions: number
    apiUsagePercentage: number
    predictionUsagePercentage: number
    period: {
      start: string
      end: string
    }
  }
  dailyUsage?: Array<{
    date: string
    apiCalls: number
    predictions: number
    teamApiCalls: number
    teamPredictions: number
  }>
  subscription?: {
    plan: string
    apiCallsLimit: number
    predictionsLimit: number
    apiCallsUsed: number
    predictionsUsed: number
  }
  hourlyUsage?: Array<{
    hour: string
    usage: number
    teamUsage: number
  }>
  topEndpoints?: Array<{
    endpoint: string
    usage: number
  }>
  errorRate?: number
  totalRequests?: number
  totalTeamRequests?: number
  typeDistribution?: Array<{
    type: string
    count: number
  }>
  accuracyData?: Array<{
    date: string
    accuracy: number
  }>
  topSymbols?: Array<{
    symbol: string
    count: number
  }>
  averageAccuracy?: number
  totalPredictions?: number
  totalTeamPredictions?: number
  teams?: Array<{
    id: string
    name: string
    memberCount: number
    apiCalls: number
    predictions: number
    activeMembers: number
  }>
  members?: Array<{
    id: string
    name: string
    email: string
    role: string
    apiCalls: number
    predictions: number
  }>
  totalTeams?: number
  totalMembers?: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [period, setPeriod] = useState("7d")
  const [type, setType] = useState("overview")

  useEffect(() => {
    fetchAnalytics()
  }, [period, type])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?period=${period}&type=${type}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-green-600"
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics & Reports</h2>
        <div className="flex items-center space-x-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={type} onValueChange={setType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Usage</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                <Icons.activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics.overview?.totalApiCalls || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Team: {formatNumber(analytics.overview?.totalTeamApiCalls || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                <Icons.trendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics.overview?.totalPredictions || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Team: {formatNumber(analytics.overview?.totalTeamPredictions || 0)}
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
                  {analytics.overview?.apiUsagePercentage || 0}%
                </div>
                <Progress value={analytics.overview?.apiUsagePercentage || 0} className="mt-2" />
                <p className={`text-xs ${getUsageColor(analytics.overview?.apiUsagePercentage || 0)}`}>
                  {analytics.overview?.apiUsagePercentage || 0}% of limit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prediction Usage</CardTitle>
                <Icons.trendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.overview?.predictionUsagePercentage || 0}%
                </div>
                <Progress value={analytics.overview?.predictionUsagePercentage || 0} className="mt-2" />
                <p className={`text-xs ${getUsageColor(analytics.overview?.predictionUsagePercentage || 0)}`}>
                  {analytics.overview?.predictionUsagePercentage || 0}% of limit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage Trends</CardTitle>
              <CardDescription>
                Your API calls and predictions over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="apiCalls" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="API Calls"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predictions" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Predictions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="teamApiCalls" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="Team API Calls"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="teamPredictions" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    name="Team Predictions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Icons.activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics.totalRequests || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Team: {formatNumber(analytics.totalTeamRequests || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <Icons.alert className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.errorRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Icons.clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45ms</div>
                <p className="text-xs text-muted-foreground">
                  P95: 120ms
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hourly Usage</CardTitle>
                <CardDescription>
                  API requests per hour (last 24 hours)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.hourlyUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#8884d8" 
                      fill="#8884d8"
                      name="Your Usage"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="teamUsage" 
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      name="Team Usage"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
                <CardDescription>
                  Most frequently used API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topEndpoints?.slice(0, 10)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="endpoint" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                <Icons.trendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(analytics.totalPredictions || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Team: {formatNumber(analytics.totalTeamPredictions || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
                <Icons.target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.averageAccuracy || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Icons.check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">96.5%</div>
                <p className="text-xs text-muted-foreground">
                  Predictions completed
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trend</CardTitle>
                <CardDescription>
                  Prediction accuracy over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.accuracyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#82ca9d" 
                      strokeWidth={3}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prediction Types</CardTitle>
                <CardDescription>
                  Distribution of prediction types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.typeDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Symbols</CardTitle>
              <CardDescription>
                Most requested stock symbols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topSymbols?.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="symbol" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                <Icons.users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTeams || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active teams
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Icons.user className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalMembers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all teams
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                <Icons.activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.teams?.reduce((sum, team) => sum + team.activeMembers, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  This week
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>
                API calls and predictions by team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.teams?.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{team.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {team.activeMembers} active members
                      </p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatNumber(team.apiCalls)}</p>
                        <p className="text-xs text-muted-foreground">API calls</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatNumber(team.predictions)}</p>
                        <p className="text-xs text-muted-foreground">Predictions</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Contributions</CardTitle>
              <CardDescription>
                Top contributors across all teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.members
                  ?.sort((a, b) => (b.apiCalls + b.predictions) - (a.apiCalls + a.predictions))
                  .slice(0, 10)
                  .map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <Badge variant="outline" className="mt-1">
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatNumber(member.apiCalls)}</p>
                          <p className="text-xs text-muted-foreground">API calls</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatNumber(member.predictions)}</p>
                          <p className="text-xs text-muted-foreground">Predictions</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}