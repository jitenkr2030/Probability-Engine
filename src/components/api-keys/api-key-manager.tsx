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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { format } from "date-fns"

interface ApiKey {
  id: string
  name: string
  description?: string
  key: string
  permissions: any
  rateLimit: number
  burstLimit: number
  usageCount: number
  lastUsedAt?: Date
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface ApiKeyManagerProps {
  apiKeys: ApiKey[]
  onApiKeysUpdate: () => void
}

export function ApiKeyManager({ apiKeys, onApiKeysUpdate }: ApiKeyManagerProps) {
  const { data: session } = useSession()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newKey, setNewKey] = useState({
    name: "",
    description: "",
    rateLimit: 1000,
    burstLimit: 100,
    expiresAt: "",
  })
  const [editKey, setEditKey] = useState({
    name: "",
    description: "",
    rateLimit: 1000,
    burstLimit: 100,
    isActive: true,
    expiresAt: "",
  })

  const handleCreateKey = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newKey,
          expiresAt: newKey.expiresAt || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("API key created successfully!")
        setNewKey({
          name: "",
          description: "",
          rateLimit: 1000,
          burstLimit: 100,
          expiresAt: "",
        })
        setIsCreateDialogOpen(false)
        onApiKeysUpdate()
        
        // Show the key temporarily
        setShowKey(data.key)
        setTimeout(() => setShowKey(null), 10000) // Hide after 10 seconds
      } else {
        toast.error(data.error || "Failed to create API key")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateKey = async () => {
    if (!selectedKey || !session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/api-keys", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedKey.id,
          ...editKey,
          expiresAt: editKey.expiresAt || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("API key updated successfully!")
        setIsEditDialogOpen(false)
        setSelectedKey(null)
        onApiKeysUpdate()
      } else {
        toast.error(data.error || "Failed to update API key")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!session?.user?.id) return

    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("API key deleted successfully!")
        onApiKeysUpdate()
      } else {
        toast.error(data.error || "Failed to delete API key")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/api-keys", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: keyId,
          isActive,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`API key ${isActive ? "activated" : "deactivated"} successfully!`)
        onApiKeysUpdate()
      } else {
        toast.error(data.error || "Failed to update API key")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (key: ApiKey) => {
    setSelectedKey(key)
    setEditKey({
      name: key.name,
      description: key.description || "",
      rateLimit: key.rateLimit,
      burstLimit: key.burstLimit,
      isActive: key.isActive,
      expiresAt: key.expiresAt ? format(key.expiresAt, "yyyy-MM-dd") : "",
    })
    setIsEditDialogOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("API key copied to clipboard!")
  }

  const maskApiKey = (key: string) => {
    if (showKey === key) return key
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  const isExpired = (expiresAt?: Date) => {
    if (!expiresAt) return false
    return new Date() > expiresAt
  }

  const getDaysUntilExpiry = (expiresAt?: Date) => {
    if (!expiresAt) return null
    const now = new Date()
    const diffTime = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-muted-foreground">Manage your API keys for programmatic access</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.key className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for programmatic access to our services
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKey.name}
                  onChange={(e) => setNewKey(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter a descriptive name for your API key"
                />
              </div>
              <div>
                <Label htmlFor="keyDescription">Description (Optional)</Label>
                <Textarea
                  id="keyDescription"
                  value={newKey.description}
                  onChange={(e) => setNewKey(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this API key"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rateLimit">Rate Limit (requests/minute)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={newKey.rateLimit}
                    onChange={(e) => setNewKey(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="burstLimit">Burst Limit</Label>
                  <Input
                    id="burstLimit"
                    type="number"
                    value={newKey.burstLimit}
                    onChange={(e) => setNewKey(prev => ({ ...prev, burstLimit: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={newKey.expiresAt}
                  onChange={(e) => setNewKey(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
              <Button 
                onClick={handleCreateKey} 
                disabled={isLoading || !newKey.name}
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create API Key"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {showKey && (
        <Alert>
          <Icons.key className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{showKey}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(showKey)}
              >
                <Icons.copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Save this key now! It won't be shown again.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first API key to start using our programmatic interface
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Icons.key className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => {
            const daysUntilExpiry = getDaysUntilExpiry(apiKey.expiresAt)
            const expired = isExpired(apiKey.expiresAt)

            return (
              <Card key={apiKey.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{apiKey.name}</span>
                        <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {expired && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </CardTitle>
                      {apiKey.description && (
                        <CardDescription>{apiKey.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={apiKey.isActive}
                        onCheckedChange={(checked) => handleToggleKey(apiKey.id, checked)}
                        disabled={isLoading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(apiKey)}
                      >
                        <Icons.edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteKey(apiKey.id)}
                        disabled={isLoading}
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">API Key</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {maskApiKey(apiKey.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Icons.copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Usage</p>
                      <p className="text-sm text-muted-foreground">
                        {apiKey.usageCount} requests
                        {apiKey.lastUsedAt && (
                          <span className="block text-xs">
                            Last used: {format(apiKey.lastUsedAt, "MMM dd, yyyy")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rate Limits</p>
                      <p className="text-sm text-muted-foreground">
                        {apiKey.rateLimit}/min
                        <span className="block text-xs">
                          Burst: {apiKey.burstLimit}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Expires</p>
                      <p className="text-sm text-muted-foreground">
                        {apiKey.expiresAt ? (
                          <>
                            {format(apiKey.expiresAt, "MMM dd, yyyy")}
                            {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                              <span className="block text-xs">
                                {daysUntilExpiry} days remaining
                              </span>
                            )}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                              <span className="block text-xs text-red-500">
                                Expired
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs">Never</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit API Key Dialog */}
      {selectedKey && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit API Key</DialogTitle>
              <DialogDescription>
                Update your API key settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editKeyName">Key Name</Label>
                <Input
                  id="editKeyName"
                  value={editKey.name}
                  onChange={(e) => setEditKey(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="editKeyDescription">Description</Label>
                <Textarea
                  id="editKeyDescription"
                  value={editKey.description}
                  onChange={(e) => setEditKey(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRateLimit">Rate Limit (requests/minute)</Label>
                  <Input
                    id="editRateLimit"
                    type="number"
                    value={editKey.rateLimit}
                    onChange={(e) => setEditKey(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="editBurstLimit">Burst Limit</Label>
                  <Input
                    id="editBurstLimit"
                    type="number"
                    value={editKey.burstLimit}
                    onChange={(e) => setEditKey(prev => ({ ...prev, burstLimit: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editExpiresAt">Expires At</Label>
                <Input
                  id="editExpiresAt"
                  type="date"
                  value={editKey.expiresAt}
                  onChange={(e) => setEditKey(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsActive"
                  checked={editKey.isActive}
                  onCheckedChange={(checked) => setEditKey(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="editIsActive">Active</Label>
              </div>
              <Button 
                onClick={handleUpdateKey} 
                disabled={isLoading || !editKey.name}
                className="w-full"
              >
                {isLoading ? "Updating..." : "Update API Key"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}