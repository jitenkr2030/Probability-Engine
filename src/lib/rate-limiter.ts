import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  maxRequests?: number // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string // Custom key generator
}

export class RateLimiter {
  private options: Required<RateLimitOptions>

  constructor(options: RateLimitOptions = {}) {
    this.options = {
      windowMs: options.windowMs || 60 * 1000, // 1 minute
      maxRequests: options.maxRequests || 100,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
    }
  }

  private defaultKeyGenerator(req: NextRequest): string {
    // Try to get API key from headers
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "")
    
    if (apiKey) {
      return `api_key:${apiKey}`
    }

    // Fall back to IP address
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    return `ip:${ip}`
  }

  async check(req: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: Date
    limit: number
  }> {
    const key = this.options.keyGenerator(req)
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.options.windowMs)

    try {
      // Clean up old records
      await prisma.apiKeyRateLimit.deleteMany({
        where: {
          key,
          timestamp: {
            lt: windowStart,
          },
        },
      })

      // Count requests in current window
      const requestCount = await prisma.apiKeyRateLimit.count({
        where: {
          key,
          timestamp: {
            gte: windowStart,
          },
        },
      })

      const remaining = Math.max(0, this.options.maxRequests - requestCount)
      const allowed = requestCount < this.options.maxRequests

      // Record this request
      if (allowed) {
        await prisma.apiKeyRateLimit.create({
          data: {
            key,
            timestamp: now,
          },
        })
      }

      return {
        allowed,
        remaining,
        resetTime: new Date(now.getTime() + this.options.windowMs),
        limit: this.options.maxRequests,
      }
    } catch (error) {
      console.error("Rate limiter error:", error)
      // In case of database error, allow the request but log the error
      return {
        allowed: true,
        remaining: this.options.maxRequests,
        resetTime: new Date(Date.now() + this.options.windowMs),
        limit: this.options.maxRequests,
      }
    }
  }

  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const result = await this.check(req)

      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests",
            message: "Rate limit exceeded",
            retryAfter: Math.ceil(this.options.windowMs / 1000),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": result.limit.toString(),
              "X-RateLimit-Remaining": result.remaining.toString(),
              "X-RateLimit-Reset": result.resetTime.toISOString(),
              "Retry-After": Math.ceil(this.options.windowMs / 1000).toString(),
            },
          }
        )
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next()
      response.headers.set("X-RateLimit-Limit", result.limit.toString())
      response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
      response.headers.set("X-RateLimit-Reset", result.resetTime.toISOString())

      return null // Continue with the request
    }
  }
}

// API Key authentication middleware with pay-per-use support
export async function authenticateApiKey(req: NextRequest): Promise<{
  success: boolean
  apiKey?: any
  error?: string
  payPerUseInfo?: {
    availableBalance: number
    costPerPrediction: number
    canAfford: boolean
  }
}> {
  try {
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "")

    if (!apiKey) {
      return {
        success: false,
        error: "API key is required",
      }
    }

    // Find API key in database
    const apiKeyData = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          include: {
            subscription: true,
          },
        },
      },
    })

    if (!apiKeyData) {
      return {
        success: false,
        error: "Invalid API key",
      }
    }

    // Check if API key is active
    if (!apiKeyData.isActive) {
      return {
        success: false,
        error: "API key is inactive",
      }
    }

    // Check if API key is expired
    if (apiKeyData.expiresAt && new Date() > apiKeyData.expiresAt) {
      return {
        success: false,
        error: "API key has expired",
      }
    }

    // Check user subscription status
    if (apiKeyData.user.subscription?.status !== "ACTIVE") {
      return {
        success: false,
        error: "User subscription is inactive",
      }
    }

    // Check pay-per-use balance for prediction requests
    const url = new URL(req.url!)
    const isPredictionRequest = url.pathname.includes("/predictions") || url.pathname.includes("/domain-predictions")
    
    let payPerUseInfo: any = undefined
    
    if (isPredictionRequest) {
      // Get prediction type from request
      const predictionType = url.searchParams.get("type") || "basic"
      
      // Check balance via billing API
      try {
        const billingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/billing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            action: "check_balance",
            predictionType,
            quantity: 1,
          }),
        })

        if (billingResponse.ok) {
          const billingData = await billingResponse.json()
          payPerUseInfo = {
            availableBalance: billingData.availableBalance,
            costPerPrediction: billingData.costPerPrediction,
            canAfford: billingData.canAfford,
          }

          if (!billingData.canAfford && billingData.availableBalance !== -1) {
            return {
              success: false,
              error: "Insufficient balance for this request",
              payPerUseInfo,
            }
          }
        }
      } catch (error) {
        console.error("Error checking pay-per-use balance:", error)
        // Continue with authentication even if billing check fails
      }
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyData.id },
      data: { lastUsedAt: new Date() },
    })

    // Increment usage count
    await prisma.apiKey.update({
      where: { id: apiKeyData.id },
      data: { usageCount: { increment: 1 } },
    })

    return {
      success: true,
      apiKey: apiKeyData,
      payPerUseInfo,
    }
  } catch (error) {
    console.error("API key authentication error:", error)
    return {
      success: false,
      error: "Authentication failed",
    }
  }
}

