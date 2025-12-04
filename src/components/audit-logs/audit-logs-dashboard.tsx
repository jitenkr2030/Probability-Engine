"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
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

interface SecuritySummary {
  totalLogs: number
  uniqueUsers: number
  failedLogins: number
  securityEvents: number
  apiAbuseEvents: number
  suspiciousIPs: number
}

interface AuditLogsDashboardProps {
  userId: string
  userRole: string
}

export function AuditLogsDashboard({ userId, userRole }: AuditLogsDashboardProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    resource: "",
    startDate: "",
    endDate: "",
  })
  const [availableFilters, setAvailableFilters] = useState({
    actions: [] as string[],
    resources: [] as string[],
  })
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      fetchAuditLogs()
      fetchSecuritySummary()
    }
  }, [currentPage, filters, userRole])

  const fetchAuditLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value
          return acc
        }, {} as Record<string, string>)
      })

      const response = await fetch(`/api/audit-logs?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setAuditLogs(data.logs)
        setTotalPages(data.pagination.pages)
        setAvailableFilters(data.filters)
      } else {
        toast.error("Failed to load audit logs")
      }
    } catch (error) {
      toast.error("An error occurred while fetching audit logs")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSecuritySummary = async () => {
    try {
      const response = await fetch("/api/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "security_summary" }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setSecuritySummary(data.summary)
      } else {
        toast.error("Failed to load security summary")
      }
    } catch (error) {
      toast.error("An error occurred while fetching security summary")
    }
  }

  const fetchSecurityReport = async (type: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setReportData(data)
        setSelectedReport(type)
      } else {
        toast.error("Failed to load security report")
      }
    } catch (error) {
      toast.error("An error occurred while fetching security report")
    } finally {
      setIsLoading(false)
    }
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes("FAILED") || action.includes("ERROR")) return "destructive"
    if (action.includes("SUCCESS") || action.includes("CREATED")) return "default"
    if (action.includes("SECURITY") || action.includes("ALERT")) return "destructive"
    if (action.includes("LOGIN")) return "secondary"
    return "outline"
  }

  const formatMetadata = (metadata: any) => {
    if (!metadata) return "N/A"
    
    try {
      return JSON.stringify(metadata, null, 2)
    } catch {
      return String(metadata)
    }
  }

  const getRiskLevel = (action: string) => {
    const highRiskActions = [
      "LOGIN_FAILED",
      "UNAUTHORIZED_ACCESS",
      "SUSPICIOUS_ACTIVITY",
      "RATE_LIMIT_EXCEEDED",
      "SECURITY_ALERT",
      "ACCOUNT_COMPROMISED"
    ]
    
    if (highRiskActions.includes(action)) return "High"
    if (action.includes("DELETE") || action.includes("UPDATE")) return "Medium"
    return "Low"
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "High": return "destructive"
      case "Medium": return "secondary"
      default: return "outline"
    }
  }

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icons.shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground text-center">
            You don't have permission to view audit logs and security information.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs & Security</h2>
          <p className="text-muted-foreground">Monitor system activity and security events</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Icons.shield className="mr-2 h-4 w-4" />
                Security Reports
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Security Reports</DialogTitle>
                <DialogDescription>
                  Generate and view security reports
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchSecurityReport("suspicious_activities")}
                    disabled={isLoading}
                  >
                    Suspicious Activities
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fetchSecurityReport("failed_login_attempts")}
                    disabled={isLoading}
                  >
                    Failed Login Attempts
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fetchSecurityReport("api_abuse")}
                    disabled={isLoading}
                  >
                    API Abuse Detection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchSecuritySummary}
                    disabled={isLoading}
                  >
                    Security Summary
                  </Button>
                </div>

                {reportData && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Report Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={fetchAuditLogs}>
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Summary Cards */}
      {securitySummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Icons.activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securitySummary.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Icons.users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securitySummary.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                Unique users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
              <Icons.alert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{securitySummary.failedLogins}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <Icons.shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{securitySummary.securityEvents}</div>
              <p className="text-xs text-muted-foreground">
                Alerts & incidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Abuse</CardTitle>
              <Icons.key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{securitySummary.apiAbuseEvents}</div>
              <p className="text-xs text-muted-foreground">
                Rate limit violations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspicious IPs</CardTitle>
              <Icons.target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{securitySummary.suspiciousIPs}</div>
              <p className="text-xs text-muted-foreground">
                High activity IPs
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Filter by user ID"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  {availableFilters.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Resource</label>
              <Select value={filters.resource} onValueChange={(value) => setFilters(prev => ({ ...prev, resource: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Resources</SelectItem>
                  {availableFilters.resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => setFilters({ userId: "", action: "", resource: "", startDate: "", endDate: "" })}
            >
              Clear Filters
            </Button>
            <Button onClick={fetchAuditLogs}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            System activity and security events ({auditLogs.length} records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.createdAt), "MMM dd, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.user.name}</p>
                            <p className="text-sm text-muted-foreground">{log.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.resource || "N/A"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeColor(getRiskLevel(log.action))}>
                            {getRiskLevel(log.action)}
                          </Badge>
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
                                  Detailed information about this audit event
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Action</label>
                                    <p className="text-sm">{log.action}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Resource</label>
                                    <p className="text-sm">{log.resource || "N/A"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Resource ID</label>
                                    <p className="text-sm font-mono">{log.resourceId || "N/A"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">IP Address</label>
                                    <p className="text-sm font-mono">{log.ipAddress || "N/A"}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Metadata</label>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                                    {formatMetadata(log.metadata)}
                                  </pre>
                                </div>
                                
                                {log.userAgent && (
                                  <div>
                                    <label className="text-sm font-medium">User Agent</label>
                                    <p className="text-xs break-all">{log.userAgent}</p>
                                  </div>
                                )}
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}