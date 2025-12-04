"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}

export function ApiKeyManager() {
  const { data: session } = useSession()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState<{ key: string; name: string } | null>(null)
  const [newKey, setNewKey] = useState({
    name: "",
    description: "",
    rateLimit: 1000,
    burstLimit: 100,
    expiresAt: ""
  })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/api-keys")
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data)
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create API key")
      }

      const createdKey = await response.json()
      setShowKeyDialog({ key: createdKey.key, name: createdKey.name })
      setNewKey({
        name: "",
        description: "",
        rateLimit: 1000,
        burstLimit: 100,
        expiresAt: "",
      })
      setShowCreateDialog(false)
      fetchApiKeys()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete API key")
      }

      setSuccess("API key deleted successfully!")
      fetchApiKeys()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    setIsLoading(true)
    setError(null)

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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update API key")
      }

      setSuccess(`API key ${isActive ? "activated" : "deactivated"} successfully!`)
      fetchApiKeys()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess("API key copied to clipboard!")
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString()
  }

  const getUsagePercentage = (key: ApiKey) => {
    return Math.min((key.usageCount / key.rateLimit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-green-600"
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
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground">
            Manage your API keys for accessing the Probability Engine API
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key to access the Probability Engine API.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKey.name}
                  onChange={(e) => setNewKey(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Application"
                  required
                />
              </div>
              <div>
                <Label htmlFor="keyDescription">Description (Optional)</Label>
                <Textarea
                  id="keyDescription"
                  value={newKey.description}
                  onChange={(e) => setNewKey(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this key will be used for..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={newKey.rateLimit}
                    onChange={(e) => setNewKey(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                    min="1"
                    max="10000"
                  />
                </div>
                <div>
                  <Label htmlFor="burstLimit">Burst Limit</Label>
                  <Input
                    id="burstLimit"
                    type="number"
                    value={newKey.burstLimit}
                    onChange={(e) => setNewKey(prev => ({ ...prev, burstLimit: parseInt(e.target.value) }))}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newKey.expiresAt}
                  onChange={(e) => setNewKey(prev => ({ ...prev, expiresAt: e.target.value }))}
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
                  Create Key
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {apiKeys.map((apiKey) => (
          <Card key={apiKey.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{apiKey.name}</span>
                    <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                      {apiKey.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() && (
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
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteKey(apiKey.id)}
                    disabled={isLoading}
                  >
                    <Icons.trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Rate Limit</p>
                  <p className="text-muted-foreground">{apiKey.rateLimit}/min</p>
                </div>
                <div>
                  <p className="font-medium">Burst Limit</p>
                  <p className="text-muted-foreground">{apiKey.burstLimit}</p>
                </div>
                <div>
                  <p className="font-medium">Usage</p>
                  <p className={getUsageColor(getUsagePercentage(apiKey))}>
                    {apiKey.usageCount}/{apiKey.rateLimit}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDate(apiKey.createdAt)}</p>
                </div>
              </div>

              {apiKey.lastUsedAt && (
                <div className="text-sm">
                  <p className="font-medium">Last Used</p>
                  <p className="text-muted-foreground">{formatDate(apiKey.lastUsedAt)}</p>
                </div>
              )}

              {apiKey.expiresAt && (
                <div className="text-sm">
                  <p className="font-medium">Expires</p>
                  <p className="text-muted-foreground">{formatDate(apiKey.expiresAt)}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {apiKey.key.substring(0, 20)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.key)}
                  >
                    <Icons.copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-24">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Usage</span>
                    <span>{Math.round(getUsagePercentage(apiKey))}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        getUsagePercentage(apiKey) >= 90
                          ? "bg-red-500"
                          : getUsagePercentage(apiKey) >= 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${getUsagePercentage(apiKey)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {apiKeys.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Icons.key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first API key to start using the Probability Engine API.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Key Display Dialog */}
      <Dialog open={!!showKeyDialog} onOpenChange={() => setShowKeyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Please copy and store your API key securely. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {showKeyDialog && (
            <div className="space-y-4">
              <div>
                <Label>Key Name</Label>
                <p className="font-medium">{showKeyDialog.name}</p>
              </div>
              <div>
                <Label>API Key</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="bg-muted p-3 rounded text-sm font-mono flex-1 break-all">
                    {showKeyDialog.key}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(showKeyDialog.key)}
                  >
                    <Icons.copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Store this key securely. For security reasons, we won't be able to show it to you again.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button onClick={() => setShowKeyDialog(null)}>
                  I've saved my key
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}