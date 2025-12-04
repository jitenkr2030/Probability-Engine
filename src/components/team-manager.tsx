"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { TeamRole, MemberStatus } from "@prisma/client"

interface Team {
  id: string
  name: string
  description?: string
  owner: {
    id: string
    name: string
    email: string
  }
  members: Array<{
    id: string
    role: TeamRole
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
  }>
}

interface TeamMember {
  id: string
  role: TeamRole
  status: MemberStatus
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export function TeamManager() {
  const { data: session } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState({ name: "", description: "" })
  const [inviteData, setInviteData] = useState({ email: "", role: TeamRole.MEMBER })

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTeam),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create team")
      }

      setSuccess("Team created successfully!")
      setNewTeam({ name: "", description: "" })
      setShowCreateDialog(false)
      fetchTeams()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = async (teamId: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inviteData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to invite member")
      }

      setSuccess("Member invited successfully!")
      setInviteData({ email: "", role: TeamRole.MEMBER })
      setShowInviteDialog(null)
      fetchTeams()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!session?.user?.id) return

    if (!confirm("Are you sure you want to remove this member?")) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to remove member")
      }

      setSuccess("Member removed successfully!")
      fetchTeams()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case TeamRole.OWNER:
        return "bg-red-100 text-red-800"
      case TeamRole.ADMIN:
        return "bg-blue-100 text-blue-800"
      case TeamRole.MEMBER:
        return "bg-green-100 text-green-800"
      case TeamRole.VIEWER:
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const canManageTeam = (team: Team) => {
    const member = team.members.find(m => m.user.id === session?.user?.id)
    return member && (member.role === TeamRole.OWNER || member.role === TeamRole.ADMIN)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teams</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team to collaborate with your colleagues.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="teamDescription">Description (Optional)</Label>
                <Input
                  id="teamDescription"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Create Team
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {team.name}
                <Badge variant="outline">
                  {team.members.length} members
                </Badge>
              </CardTitle>
              <CardDescription>{team.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Owner</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={team.owner.image} />
                    <AvatarFallback>
                      {team.owner.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{team.owner.name}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Members</p>
                  {canManageTeam(team) && (
                    <Dialog open={showInviteDialog === team.id} onOpenChange={(open) => setShowInviteDialog(open ? team.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Icons.plus className="mr-1 h-3 w-3" />
                          Invite
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Member</DialogTitle>
                          <DialogDescription>
                            Invite a new member to join your team.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={inviteData.email}
                              onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Enter email address"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="role">Role</Label>
                            <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value as TeamRole }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={TeamRole.MEMBER}>Member</SelectItem>
                                <SelectItem value={TeamRole.ADMIN}>Admin</SelectItem>
                                <SelectItem value={TeamRole.VIEWER}>Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowInviteDialog(null)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={() => handleInviteMember(team.id)} disabled={isLoading}>
                              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                              Send Invite
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.user.image} />
                          <AvatarFallback>
                            {member.user.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm">{member.user.name}</span>
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                        {canManageTeam(team) && member.user.id !== session?.user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(team.id, member.user.id)}
                          >
                            <Icons.trash className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Icons.users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start collaborating with others.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}