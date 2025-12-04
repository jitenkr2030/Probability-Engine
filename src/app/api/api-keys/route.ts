import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error("API keys error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, permissions, rateLimit, burstLimit, expiresAt } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "API key name is required" }, { status: 400 })
    }

    // Check user's subscription limits
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!userSubscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 })
    }

    // Count existing API keys
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId: session.user.id, isActive: true }
    })

    // Check API key limits based on subscription plan
    const maxKeys = userSubscription.plan === "FREE" ? 1 : 
                   userSubscription.plan === "BASIC" ? 3 :
                   userSubscription.plan === "PROFESSIONAL" ? 10 : -1 // Unlimited for Enterprise

    if (maxKeys !== -1 && existingKeysCount >= maxKeys) {
      return NextResponse.json({ 
        error: "API key limit reached for your subscription plan" 
      }, { status: 400 })
    }

    // Generate API key
    const apiKey = `pk_${randomUUID().replace(/-/g, "")}`

    // Create API key
    const newApiKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        description,
        key: apiKey,
        permissions: permissions || {},
        rateLimit: rateLimit || userSubscription.apiCallsLimit,
        burstLimit: burstLimit || 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "API_KEY_CREATED",
        resource: "ApiKey",
        resourceId: newApiKey.id,
        metadata: {
          apiKeyName: name,
          rateLimit,
          expiresAt,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(newApiKey, { status: 201 })
  } catch (error) {
    console.error("API keys error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, name, description, permissions, rateLimit, burstLimit, isActive, expiresAt } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "API key ID is required" }, { status: 400 })
    }

    // Check if API key belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    // Update API key
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(permissions && { permissions }),
        ...(rateLimit && { rateLimit }),
        ...(burstLimit && { burstLimit }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "API_KEY_UPDATED",
        resource: "ApiKey",
        resourceId: id,
        metadata: {
          changes: { name, description, rateLimit, isActive, expiresAt },
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(updatedKey)
  } catch (error) {
    console.error("API keys error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "API key ID is required" }, { status: 400 })
    }

    // Check if API key belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    // Delete API key
    await prisma.apiKey.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "API_KEY_DELETED",
        resource: "ApiKey",
        resourceId: id,
        metadata: {
          apiKeyName: existingKey.name,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API keys error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}