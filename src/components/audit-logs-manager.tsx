"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { format } from "date-fns"

interface AuditLog {
  id: string
  userId: string
  action: string
  resource?: string
  resourceId?: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

interface AuditLogsResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  filters: {
    actions: string[]
    resources: string[]
  }
}

export function AuditLogsManager() {
  const [auditLogs, setAuditLogs] = useState<AuditLogsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    userId: "",
    action: "",
    resource: "",
    startDate: "",
    endDate: "",
  })
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/audit-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data)
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch audit logs")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearOldLogs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/audit-logs?olderThanDays=90", {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to clear audit logs")
      }

      const data = await response.json()
      setSuccess(data.message)
      setShowClearDialog(false)
      fetchAuditLogs()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes("FAILED") || action.includes("ERROR")) return "bg-red-100 text-red-800"
    if (action.includes("SUCCESS") || action.includes("CREATED")) return "bg-green-100 text-green-800"
    if (action.includes("UPDATED") || action.includes("CHANGED")) return "bg-blue-100 text-blue-800"
    if (action.includes("DELETED") || action.includes("REMOVED")) return "bg-orange-100 text-orange-800"
    return "bg-gray-100 text-gray-800"
  }

  const formatMetadata = (metadata: any) => {
    if (!metadata) return "N/A"
    
    try {
      return JSON.stringify(metadata, null, 2)
    } catch {
      return String(metadata)
    }
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">
            Monitor and track all system activities and security events
          </p>
        </div>
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Icons.trash className="mr-2 h-4 w-4" />
              Clear Old Logs
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Old Audit Logs</DialogTitle>
              <DialogDescription>
                This will permanently delete all audit logs older than 90 days. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleClearOldLogs} disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Clear Logs
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter audit logs by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value, page: 1 }))}
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {auditLogs?.filters.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resource">Resource</Label>
              <Select value={filters.resource} onValueChange={(value) => setFilters(prev => ({ ...prev, resource: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All resources</SelectItem>
                  {auditLogs?.filters.resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => setFilters({ page: 1, limit: 50, userId: "", action: "", resource: "", startDate: "", endDate: "" })}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                {auditLogs?.pagination.total} total logs found
              </CardDescription>
            </div>
            <Button onClick={fetchAuditLogs} disabled={isLoading}>
              <Icons.refresh className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.user.name}</div>
                            <div className="text-sm text-muted-foreground">{log.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.resource || "N/A"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress || log.metadata?.ip || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Audit Log Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information about this audit log entry
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>ID</Label>
                                    <p className="font-mono text-sm">{log.id}</p>
                                  </div>
                                  <div>
                                    <Label>Timestamp</Label>
                                    <p className="font-mono text-sm">
                                      {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss.SSS")}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>User</Label>
                                    <p>{log.user.name} ({log.user.email})</p>
                                  </div>
                                  <div>
                                    <Label>Action</Label>
                                    <Badge className={getActionColor(log.action)}>
                                      {log.action}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Resource</Label>
                                    <p>{log.resource || "N/A"}</p>
                                  </div>
                                  <div>
                                    <Label>Resource ID</Label>
                                    <p className="font-mono text-sm">{log.resourceId || "N/A"}</p>
                                  </div>
                                  <div>
                                    <Label>IP Address</Label>
                                    <p className="font-mono text-sm">
                                      {log.ipAddress || log.metadata?.ip || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>User Agent</Label>
                                    <p className="text-sm break-all">
                                      {log.userAgent || log.metadata?.userAgent || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Metadata</Label>
                                  <pre className="bg-muted p-3 rounded text-sm overflow-auto max-h-64">
                                    {formatMetadata(log.metadata)}
                                  </pre>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {auditLogs && auditLogs.pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((filters.page - 1) * filters.limit) + 1} to{" "}
                    {Math.min(filters.page * filters.limit, auditLogs.pagination.total)} of{" "}
                    {auditLogs.pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={filters.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {filters.page} of {auditLogs.pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={filters.page >= auditLogs.pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}