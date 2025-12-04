"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { format } from "date-fns"
import { ExportType, ExportFormat, ExportStatus } from "@prisma/client"

interface DataExport {
  id: string
  type: ExportType
  format: ExportFormat
  status: ExportStatus
  filename?: string
  filePath?: string
  fileSize?: number
  metadata?: any
  error?: string
  createdAt: Date
  completedAt?: Date
}

interface DataExportManagerProps {
  userId: string
  userSubscription?: any
}

export function DataExportManager({ userId, userSubscription }: DataExportManagerProps) {
  const { data: session } = useSession()
  const [exports, setExports] = useState<DataExport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ExportType | "">("")
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | "">("")
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  })

  useEffect(() => {
    fetchExports()
  }, [])

  const fetchExports = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/data-exports")
      const data = await response.json()
      
      if (response.ok) {
        setExports(data.exports)
      } else {
        toast.error("Failed to load data exports")
      }
    } catch (error) {
      toast.error("An error occurred while fetching data exports")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateExport = async () => {
    if (!session?.user?.id || !selectedType || !selectedFormat) return

    try {
      const response = await fetch("/api/data-exports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          format: selectedFormat,
          dateRange,
          filters: {},
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Export request submitted successfully!")
        setIsCreateDialogOpen(false)
        setSelectedType("")
        setSelectedFormat("")
        fetchExports() // Refresh the list
      } else {
        toast.error(data.error || "Failed to create export")
      }
    } catch (error) {
      toast.error("An error occurred while creating export")
    }
  }

  const handleDeleteExport = async (exportId: string) => {
    if (!confirm("Are you sure you want to delete this export?")) return

    try {
      const response = await fetch(`/api/data-exports?id=${exportId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Export deleted successfully")
        fetchExports() // Refresh the list
      } else {
        toast.error(data.error || "Failed to delete export")
      }
    } catch (error) {
      toast.error("An error occurred while deleting export")
    }
  }

  const getStatusBadgeColor = (status: ExportStatus) => {
    switch (status) {
      case ExportStatus.COMPLETED:
        return "bg-green-100 text-green-800"
      case ExportStatus.FAILED:
        return "bg-red-100 text-red-800"
      case ExportStatus.PROCESSING:
        return "bg-blue-100 text-blue-800"
      case ExportStatus.CANCELLED:
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const exportTypeDescriptions = {
    [ExportType.PREDICTIONS]: "Export all your prediction data including symbols, values, and accuracy metrics",
    [ExportType.USAGE]: "Export your usage statistics including API calls, predictions, and data exports",
    [ExportType.AUDIT_LOGS]: "Export your audit logs for security and compliance purposes",
    [ExportType.TEAM_DATA]: "Export your team structure and member information",
    [ExportType.BILLING]: "Export your billing and subscription history",
    [ExportType.ANALYTICS]: "Export comprehensive analytics reports and insights",
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
          <h2 className="text-2xl font-bold">Data Exports</h2>
          <p className="text-muted-foreground">Export your data in various formats for analysis and integration</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.download className="mr-2 h-4 w-4" />
              New Export
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Export</DialogTitle>
              <DialogDescription>
                Configure your data export settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="exportType">Export Type</Label>
                <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ExportType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExportType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {exportTypeDescriptions[selectedType]}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="exportFormat">Export Format</Label>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export format" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExportFormat).map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreateExport} 
                disabled={!selectedType || !selectedFormat}
                className="w-full"
              >
                Create Export
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {exports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icons.download className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No exports yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first data export to download your information
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Icons.download className="mr-2 h-4 w-4" />
              Create Export
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exports.map((exportItem) => (
            <Card key={exportItem.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{exportItem.type.replace("_", " ")}</span>
                      <Badge className={getStatusBadgeColor(exportItem.status)}>
                        {exportItem.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {exportItem.format.toUpperCase()} format • Created {format(exportItem.createdAt, "MMM dd, yyyy HH:mm")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {exportItem.status === ExportStatus.COMPLETED && exportItem.filePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exportItem.filePath, "_blank")}
                      >
                        <Icons.download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteExport(exportItem.id)}
                    >
                      <Icons.trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Format</p>
                    <p className="text-sm text-muted-foreground">{exportItem.format}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">File Size</p>
                    <p className="text-sm text-muted-foreground">
                      {exportItem.fileSize ? formatFileSize(exportItem.fileSize) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {exportItem.completedAt ? format(exportItem.completedAt, "MMM dd, yyyy HH:mm") : "N/A"}
                    </p>
                  </div>
                </div>

                {exportItem.error && (
                  <Alert className="mt-4">
                    <Icons.alert className="h-4 w-4" />
                    <AlertDescription>
                      Export failed: {exportItem.error}
                    </AlertDescription>
                  </Alert>
                )}

                {exportItem.status === ExportStatus.PROCESSING && (
                  <Alert className="mt-4">
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Your export is being processed. You'll receive a notification when it's ready for download.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}