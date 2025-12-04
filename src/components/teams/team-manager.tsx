"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
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
    status: MemberStatus
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
  }>
}

interface TeamManagerProps {
  teams: Team[]
  onTeamsUpdate: () => void
}

export function TeamManager({ teams, onTeamsUpdate }: TeamManagerProps) {
  const { data: session } = useSession()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: "", description: "" })
  const [inviteData, setInviteData] = useState({ email: "", role: TeamRole.MEMBER })

  const handleCreateTeam = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTeam),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Team created successfully!")
        setNewTeam({ name: "", description: "" })
        setIsCreateDialogOpen(false)
        onTeamsUpdate()
      } else {
        toast.error(data.error || "Failed to create team")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!selectedTeam || !session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inviteData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Member invited successfully!")
        setInviteData({ email: "", role: TeamRole.MEMBER })
        setIsInviteDialogOpen(false)
        onTeamsUpdate()
      } else {
        toast.error(data.error || "Failed to invite member")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateMember = async (memberId: string, updates: { role?: TeamRole; status?: MemberStatus }) => {
    if (!selectedTeam || !session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberId, ...updates }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Member updated successfully!")
        onTeamsUpdate()
      } else {
        toast.error(data.error || "Failed to update member")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !session?.user?.id) return

    if (!confirm("Are you sure you want to remove this member?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Member removed successfully!")
        onTeamsUpdate()
      } else {
        toast.error(data.error || "Failed to remove member")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case TeamRole.OWNER:
        return "bg-purple-100 text-purple-800"
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

  const getStatusBadgeColor = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.ACTIVE:
        return "bg-green-100 text-green-800"
      case MemberStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case MemberStatus.INACTIVE:
        return "bg-gray-100 text-gray-800"
      case MemberStatus.SUSPENDED:
        return "bg-red-100 text-red-800"
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">Manage your teams and collaborate with others</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                Create a new team to collaborate with your colleagues
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="teamDescription">Description (Optional)</Label>
                <Textarea
                  id="teamDescription"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter team description"
                />
              </div>
              <Button 
                onClick={handleCreateTeam} 
                disabled={isLoading || !newTeam.name}
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first team to start collaborating with others
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {team.name}
                  <Badge variant="outline">
                    {team.members.filter(m => m.status === MemberStatus.ACTIVE).length} members
                  </Badge>
                </CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={team.owner.image} />
                      <AvatarFallback>
                        {team.owner.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      Owner: {team.owner.name}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTeam(team)}
                      className="flex-1"
                    >
                      View Members
                    </Button>
                    
                    {canManageTeam(team) && (
                      <Dialog open={isInviteDialogOpen && selectedTeam?.id === team.id} onOpenChange={(open) => {
                        setIsInviteDialogOpen(open)
                        if (open) setSelectedTeam(team)
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Icons.plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                              Invite a new member to join {team.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="email">Email Address</Label>
                              <Input
                                id="email"
                                type="email"
                                value={inviteData.email}
                                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Enter email address"
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
                            <Button 
                              onClick={handleInviteMember} 
                              disabled={isLoading || !inviteData.email}
                              className="w-full"
                            >
                              {isLoading ? "Inviting..." : "Send Invitation"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Members Dialog */}
      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTeam.name} - Team Members</DialogTitle>
              <DialogDescription>
                Manage team members and their permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTeam.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={member.user.image} />
                      <AvatarFallback>
                        {member.user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>
                    <Badge className={getStatusBadgeColor(member.status)}>
                      {member.status}
                    </Badge>
                    
                    {canManageTeam(selectedTeam) && member.user.id !== session?.user?.id && (
                      <div className="flex space-x-1">
                        <Select 
                          value={member.role} 
                          onValueChange={(value) => handleUpdateMember(member.id, { role: value as TeamRole })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={TeamRole.MEMBER}>Member</SelectItem>
                            <SelectItem value={TeamRole.ADMIN}>Admin</SelectItem>
                            <SelectItem value={TeamRole.VIEWER}>Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Icons.trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}