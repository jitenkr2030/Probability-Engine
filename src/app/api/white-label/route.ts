import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { writeFile } from "fs/promises"
import { join } from "path"
import { mkdir } from "fs/promises"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has enterprise subscription
    if (session.user.subscription?.plan !== "ENTERPRISE") {
      return NextResponse.json({ error: "Enterprise subscription required" }, { status: 403 })
    }

    const whiteLabel = await prisma.whiteLabel.findUnique({
      where: { userId: session.user.id }
    })

    return NextResponse.json(whiteLabel || {})
  } catch (error) {
    console.error("White-label API error:", error)
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

    // Check if user has enterprise subscription
    if (session.user.subscription?.plan !== "ENTERPRISE") {
      return NextResponse.json({ error: "Enterprise subscription required" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type")

    if (contentType?.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData()
      const logo = formData.get("logo") as File
      const favicon = formData.get("favicon") as File
      
      const updateData: any = {
        companyName: formData.get("companyName") as string,
        primaryColor: formData.get("primaryColor") as string,
        secondaryColor: formData.get("secondaryColor") as string,
        accentColor: formData.get("accentColor") as string,
        customDomain: formData.get("customDomain") as string,
        customCSS: formData.get("customCSS") as string,
        customJS: formData.get("customJS") as string,
        hideBranding: formData.get("hideBranding") === "true",
        customFooter: formData.get("customFooter") as string,
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "public", "uploads", "white-label")
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch (error) {
        // Directory already exists
      }

      // Handle logo upload
      if (logo && logo.size > 0) {
        const logoBytes = await logo.arrayBuffer()
        const logoBuffer = Buffer.from(logoBytes)
        const logoFileName = `${session.user.id}_logo_${Date.now()}.${logo.name.split('.').pop()}`
        const logoPath = join(uploadsDir, logoFileName)
        await writeFile(logoPath, logoBuffer)
        updateData.logo = `/uploads/white-label/${logoFileName}`
      }

      // Handle favicon upload
      if (favicon && favicon.size > 0) {
        const faviconBytes = await favicon.arrayBuffer()
        const faviconBuffer = Buffer.from(faviconBytes)
        const faviconFileName = `${session.user.id}_favicon_${Date.now()}.${favicon.name.split('.').pop()}`
        const faviconPath = join(uploadsDir, faviconFileName)
        await writeFile(faviconPath, faviconBuffer)
        updateData.favicon = `/uploads/white-label/${faviconFileName}`
      }

      const whiteLabel = await prisma.whiteLabel.upsert({
        where: { userId: session.user.id },
        update: updateData,
        create: {
          userId: session.user.id,
          ...updateData
        }
      })

      return NextResponse.json(whiteLabel)
    } else {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }
  } catch (error) {
    console.error("White-label API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has enterprise subscription
    if (session.user.subscription?.plan !== "ENTERPRISE") {
      return NextResponse.json({ error: "Enterprise subscription required" }, { status: 403 })
    }

    const data = await request.json()

    const whiteLabel = await prisma.whiteLabel.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "WHITE_LABEL_SETTINGS_UPDATED",
        resource: "WhiteLabel",
        metadata: {
          companyName: data.companyName,
          customDomain: data.customDomain,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(whiteLabel)
  } catch (error) {
    console.error("White-label API error:", error)
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

    // Check if user has enterprise subscription
    if (session.user.subscription?.plan !== "ENTERPRISE") {
      return NextResponse.json({ error: "Enterprise subscription required" }, { status: 403 })
    }

    const { action, domain } = await request.json()

    if (action === "verify_domain") {
      if (!domain) {
        return NextResponse.json({ error: "Domain is required" }, { status: 400 })
      }

      // Mock domain verification - in a real implementation, you would:
      // 1. Check DNS records
      // 2. Verify SSL certificate
      // 3. Check for proper CNAME/A records
      // 4. Maybe check for a verification file or DNS TXT record
      
      const isVerified = Math.random() > 0.3 // 70% success rate for demo

      const whiteLabel = await prisma.whiteLabel.update({
        where: { userId: session.user.id },
        data: {
          isDomainVerified: isVerified
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: isVerified ? "DOMAIN_VERIFIED" : "DOMAIN_VERIFICATION_FAILED",
          resource: "WhiteLabel",
          metadata: {
            domain,
            verified: isVerified,
            ip: request.headers.get("x-forwarded-for") || "unknown",
          }
        }
      })

      return NextResponse.json({
        whiteLabel,
        verified: isVerified,
        message: isVerified ? "Domain verified successfully" : "Domain verification failed. Please check your DNS configuration."
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("White-label API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}