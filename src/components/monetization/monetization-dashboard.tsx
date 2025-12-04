"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts"
import { toast } from "sonner"
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"

interface MonetizationData {
  overview?: {
    totalRevenue: number
    monthlyRecurringRevenue: number
    averageRevenuePerUser: number
    customerLifetimeValue: number
    churnRate: number
    conversionRate: number
  }
  subscriptionRevenue?: {
    basic: { users: number; revenue: number; growth: number }
    professional: { users: number; revenue: number; growth: number }
    enterprise: { users: number; revenue: number; growth: number }
    free: { users: number; conversions: number }
  }
  apiRevenue?: {
    basicPredictions: { calls: number; revenue: number }
    advancedPredictions: { calls: number; revenue: number }
    institutionalPredictions: { calls: number; revenue: number }
    bulkDiscounts: { amount: number; count: number }
  }
  partnershipRevenue?: {
    brokerage: { partners: number; revenue: number; growth: number }
    media: { partners: number; revenue: number; growth: number }
    dataProvider: { partners: number; revenue: number; growth: number }
    tradingPlatform: { partners: number; revenue: number; growth: number }
  }
  dataMonetization?: {
    marketData: { sales: number; revenue: number }
    predictions: { sales: number; revenue: number }
    analytics: { sales: number; revenue: number }
    historical: { sales: number; revenue: number }
  }
  tradingRevenue?: {
    perTradeFees: { trades: number; revenue: number }
    successBonuses: { amount: number; count: number }
    integrationFees: { revenue: number; activeIntegrations: number }
  }
  revenueTrends?: Array<{
    date: string
    subscription: number
    api: number
    partnerships: number
    data: number
    trading: number
    total: number
  }>
  customerAcquisition?: Array<{
    channel: string
    cost: number
    customers: number
    cac: number
    ltv: number
    roi: number
  }>
  forecast?: {
    nextMonth: number
    nextQuarter: number
    nextYear: number
    confidence: number
    drivers: string[]
  }
  topCustomers?: Array<{
    id: string
    name: string
    plan: string
    revenue: number
    growth: number
    ltv: number
  }>
}

interface MonetizationDashboardProps {
  userId: string
  userRole?: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function MonetizationDashboard({ userId, userRole }: MonetizationDashboardProps) {
  const { data: session } = useSession()
  const [monetizationData, setMonetizationData] = useState<MonetizationData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [selectedView, setSelectedView] = useState("overview")

  useEffect(() => {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      fetchMonetizationData()
    }
  }, [selectedPeriod, selectedView, userRole])

