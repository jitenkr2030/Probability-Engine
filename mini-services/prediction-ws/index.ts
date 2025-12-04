import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

const PORT = 3003

app.use(cors())
app.use(express.json())

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

interface PredictionUpdate {
  type: 'prediction_update' | 'new_prediction' | 'prediction_completed'
  data: Prediction | any
}

// Mock data generator
function generateMockPrediction(domain?: string): Prediction {
  const domains = ['financial', 'weather', 'traffic', 'energy', 'healthcare', 'energy_utilities', 'manufacturing', 'retail', 'agriculture', 'hr', 'telecom', 'sports', 'insurance', 'automotive']
  const selectedDomain = domain || domains[Math.floor(Math.random() * domains.length)]
  
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
    },
    healthcare: {
      title: 'Patient Risk Score',
      baseValue: 15,
      variance: 20
    },
    energy_utilities: {
      title: 'Utility Grid Load',
      baseValue: 8500,
      variance: 1000
    },
    manufacturing: {
      title: 'Equipment Failure Risk',
      baseValue: 25,
      variance: 30
    },
    retail: {
      title: 'Demand Probability',
      baseValue: 70,
      variance: 25
    },
    agriculture: {
      title: 'Crop Yield Probability',
      baseValue: 80,
      variance: 15
    },
    hr: {
      title: 'Employee Churn Risk',
      baseValue: 20,
      variance: 25
    },
    telecom: {
      title: 'Network Failure Risk',
      baseValue: 10,
      variance: 15
    },
    sports: {
      title: 'Game Outcome Probability',
      baseValue: 60,
      variance: 30
    },
    insurance: {
      title: 'Claim Risk Probability',
      baseValue: 15,
      variance: 20
    },
    automotive: {
      title: 'Accident Risk Probability',
      baseValue: 8,
      variance: 12
    }
  }

  const config = domainConfigs[selectedDomain as keyof typeof domainConfigs] || domainConfigs.financial
  const currentValue = config.baseValue + (Math.random() - 0.5) * config.variance
  const predictedChange = (Math.random() - 0.5) * config.variance * 0.1
  const predictedValue = currentValue + predictedChange

  return {
    id: Math.random().toString(36).substr(2, 9),
    domain: selectedDomain,
    title: config.title,
    currentValue: Number(currentValue.toFixed(2)),
    predictedValue: Number(predictedValue.toFixed(2)),
    confidence: Math.floor(Math.random() * 25) + 75, // 75-100%
    timeRemaining: 300,
    status: 'active' as const,
    timestamp: new Date().toISOString()
  }
}

// Store active predictions
const activePredictions: Map<string, Prediction> = new Map()

// Initialize with some predictions
function initializePredictions() {
  const domains = ['financial', 'weather', 'traffic', 'energy', 'healthcare', 'energy_utilities', 'manufacturing', 'retail', 'agriculture', 'hr', 'telecom', 'sports', 'insurance', 'automotive']
  domains.forEach(domain => {
    const prediction = generateMockPrediction(domain)
    activePredictions.set(prediction.id, prediction)
  })
}

// Broadcast prediction updates
function broadcastPredictionUpdate() {
  const predictions = Array.from(activePredictions.values())
  
  // Update time remaining and values
  predictions.forEach(prediction => {
    prediction.timeRemaining -= 1
    
    if (prediction.timeRemaining <= 0) {
      // Reset prediction
      prediction.timeRemaining = 300
      prediction.currentValue = prediction.predictedValue
      prediction.predictedValue = prediction.predictedValue + (Math.random() - 0.5) * 50
      prediction.confidence = Math.floor(Math.random() * 25) + 75
      prediction.timestamp = new Date().toISOString()
      
      // Broadcast completion
      io.emit('prediction_update', {
        type: 'prediction_completed',
        data: { ...prediction }
      })
    } else {
      // Small random fluctuation in predicted value
      prediction.predictedValue += (Math.random() - 0.5) * 2
    }
  })

  io.emit('prediction_update', {
    type: 'prediction_update',
    data: predictions
  })
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Send current predictions to new client
  socket.emit('prediction_update', {
    type: 'prediction_update',
    data: Array.from(activePredictions.values())
  })

  // Handle request for new prediction
  socket.on('request_prediction', (data) => {
    const { domain } = data
    const prediction = generateMockPrediction(domain)
    activePredictions.set(prediction.id, prediction)
    
    io.emit('prediction_update', {
      type: 'new_prediction',
      data: prediction
    })
  })

  // Handle custom prediction requests
  socket.on('custom_prediction', (data) => {
    const { domain, customData } = data
    const prediction = generateMockPrediction(domain)
    
    // Process custom data if provided
    if (customData) {
      console.log('Custom data received:', customData)
      // Here you would implement custom prediction logic
    }
    
    activePredictions.set(prediction.id, prediction)
    
    io.emit('prediction_update', {
      type: 'new_prediction',
      data: prediction
    })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeConnections: io.engine.clientsCount })
})

// Start server
server.listen(PORT, () => {
  console.log(`Prediction WebSocket service running on port ${PORT}`)
  initializePredictions()
  
  // Start broadcasting updates every second
  setInterval(broadcastPredictionUpdate, 1000)
})

export default app