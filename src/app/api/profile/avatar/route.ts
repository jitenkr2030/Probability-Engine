import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { writeFile } from "fs/promises"
import { join } from "path"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.formData()
    const file: File | null = data.get("avatar") as unknown as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const fileName = `${session.user.id}-${Date.now()}-${file.name}`
    const path = join(process.cwd(), "public", "avatars", fileName)

    // Save file
    await writeFile(path, buffer)

    // Update user avatar URL
    const avatarUrl = `/avatars/${fileName}`
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: avatarUrl }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AVATAR_UPDATED",
        resource: "User",
        resourceId: session.user.id,
        metadata: {
          fileName,
          fileSize: file.size,
          fileType: file.type,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}