  const fetchMonetizationData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/monetization?period=${selectedPeriod}&view=${selectedView}`)
      const data = await response.json()
      
      if (response.ok) {
        setMonetizationData(data)
      } else {
        toast.error("Failed to load monetization data")
      }
    } catch (error) {
      toast.error("An error occurred while fetching monetization data")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + "%"
  }

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icons.shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-muted-foreground text-center mb-4">
            Monetization dashboard is only available to administrators.
          </p>
        </CardContent>
      </Card>
    )
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monetization Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive revenue analytics and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <Button variant="outline" onClick={fetchMonetizationData}>
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {monetizationData.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Icons.trendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monetizationData.overview.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                All revenue streams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <Icons.activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monetizationData.overview.monthlyRecurringRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Monthly recurring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ARPU</CardTitle>
              <Icons.user className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monetizationData.overview.averageRevenuePerUser)}</div>
              <p className="text-xs text-muted-foreground">
                Avg. revenue per user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTV</CardTitle>
              <Icons.crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monetizationData.overview.customerLifetimeValue)}</div>
              <p className="text-xs text-muted-foreground">
                Lifetime value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <Icons.alert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(monetizationData.overview.churnRate)}</div>
              <p className="text-xs text-muted-foreground">
                Customer churn
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion</CardTitle>
              <Icons.target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(monetizationData.overview.conversionRate)}</div>
              <p className="text-xs text-muted-foreground">
                Free to paid
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="api">API Revenue</TabsTrigger>
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
          <TabsTrigger value="data">Data Sales</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Trends Chart */}
          {monetizationData.revenueTrends && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Revenue breakdown by stream over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={monetizationData.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="subscription" stackId="1" stroke="#0088FE" fill="#0088FE" name="Subscriptions" />
                    <Area type="monotone" dataKey="api" stackId="1" stroke="#00C49F" fill="#00C49F" name="API" />
                    <Area type="monotone" dataKey="partnerships" stackId="1" stroke="#FFBB28" fill="#FFBB28" name="Partnerships" />
                    <Area type="monotone" dataKey="data" stackId="1" stroke="#FF8042" fill="#FF8042" name="Data Sales" />
                    <Area type="monotone" dataKey="trading" stackId="1" stroke="#8884D8" fill="#8884D8" name="Trading" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monetizationData.subscriptionRevenue && (
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Revenue</CardTitle>
                  <CardDescription>Revenue by subscription tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Basic", value: monetizationData.subscriptionRevenue.basic.revenue },
                          { name: "Professional", value: monetizationData.subscriptionRevenue.professional.revenue },
                          { name: "Enterprise", value: monetizationData.subscriptionRevenue.enterprise.revenue },
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
                          { name: "Basic", value: monetizationData.subscriptionRevenue.basic.revenue },
                          { name: "Professional", value: monetizationData.subscriptionRevenue.professional.revenue },
                          { name: "Enterprise", value: monetizationData.subscriptionRevenue.enterprise.revenue },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {monetizationData.customerAcquisition && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Acquisition</CardTitle>
                  <CardDescription>Cost and ROI by channel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monetizationData.customerAcquisition.map((channel, index) => (
                      <div key={channel.channel} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{channel.channel}</p>
                            <p className="text-sm text-muted-foreground">
                              CAC: {formatCurrency(channel.cac)} | LTV: {formatCurrency(channel.ltv)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={channel.roi > 1 ? "default" : "secondary"}>
                            ROI: {formatPercentage(channel.roi)}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {channel.customers} customers
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Customers */}
          {monetizationData.topCustomers && (
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Highest revenue generating customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monetizationData.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.plan} | LTV: {formatCurrency(customer.ltv)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(customer.revenue)}</p>
                        <p className="text-sm text-green-600">
                          +{formatPercentage(customer.growth)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          {monetizationData.subscriptionRevenue && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Tier</CardTitle>
                  <CardDescription>$29/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{formatNumber(monetizationData.subscriptionRevenue.basic.users)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.subscriptionRevenue.basic.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.subscriptionRevenue.basic.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.subscriptionRevenue.basic.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Professional Tier</CardTitle>
                  <CardDescription>$99/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{formatNumber(monetizationData.subscriptionRevenue.professional.users)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.subscriptionRevenue.professional.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.subscriptionRevenue.professional.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.subscriptionRevenue.professional.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enterprise Tier</CardTitle>
                  <CardDescription>$499/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{formatNumber(monetizationData.subscriptionRevenue.enterprise.users)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.subscriptionRevenue.enterprise.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.subscriptionRevenue.enterprise.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.subscriptionRevenue.enterprise.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Free Tier</CardTitle>
                  <CardDescription>Conversion funnel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{formatNumber(monetizationData.subscriptionRevenue.free.users)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversions:</span>
                      <span className="font-medium">{formatNumber(monetizationData.subscriptionRevenue.free.conversions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate:</span>
                      <span className="font-medium text-green-600">
                        {formatPercentage(monetizationData.subscriptionRevenue.free.conversions / monetizationData.subscriptionRevenue.free.users)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          {monetizationData.apiRevenue && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Predictions</CardTitle>
                  <CardDescription>$0.01 per call</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Calls:</span>
                      <span className="font-medium">{formatNumber(monetizationData.apiRevenue.basicPredictions.calls)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.apiRevenue.basicPredictions.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Advanced Predictions</CardTitle>
                  <CardDescription>$0.05 per call</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Calls:</span>
                      <span className="font-medium">{formatNumber(monetizationData.apiRevenue.advancedPredictions.calls)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.apiRevenue.advancedPredictions.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Institutional</CardTitle>
                  <CardDescription>$0.10 per call</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Calls:</span>
                      <span className="font-medium">{formatNumber(monetizationData.apiRevenue.institutionalPredictions.calls)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.apiRevenue.institutionalPredictions.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bulk Discounts</CardTitle>
                  <CardDescription>Volume discounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Discounts:</span>
                      <span className="font-medium">{formatNumber(monetizationData.apiRevenue.bulkDiscounts.count)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.apiRevenue.bulkDiscounts.amount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="partnerships" className="space-y-6">
          {monetizationData.partnershipRevenue && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Brokerage</CardTitle>
                  <CardDescription>Trading platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Partners:</span>
                      <span className="font-medium">{formatNumber(monetizationData.partnershipRevenue.brokerage.partners)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.partnershipRevenue.brokerage.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.partnershipRevenue.brokerage.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.partnershipRevenue.brokerage.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Media</CardTitle>
                  <CardDescription>Financial media</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Partners:</span>
                      <span className="font-medium">{formatNumber(monetizationData.partnershipRevenue.media.partners)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.partnershipRevenue.media.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.partnershipRevenue.media.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.partnershipRevenue.media.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Providers</CardTitle>
                  <CardDescription>Market data vendors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Partners:</span>
                      <span className="font-medium">{formatNumber(monetizationData.partnershipRevenue.dataProvider.partners)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.partnershipRevenue.dataProvider.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.partnershipRevenue.dataProvider.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.partnershipRevenue.dataProvider.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trading Platforms</CardTitle>
                  <CardDescription>API integrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Partners:</span>
                      <span className="font-medium">{formatNumber(monetizationData.partnershipRevenue.tradingPlatform.partners)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.partnershipRevenue.tradingPlatform.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className={`font-medium ${monetizationData.partnershipRevenue.tradingPlatform.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(monetizationData.partnershipRevenue.tradingPlatform.growth)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {monetizationData.dataMonetization && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Data</CardTitle>
                  <CardDescription>Real-time data feeds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sales:</span>
                      <span className="font-medium">{formatNumber(monetizationData.dataMonetization.marketData.sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.dataMonetization.marketData.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Predictions</CardTitle>
                  <CardDescription>AI model outputs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sales:</span>
                      <span className="font-medium">{formatNumber(monetizationData.dataMonetization.predictions.sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.dataMonetization.predictions.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analytics</CardTitle>
                  <CardDescription>Market insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sales:</span>
                      <span className="font-medium">{formatNumber(monetizationData.dataMonetization.analytics.sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.dataMonetization.analytics.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historical</CardTitle>
                  <CardDescription>Archive data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sales:</span>
                      <span className="font-medium">{formatNumber(monetizationData.dataMonetization.historical.sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">{formatCurrency(monetizationData.dataMonetization.historical.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          {monetizationData.forecast && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Next Month</CardTitle>
                  <CardDescription>Revenue forecast</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(monetizationData.forecast.nextMonth)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {formatPercentage(monetizationData.forecast.confidence)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Next Quarter</CardTitle>
                  <CardDescription>Revenue forecast</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(monetizationData.forecast.nextQuarter)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {formatPercentage(monetizationData.forecast.confidence * 0.9)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Next Year</CardTitle>
                  <CardDescription>Revenue forecast</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {formatCurrency(monetizationData.forecast.nextYear)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {formatPercentage(monetizationData.forecast.confidence * 0.8)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {monetizationData.forecast && (
            <Card>
              <CardHeader>
                <CardTitle>Growth Drivers</CardTitle>
                <CardDescription>Key factors driving revenue growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monetizationData.forecast.drivers.map((driver, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Icons.target className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{driver}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}