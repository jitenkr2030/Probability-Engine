'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, Zap, Activity, Target, Brain, Clock, AlertCircle } from 'lucide-react'

interface AIPrediction {
  value: number
  confidence: number
  reasoning: string
  factors: string[]
}

interface DomainPrediction {
  prediction: AIPrediction
  timestamp: string
  domain: string
}

export function AIPredictionPanel() {
  const [selectedDomain, setSelectedDomain] = useState<string>('financial')
  const [customData, setCustomData] = useState<string>('')
  const [prediction, setPrediction] = useState<DomainPrediction | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const domainConfigs = {
    financial: {
      title: 'Financial Market Prediction',
      description: 'AI-powered financial market predictions for the next 5 minutes',
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      placeholder: 'Enter market data (optional): e.g., {"currentPrice": 4750, "volume": "high", "trend": "bullish"}',
      unit: 'points'
    },
    weather: {
      title: 'Weather Prediction',
      description: 'AI-powered weather predictions for the next 5 minutes',
      icon: <Zap className="h-5 w-5 text-blue-600" />,
      placeholder: 'Enter weather data (optional): e.g., {"currentTemp": 22, "humidity": 65, "windSpeed": 10}',
      unit: '°C'
    },
    traffic: {
      title: 'Traffic Prediction',
      description: 'AI-powered traffic congestion predictions for the next 5 minutes',
      icon: <Activity className="h-5 w-5 text-orange-600" />,
      placeholder: 'Enter traffic data (optional): e.g., {"currentFlow": 65, "timeOfDay": "rush", "roadCapacity": 100}',
      unit: '%'
    },
    energy: {
      title: 'Energy Grid Prediction',
      description: 'AI-powered energy grid load predictions for the next 5 minutes',
      icon: <Target className="h-5 w-5 text-purple-600" />,
      placeholder: 'Enter energy data (optional): e.g., {"currentLoad": 8500, "demand": "peak", "capacity": 10000}',
      unit: 'MW'
    },
    healthcare: {
      title: 'Healthcare Risk Prediction',
      description: 'AI-powered healthcare risk predictions for the next 5 minutes',
      icon: <Activity className="h-5 w-5 text-red-600" />,
      placeholder: 'Enter patient data (optional): e.g., {"vitals": {"heartRate": 75, "bloodPressure": "120/80"}, "age": 45}',
      unit: 'risk score'
    },
    energy_utilities: {
      title: 'Energy Utilities Prediction',
      description: 'AI-powered energy utilities predictions for the next 5 minutes',
      icon: <Zap className="h-5 w-5 text-yellow-600" />,
      placeholder: 'Enter utility data (optional): e.g., {"gridLoad": 8500, "outageRisk": "low", "maintenance": "scheduled"}',
      unit: 'MW'
    },
    manufacturing: {
      title: 'Manufacturing Prediction',
      description: 'AI-powered manufacturing predictions for the next 5 minutes',
      icon: <Target className="h-5 w-5 text-gray-600" />,
      placeholder: 'Enter manufacturing data (optional): e.g., {"equipmentStatus": "normal", "productionRate": 85, "quality": "high"}',
      unit: 'risk %'
    },
    retail: {
      title: 'Retail & E-Commerce Prediction',
      description: 'AI-powered retail predictions for the next 5 minutes',
      icon: <TrendingUp className="h-5 w-5 text-pink-600" />,
      placeholder: 'Enter retail data (optional): e.g., {"currentSales": 150, "traffic": "high", "inventory": 1000}',
      unit: 'demand %'
    },
    agriculture: {
      title: 'Agriculture Prediction',
      description: 'AI-powered agriculture predictions for the next 5 minutes',
      icon: <Target className="h-5 w-5 text-green-700" />,
      placeholder: 'Enter agriculture data (optional): e.g., {"soilMoisture": 65, "temperature": 25, "cropHealth": "good"}',
      unit: 'yield %'
    },
    hr: {
      title: 'HR & Workforce Prediction',
      description: 'AI-powered HR predictions for the next 5 minutes',
      icon: <Activity className="h-5 w-5 text-indigo-600" />,
      placeholder: 'Enter HR data (optional): e.g., {"employeeSatisfaction": 8.5, "turnoverRate": 5, "productivity": 90}',
      unit: 'risk %'
    },
    telecom: {
      title: 'Telecommunications Prediction',
      description: 'AI-powered telecom predictions for the next 5 minutes',
      icon: <Zap className="h-5 w-5 text-cyan-600" />,
      placeholder: 'Enter telecom data (optional): e.g., {"networkLoad": 75, "outageRisk": "low", "customerSatisfaction": 8.2}',
      unit: 'failure %'
    },
    sports: {
      title: 'Sports & Gaming Prediction',
      description: 'AI-powered sports predictions for the next 5 minutes',
      icon: <Target className="h-5 w-5 text-orange-700" />,
      placeholder: 'Enter sports data (optional): e.g., {"gameScore": {"home": 2, "away": 1}, "timeRemaining": "15:00"}',
      unit: 'probability %'
    },
    insurance: {
      title: 'Insurance Prediction',
      description: 'AI-powered insurance predictions for the next 5 minutes',
      icon: <Activity className="h-5 w-5 text-blue-700" />,
      placeholder: 'Enter insurance data (optional): e.g., {"policyType": "auto", "riskFactors": ["age", "drivingRecord"], "claimHistory": "clean"}',
      unit: 'risk %'
    },
    automotive: {
      title: 'Automotive & Mobility Prediction',
      description: 'AI-powered automotive predictions for the next 5 minutes',
      icon: <Target className="h-5 w-5 text-red-700" />,
      placeholder: 'Enter automotive data (optional): e.g., {"vehicleSpeed": 65, "roadConditions": "clear", "driverBehavior": "normal"}',
      unit: 'risk %'
    }
  }

  const generatePrediction = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const customParameters = customData ? JSON.parse(customData) : {}
      
      const response = await fetch('/api/domain-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: selectedDomain,
          customParameters
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate prediction')
      }

      const result = await response.json()
      setPrediction(result)
    } catch (err) {
      console.error('Prediction error:', err)
      setError('Failed to generate prediction. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500'
    if (confidence >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Prediction Engine
          </CardTitle>
          <CardDescription>
            Generate sophisticated predictions using advanced AI models for each domain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="domain-select">Select Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select prediction domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial Markets</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="traffic">Traffic</SelectItem>
                  <SelectItem value="energy">Energy Grid</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="energy_utilities">Energy Utilities</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="retail">Retail & E-Commerce</SelectItem>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="hr">HR & Workforce</SelectItem>
                  <SelectItem value="telecom">Telecommunications</SelectItem>
                  <SelectItem value="sports">Sports & Gaming</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="automotive">Automotive & Mobility</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generatePrediction} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Prediction
                  </>
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="custom-data">Custom Data (Optional)</Label>
            <Textarea
              id="custom-data"
              placeholder={domainConfigs[selectedDomain as keyof typeof domainConfigs].placeholder}
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {prediction && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {domainConfigs[prediction.domain as keyof typeof domainConfigs].icon}
                <CardTitle>{domainConfigs[prediction.domain as keyof typeof domainConfigs].title}</CardTitle>
              </div>
              <Badge variant="outline">
                {new Date(prediction.timestamp).toLocaleString()}
              </Badge>
            </div>
            <CardDescription>
              AI-generated prediction for the next 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Prediction Result</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Predicted Value:</span>
                      <span className="text-2xl font-bold">
                        {prediction.prediction.value.toLocaleString()} {domainConfigs[prediction.domain as keyof typeof domainConfigs].unit}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confidence Level:</span>
                        <span className={`font-medium ${getConfidenceColor(prediction.prediction.confidence)}`}>
                          {prediction.prediction.confidence}%
                        </span>
                      </div>
                      <Progress value={prediction.prediction.confidence} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Reasoning</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {prediction.prediction.reasoning}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Key Factors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {prediction.prediction.factors.map((factor, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                    <div className={`w-2 h-2 rounded-full ${getConfidenceBgColor(prediction.prediction.confidence)}`} />
                    <span className="text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">
                This prediction was generated using advanced AI models analyzing multiple data sources and patterns.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Domain Capabilities</CardTitle>
          <CardDescription>
            Overview of AI prediction capabilities for each domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="financial" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="weather">Weather</TabsTrigger>
              <TabsTrigger value="traffic">Traffic</TabsTrigger>
              <TabsTrigger value="energy">Energy</TabsTrigger>
              <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
              <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
              <TabsTrigger value="retail">Retail</TabsTrigger>
            </TabsList>
            
            <TabsContent value="financial" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Market price feeds</li>
                    <li>• Trading volume data</li>
                    <li>• Technical indicators</li>
                    <li>• Market sentiment analysis</li>
                    <li>• Economic news feeds</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Time series analysis</li>
                    <li>• Machine learning algorithms</li>
                    <li>• Sentiment analysis</li>
                    <li>• Pattern recognition</li>
                    <li>• Risk assessment models</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="weather" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Weather station data</li>
                    <li>• Satellite imagery</li>
                    <li>• Atmospheric pressure</li>
                    <li>• Humidity sensors</li>
                    <li>• Wind pattern analysis</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Meteorological algorithms</li>
                    <li>• Climate pattern recognition</li>
                    <li>• Atmospheric modeling</li>
                    <li>• Historical weather patterns</li>
                    <li>• Real-time sensor fusion</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="traffic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Traffic camera feeds</li>
                    <li>• Vehicle sensors</li>
                    <li>• GPS navigation data</li>
                    <li>• Road capacity information</li>
                    <li>• Historical traffic patterns</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Traffic flow algorithms</li>
                    <li>• Congestion prediction</li>
                    <li>• Route optimization</li>
                    <li>• Incident impact analysis</li>
                    <li>• Real-time traffic simulation</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="energy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Smart grid sensors</li>
                    <li>• Power consumption data</li>
                    <li>• Generation capacity</li>
                    <li>• Weather-dependent demand</li>
                    <li>• Historical load patterns</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Load forecasting algorithms</li>
                    <li>• Demand response modeling</li>
                    <li>• Renewable energy integration</li>
                    <li>• Grid stability analysis</li>
                    <li>• Peak demand prediction</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="healthcare" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Electronic Health Records</li>
                    <li>• Real-time vital monitoring</li>
                    <li>• Medical device data</li>
                    <li>• Patient history</li>
                    <li>• Clinical lab results</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Patient risk scoring</li>
                    <li>• Early warning systems</li>
                    <li>• Treatment outcome prediction</li>
                    <li>• Disease progression models</li>
                    <li>• Readmission risk analysis</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manufacturing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• IoT sensor networks</li>
                    <li>• PLC and SCADA systems</li>
                    <li>• Production line data</li>
                    <li>• Quality control metrics</li>
                    <li>• Equipment maintenance logs</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Predictive maintenance</li>
                    <li>• Quality defect prediction</li>
                    <li>• Equipment failure analysis</li>
                    <li>• Production yield optimization</li>
                    <li>• Supply chain risk assessment</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="retail" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Point of Sale systems</li>
                    <li>• E-commerce analytics</li>
                    <li>• Customer behavior data</li>
                    <li>• Inventory levels</li>
                    <li>• Market trend analysis</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Prediction Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Demand forecasting</li>
                    <li>• Customer churn prediction</li>
                    <li>• Conversion probability</li>
                    <li>• Stockout risk analysis</li>
                    <li>• Personalized recommendations</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}