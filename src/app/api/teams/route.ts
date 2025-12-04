import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { TeamRole, MemberStatus } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id, status: MemberStatus.ACTIVE } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error("Teams API error:", error)
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

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 })
    }

    // Check user's subscription limits
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!userSubscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 })
    }

    // Count current teams where user is owner
    const ownedTeamsCount = await prisma.team.count({
      where: { ownerId: session.user.id }
    })

    if (ownedTeamsCount >= userSubscription.teamMembersLimit) {
      return NextResponse.json({ 
        error: "Team limit reached for your subscription plan" 
      }, { status: 400 })
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId: session.user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    // Add owner as a team member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: session.user.id,
        role: TeamRole.OWNER,
        status: MemberStatus.ACTIVE,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TEAM_CREATED",
        resource: "Team",
        resourceId: team.id,
        metadata: {
          teamName: name,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error("Teams API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}