import { NextRequest, NextResponse } from 'next/server'

interface Prediction {
  id: string
  domain: string
  title: string
  currentValue: number
  predictedValue: number
  confidence: number
  timeRemaining: number
  status: 'active' | 'completed' | 'failed'
  timestamp: string
}

interface PredictionHistory {
  id: string
  domain: string
  title: string
  predictedValue: number
  actualValue: number
  accuracy: number
  timestamp: string
}

interface AnalyticsData {
  totalPredictions: number
  averageConfidence: number
  successRate: number
  domainPerformance: Array<{
    domain: string
    accuracy: number
    totalPredictions: number
  }>
  hourlyAccuracy: Array<{
    hour: string
    accuracy: number
  }>
}

// Mock data generator
function generateMockPrediction(domain: string): Prediction {
  const domainConfigs = {
    financial: {
      title: 'S&P 500 Index',
      baseValue: 4750,
      variance: 100
    },
    weather: {
      title: 'Temperature Change',
      baseValue: 22,
      variance: 5
    },
    traffic: {
      title: 'Highway Congestion',
      baseValue: 65,
      variance: 20
    },
    energy: {
      title: 'Power Grid Load',
      baseValue: 8500,
      variance: 1000
    }
  }

  const config = domainConfigs[domain as keyof typeof domainConfigs] || domainConfigs.financial
  const currentValue = config.baseValue + (Math.random() - 0.5) * config.variance
  const predictedChange = (Math.random() - 0.5) * config.variance * 0.1
  const predictedValue = currentValue + predictedChange

  return {
    id: Math.random().toString(36).substr(2, 9),
    domain,
    title: config.title,
    currentValue: Number(currentValue.toFixed(2)),
    predictedValue: Number(predictedValue.toFixed(2)),
    confidence: Math.floor(Math.random() * 25) + 75, // 75-100%
    timeRemaining: 300,
    status: 'active' as const,
    timestamp: new Date().toISOString()
  }
}

function generateMockHistory(): PredictionHistory[] {
  const domains = ['financial', 'weather', 'traffic', 'energy']
  const history: PredictionHistory[] = []

  for (let i = 0; i < 20; i++) {
    const domain = domains[Math.floor(Math.random() * domains.length)]
    const domainConfigs = {
      financial: { title: 'S&P 500 Index', variance: 100 },
      weather: { title: 'Temperature Change', variance: 5 },
      traffic: { title: 'Highway Congestion', variance: 20 },
      energy: { title: 'Power Grid Load', variance: 1000 }
    }

    const config = domainConfigs[domain as keyof typeof domainConfigs]
    const predictedValue = config.baseValue + (Math.random() - 0.5) * config.variance
    const actualValue = predictedValue + (Math.random() - 0.5) * config.variance * 0.2
    const accuracy = Math.max(0, Math.min(100, 100 - Math.abs((actualValue - predictedValue) / predictedValue) * 100))

    history.push({
      id: Math.random().toString(36).substr(2, 9),
      domain,
      title: config.title,
      predictedValue: Number(predictedValue.toFixed(2)),
      actualValue: Number(actualValue.toFixed(2)),
      accuracy: Number(accuracy.toFixed(1)),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString() // Last 24 hours
    })
  }

  return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  const domain = searchParams.get('domain')

  try {
    switch (endpoint) {
      case 'predictions':
        const predictions = domain 
          ? Array.from({ length: 4 }, () => generateMockPrediction(domain))
          : ['financial', 'weather', 'traffic', 'energy'].map(d => generateMockPrediction(d))
        
        return NextResponse.json({ predictions })

      case 'history':
        const history = generateMockHistory()
        const filteredHistory = domain 
          ? history.filter(h => h.domain === domain)
          : history
        
        return NextResponse.json({ history: filteredHistory })

      case 'analytics':
        const allHistory = generateMockHistory()
        const domainStats = allHistory.reduce((acc, item) => {
          if (!acc[item.domain]) {
            acc[item.domain] = { total: 0, accuracySum: 0 }
          }
          acc[item.domain].total++
          acc[item.domain].accuracySum += item.accuracy
          return acc
        }, {} as Record<string, { total: number; accuracySum: number }>)

        const domainPerformance = Object.entries(domainStats).map(([domain, stats]) => ({
          domain,
          accuracy: stats.accuracySum / stats.total,
          totalPredictions: stats.total
        }))

        const hourlyAccuracy = Array.from({ length: 24 }, (_, i) => {
          const hour = i.toString().padStart(2, '0') + ':00'
          const hourHistory = allHistory.filter(h => 
            new Date(h.timestamp).getHours() === i
          )
          const accuracy = hourHistory.length > 0 
            ? hourHistory.reduce((sum, h) => sum + h.accuracy, 0) / hourHistory.length
            : 0
          
          return { hour, accuracy: Number(accuracy.toFixed(1)) }
        })

        const analytics: AnalyticsData = {
          totalPredictions: allHistory.length,
          averageConfidence: allHistory.reduce((sum, h) => sum + h.accuracy, 0) / allHistory.length,
          successRate: allHistory.filter(h => h.accuracy >= 75).length / allHistory.length * 100,
          domainPerformance,
          hourlyAccuracy
        }

        return NextResponse.json(analytics)

      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, customData } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const prediction = generateMockPrediction(domain)
    
    // Add any custom data processing if provided
    if (customData) {
      // Here you would process custom data for more accurate predictions
      console.log('Custom data received:', customData)
    }

    return NextResponse.json({ prediction })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}