// Create rate limiters for different tiers
export const rateLimiters = {
  free: new RateLimiter({ maxRequests: 60, windowMs: 60 * 1000 }), // 60 requests per minute
  basic: new RateLimiter({ maxRequests: 600, windowMs: 60 * 1000 }), // 600 requests per minute
  professional: new RateLimiter({ maxRequests: 6000, windowMs: 60 * 1000 }), // 6000 requests per minute
  enterprise: new RateLimiter({ maxRequests: -1 }), // Unlimited
}

// Middleware factory for API routes with authentication and rate limiting
export function createApiHandler(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context: any): Promise<NextResponse> => {
    try {
      // Authenticate API key
      const auth = await authenticateApiKey(req)
      if (!auth.success) {
        return new NextResponse(
          JSON.stringify({ 
            error: auth.error,
            payPerUseInfo: auth.payPerUseInfo 
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      // Get user's subscription plan
      const plan = auth.apiKey.user.subscription?.plan || "FREE"

      // Apply rate limiting
      let rateLimiter: RateLimiter
      switch (plan) {
        case "BASIC":
          rateLimiter = rateLimiters.basic
          break
        case "PROFESSIONAL":
          rateLimiter = rateLimiters.professional
          break
        case "ENTERPRISE":
          rateLimiter = rateLimiters.enterprise
          break
        default:
          rateLimiter = rateLimiters.free
      }

      // Check rate limit
      const rateLimitResult = await rateLimiter.check(req)
      if (!rateLimitResult.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests",
            message: "Rate limit exceeded",
            retryAfter: Math.ceil(rateLimiters.free.options.windowMs / 1000),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": rateLimitResult.limit.toString(),
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
              "X-RateLimit-Reset": rateLimitResult.resetTime.toISOString(),
              "Retry-After": Math.ceil(rateLimiters.free.options.windowMs / 1000).toString(),
            },
          }
        )
      }

      // Add user context to the request
      const contextWithUser = {
        ...context,
        user: auth.apiKey.user,
        apiKey: auth.apiKey,
        payPerUseInfo: auth.payPerUseInfo,
      }

      // Call the original handler
      const response = await handler(req, contextWithUser)

      // Process pay-per-use billing for successful prediction requests
      const url = new URL(req.url!)
      const isPredictionRequest = url.pathname.includes("/predictions") || url.pathname.includes("/domain-predictions")
      
      if (isPredictionRequest && response.status === 200 && auth.payPerUseInfo) {
        try {
          // Process the usage for billing
          await fetch(`${process.env.NEXTAUTH_URL}/api/billing`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${auth.apiKey.key}`,
            },
            body: JSON.stringify({
              action: "process_usage",
              predictionType: url.searchParams.get("type") || "basic",
              quantity: 1,
            }),
          })
        } catch (error) {
          console.error("Error processing pay-per-use billing:", error)
          // Don't fail the request, just log the error
        }
      }

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString())
      response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())
      response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toISOString())

      return response
    } catch (error) {
      console.error("API handler error:", error)
      return new NextResponse(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
  }
}