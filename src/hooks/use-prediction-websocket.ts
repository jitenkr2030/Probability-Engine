'use client'

import { useEffect, useRef, useState } from 'react'

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
  data: Prediction | Prediction[]
}

export function usePredictionWebSocket() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<any>(null)

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        // Dynamically import socket.io-client
        const { io } = await import('socket.io-client')
        
        socketRef.current = io('/?XTransformPort=3003', {
          transports: ['websocket', 'polling']
        })

        socketRef.current.on('connect', () => {
          console.log('Connected to prediction WebSocket')
          setIsConnected(true)
        })

        socketRef.current.on('disconnect', () => {
          console.log('Disconnected from prediction WebSocket')
          setIsConnected(false)
        })

        socketRef.current.on('prediction_update', (update: PredictionUpdate) => {
          switch (update.type) {
            case 'prediction_update':
              if (Array.isArray(update.data)) {
                setPredictions(update.data)
              }
              break
            case 'new_prediction':
              if (!Array.isArray(update.data)) {
                setPredictions(prev => [...prev, update.data])
              }
              break
            case 'prediction_completed':
              if (!Array.isArray(update.data)) {
                setPredictions(prev => 
                  prev.map(p => p.id === update.data.id ? update.data : p)
                )
              }
              break
          }
        })

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
        setIsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const requestPrediction = (domain: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('request_prediction', { domain })
    }
  }

  const sendCustomPrediction = (domain: string, customData: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('custom_prediction', { domain, customData })
    }
  }

  return {
    predictions,
    isConnected,
    requestPrediction,
    sendCustomPrediction
  }
}