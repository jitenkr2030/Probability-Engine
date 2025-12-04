'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity, Zap, Target, AlertTriangle, CheckCircle } from 'lucide-react'

interface PredictionData {
  time: string
  actual: number | null
  predicted: number
}

interface ConfidenceData {
  confidence: string
  count: number
  fill: string
}

interface DomainPerformance {
  domain: string
  accuracy: number
  fill: string
}

interface RealTimePredictionProps {
  title: string
  domain: string
  currentValue: number
  predictedValue: number
  confidence: number
  timeRemaining: number
  data: PredictionData[]
}

interface ConfidenceGaugeProps {
  confidence: number
  size?: number
}

interface DomainPerformanceChartProps {
  data: DomainPerformance[]
}

interface PredictionTrendProps {
  data: PredictionData[]
  title: string
  unit?: string
}

export function RealTimePrediction({ 
  title, 
  domain, 
  currentValue, 
  predictedValue, 
  confidence, 
  timeRemaining, 
  data 
}: RealTimePredictionProps) {
  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'financial':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'weather':
        return <Zap className="h-5 w-5 text-blue-600" />
      case 'traffic':
        return <Activity className="h-5 w-5 text-orange-600" />
      case 'energy':
        return <Target className="h-5 w-5 text-purple-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500'
    if (confidence >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const trend = predictedValue > currentValue ? 'up' : predictedValue < currentValue ? 'down' : 'stable'
  const trendPercentage = Math.abs(((predictedValue - currentValue) / currentValue) * 100)

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getDomainIcon(domain)}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant="outline">{domain}</Badge>
        </div>
        <CardDescription>Next 5-minute prediction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-2xl font-bold">{currentValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Predicted Value</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-blue-600">{predictedValue.toLocaleString()}</p>
              {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Actual"
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#dc2626" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Confidence</span>
            <span>{confidence}%</span>
          </div>
          <Progress value={confidence} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Time Remaining</span>
            <span>{formatTime(timeRemaining)}</span>
          </div>
          <Progress value={(timeRemaining / 300) * 100} className="h-2" />
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getConfidenceColor(confidence)}`} />
          <span className="text-sm text-muted-foreground">
            {confidence >= 90 ? 'High Confidence' : 
             confidence >= 75 ? 'Medium Confidence' : 'Low Confidence'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConfidenceGauge({ confidence, size = 120 }: ConfidenceGaugeProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return '#22c55e'
    if (confidence >= 75) return '#eab308'
    return '#ef4444'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'High'
    if (confidence >= 75) return 'Medium'
    return 'Low'
  }

  const strokeWidth = size * 0.1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (confidence / 100) * circumference

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getConfidenceColor(confidence)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{confidence}%</div>
            <div className="text-xs text-muted-foreground">{getConfidenceLabel(confidence)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DomainPerformanceChart({ data }: DomainPerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Performance</CardTitle>
        <CardDescription>Success rate by prediction domain</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="domain" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="accuracy" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function PredictionTrend({ data, title, unit = '' }: PredictionTrendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Historical prediction accuracy</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}${unit}`, 'Value']} />
            <Area 
              type="monotone" 
              dataKey="actual" 
              stackId="1"
              stroke="#2563eb" 
              fill="#2563eb"
              fillOpacity={0.6}
              name="Actual"
            />
            <Area 
              type="monotone" 
              dataKey="predicted" 
              stackId="2"
              stroke="#dc2626" 
              fill="#dc2626"
              fillOpacity={0.6}
              name="Predicted"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function PredictionHeatmap({ data }: { data: Array<{ time: string; accuracy: number }> }) {
  const getHeatColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-500'
    if (accuracy >= 75) return 'bg-yellow-500'
    if (accuracy >= 60) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prediction Accuracy Heatmap</CardTitle>
        <CardDescription>Hourly accuracy over the last 24 hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-1">
          {data.map((item, index) => (
            <div
              key={index}
              className={`h-8 rounded ${getHeatColor(item.accuracy)} flex items-center justify-center text-xs text-white font-medium`}
              title={`${item.time}: ${item.accuracy}%`}
            >
              {item.accuracy}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Low (&lt;60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Medium (60-75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Good (75-90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Excellent (&gt;90%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}