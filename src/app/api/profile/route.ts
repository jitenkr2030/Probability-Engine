import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { writeFile } from "fs/promises"
import { join } from "path"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Profile API error:", error)
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

    const { company, phone, address, country, timezone, language, bio, website, socialLinks } = await request.json()

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(country !== undefined && { country }),
        ...(timezone !== undefined && { timezone }),
        ...(language !== undefined && { language }),
        ...(bio !== undefined && { bio }),
        ...(website !== undefined && { website }),
        ...(socialLinks !== undefined && { socialLinks }),
      },
      create: {
        userId: session.user.id,
        company: company || "",
        phone: phone || "",
        address: address || "",
        country: country || "",
        timezone: timezone || "UTC",
        language: language || "en",
        bio: bio || "",
        website: website || "",
        socialLinks: socialLinks || {},
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PROFILE_UPDATED",
        resource: "Profile",
        resourceId: profile.id,
        metadata: {
          changes: { company, phone, address, country, timezone, language, bio, website },
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Profile API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}