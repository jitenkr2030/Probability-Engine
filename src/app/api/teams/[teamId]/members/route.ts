import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { TeamRole, MemberStatus } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: session.user.id,
        status: MemberStatus.ACTIVE,
      }
    })

    if (!teamMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Team members API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, role = TeamRole.MEMBER } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if user has permission to add members
    const currentUserMember = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: session.user.id,
        status: MemberStatus.ACTIVE,
      }
    })

    if (!currentUserMember || (currentUserMember.role !== TeamRole.OWNER && currentUserMember.role !== TeamRole.ADMIN)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Find the user to invite
    const userToInvite = await prisma.user.findUnique({
      where: { email }
    })

    if (!userToInvite) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: params.teamId,
          userId: userToInvite.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 400 })
    }

    // Check team member limits
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      include: {
        members: {
          where: { status: MemberStatus.ACTIVE }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const ownerSubscription = await prisma.subscription.findUnique({
      where: { userId: team.ownerId }
    })

    if (ownerSubscription && team.members.length >= ownerSubscription.teamMembersLimit) {
      return NextResponse.json({ 
        error: "Team member limit reached for subscription plan" 
      }, { status: 400 })
    }

    // Add team member
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: params.teamId,
        userId: userToInvite.id,
        role,
        status: MemberStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    // Create notification for the invited user
    await prisma.notification.create({
      data: {
        userId: userToInvite.id,
        type: "TEAM",
        title: "Team Invitation",
        message: `You have been invited to join the team "${team.name}"`,
        metadata: {
          teamId: params.teamId,
          teamName: team.name,
          role,
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TEAM_MEMBER_INVITED",
        resource: "TeamMember",
        resourceId: newMember.id,
        metadata: {
          teamId: params.teamId,
          invitedUserId: userToInvite.id,
          invitedUserEmail: email,
          role,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    console.error("Team members API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { memberId, role, status } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
    }

    // Check if user has permission to update members
    const currentUserMember = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: session.user.id,
        status: MemberStatus.ACTIVE,
      }
    })

    if (!currentUserMember || (currentUserMember.role !== TeamRole.OWNER && currentUserMember.role !== TeamRole.ADMIN)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Update team member
    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(role && { role }),
        ...(status && { status }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TEAM_MEMBER_UPDATED",
        resource: "TeamMember",
        resourceId: memberId,
        metadata: {
          teamId: params.teamId,
          updatedUserId: updatedMember.userId,
          changes: { role, status },
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error("Team members API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
    }

    // Check if user has permission to remove members
    const currentUserMember = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: session.user.id,
        status: MemberStatus.ACTIVE,
      }
    })

    if (!currentUserMember || (currentUserMember.role !== TeamRole.OWNER && currentUserMember.role !== TeamRole.ADMIN)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get member to remove
    const memberToRemove = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    })

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Cannot remove team owner
    if (memberToRemove.role === TeamRole.OWNER) {
      return NextResponse.json({ error: "Cannot remove team owner" }, { status: 400 })
    }

    // Remove team member
    await prisma.teamMember.delete({
      where: { id: memberId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TEAM_MEMBER_REMOVED",
        resource: "TeamMember",
        resourceId: memberId,
        metadata: {
          teamId: params.teamId,
          removedUserId: memberToRemove.userId,
          removedUserEmail: memberToRemove.user.email,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Team members API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}