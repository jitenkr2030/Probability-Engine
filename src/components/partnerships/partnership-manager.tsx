"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { format } from "date-fns"
import { PartnershipType, PartnershipStatus } from "@prisma/client"

interface Partnership {
  id: string
  name: string
  type: PartnershipType
  status: PartnershipStatus
  config: any
  revenueShare: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  createdAt: Date
  updatedAt: Date
}

interface PartnershipManagerProps {
  userId: string
  userRole?: string
}

export function PartnershipManager({ userId, userRole }: PartnershipManagerProps) {
  const { data: session } = useSession()
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    revenueShare: 0,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    config: "",
  })

  useEffect(() => {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      fetchPartnerships()
    }
  }, [userRole])

  const fetchPartnerships = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/partnerships")
      const data = await response.json()
      
      if (response.ok) {
        setPartnerships(data.partnerships)
      } else {
        toast.error("Failed to load partnerships")
      }
    } catch (error) {
      toast.error("An error occurred while fetching partnerships")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePartnership = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/partnerships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          config: formData.config ? JSON.parse(formData.config) : {},
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Partnership created successfully!")
        setIsCreateDialogOpen(false)
        setFormData({
          name: "",
          type: "",
          revenueShare: 0,
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          config: "",
        })
        fetchPartnerships()
      } else {
        toast.error(data.error || "Failed to create partnership")
      }
    } catch (error) {
      toast.error("An error occurred while creating partnership")
    }
  }

  const handleUpdatePartnership = async (id: string, updates: any) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/partnerships", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...updates }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Partnership updated successfully!")
        fetchPartnerships()
      } else {
        toast.error(data.error || "Failed to update partnership")
      }
    } catch (error) {
      toast.error("An error occurred while updating partnership")
    }
  }

  const handleStatusChange = async (id: string, action: string) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/partnerships", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, action }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Partnership ${action}d successfully!`)
        fetchPartnerships()
      } else {
        toast.error(data.error || `Failed to ${action} partnership`)
      }
    } catch (error) {
      toast.error(`An error occurred while ${action}ing partnership`)
    }
  }

  const handleDeletePartnership = async (id: string) => {
    if (!confirm("Are you sure you want to delete this partnership? This action cannot be undone.")) return

    try {
      const response = await fetch(`/api/partnerships?id=${id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Partnership deleted successfully")
        fetchPartnerships()
      } else {
        toast.error(data.error || "Failed to delete partnership")
      }
    } catch (error) {
      toast.error("An error occurred while deleting partnership")
    }
  }

  const getStatusBadgeColor = (status: PartnershipStatus) => {
    switch (status) {
      case PartnershipStatus.ACTIVE:
        return "bg-green-100 text-green-800"
      case PartnershipStatus.INACTIVE:
        return "bg-gray-100 text-gray-800"
      case PartnershipStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case PartnershipStatus.SUSPENDED:
        return "bg-red-100 text-red-800"
      case PartnershipStatus.TERMINATED:
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeBadgeColor = (type: PartnershipType) => {
    switch (type) {
      case PartnershipType.BROKERAGE:
        return "bg-blue-100 text-blue-800"
      case PartnershipType.MEDIA:
        return "bg-purple-100 text-purple-800"
      case PartnershipType.DATA_PROVIDER:
        return "bg-green-100 text-green-800"
      case PartnershipType.TRADING_PLATFORM:
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icons.shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-muted-foreground text-center mb-4">
            Partnership management is only available to administrators.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">B2B Partnerships</h2>
          <p className="text-muted-foreground">Manage brokerage, media, and integration partnerships</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              New Partnership
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Partnership</DialogTitle>
              <DialogDescription>
                Set up a new B2B partnership for brokerage, media, or integration services
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partnershipName">Partnership Name</Label>
                  <Input
                    id="partnershipName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter partnership name"
                  />
                </div>
                <div>
                  <Label htmlFor="partnershipType">Partnership Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PartnershipType.BROKERAGE}>Brokerage</SelectItem>
                      <SelectItem value={PartnershipType.MEDIA}>Media</SelectItem>
                      <SelectItem value={PartnershipType.DATA_PROVIDER}>Data Provider</SelectItem>
                      <SelectItem value={PartnershipType.TRADING_PLATFORM}>Trading Platform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="revenueShare">Revenue Share (%)</Label>
                  <Input
                    id="revenueShare"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.revenueShare}
                    onChange={(e) => setFormData(prev => ({ ...prev, revenueShare: parseFloat(e.target.value) }))}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="config">Configuration (JSON)</Label>
                <Textarea
                  id="config"
                  value={formData.config}
                  onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))}
                  placeholder='{"apiKey": "your-api-key", "webhookUrl": "https://example.com/webhook"}'
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Enter configuration as JSON object
                </p>
              </div>

              <Button 
                onClick={handleCreatePartnership} 
                disabled={!formData.name || !formData.type}
                className="w-full"
              >
                Create Partnership
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {partnerships.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.handshake className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No partnerships yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first B2B partnership to start collaborating with brokers, media companies, and trading platforms
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create Partnership
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partnerships.map((partnership) => (
            <Card key={partnership.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{partnership.name}</CardTitle>
                  <div className="flex flex-col space-y-1">
                    <Badge className={getTypeBadgeColor(partnership.type)}>
                      {partnership.type.replace("_", " ")}
                    </Badge>
                    <Badge className={getStatusBadgeColor(partnership.status)}>
                      {partnership.status}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Revenue Share: {partnership.revenueShare}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {partnership.contactName && (
                    <div>
                      <p className="text-sm font-medium">Contact</p>
                      <p className="text-sm text-muted-foreground">{partnership.contactName}</p>
                    </div>
                  )}
                  
                  {partnership.contactEmail && (
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{partnership.contactEmail}</p>
                    </div>
                  )}
                  
                  {partnership.contactPhone && (
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{partnership.contactPhone}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {format(partnership.createdAt, "MMM dd, yyyy")}
                    </p>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    {partnership.status === PartnershipStatus.ACTIVE && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(partnership.id, "suspend")}
                      >
                        Suspend
                      </Button>
                    )}
                    
                    {partnership.status === PartnershipStatus.SUSPENDED && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(partnership.id, "activate")}
                      >
                        Activate
                      </Button>
                    )}
                    
                    {partnership.status !== PartnershipStatus.TERMINATED && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(partnership.id, "terminate")}
                      >
                        Terminate
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePartnership(partnership.id)}
                    >
                      <Icons.trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}