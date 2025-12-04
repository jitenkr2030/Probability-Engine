"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"

interface WhiteLabelSettings {
  id?: string
  companyName?: string
  logo?: string
  favicon?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  customDomain?: string
  isDomainVerified?: boolean
  customCSS?: string
  customJS?: string
  hideBranding?: boolean
  customFooter?: string
}

interface WhiteLabelManagerProps {
  userId: string
  userSubscription?: any
}

export function WhiteLabelManager({ userId, userSubscription }: WhiteLabelManagerProps) {
  const { data: session } = useSession()
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    accentColor: "#10b981",
    customDomain: "",
    customCSS: "",
    customJS: "",
    hideBranding: false,
    customFooter: "",
  })

  useEffect(() => {
    if (userSubscription?.plan === "ENTERPRISE") {
      fetchWhiteLabelSettings()
    }
  }, [userSubscription])

  const fetchWhiteLabelSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/white-label")
      const data = await response.json()
      
      if (response.ok) {
        setWhiteLabel(data)
        setFormData({
          companyName: data.companyName || "",
          primaryColor: data.primaryColor || "#3b82f6",
          secondaryColor: data.secondaryColor || "#64748b",
          accentColor: data.accentColor || "#10b981",
          customDomain: data.customDomain || "",
          customCSS: data.customCSS || "",
          customJS: data.customJS || "",
          hideBranding: data.hideBranding || false,
          customFooter: data.customFooter || "",
        })
      } else {
        toast.error("Failed to load white-label settings")
      }
    } catch (error) {
      toast.error("An error occurred while fetching white-label settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!session?.user?.id) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/white-label", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (response.ok) {
        setWhiteLabel(data)
        toast.success("White-label settings saved successfully!")
      } else {
        toast.error(data.error || "Failed to save settings")
      }
    } catch (error) {
      toast.error("An error occurred while saving settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!session?.user?.id) return

    const formData = new FormData()
    formData.append(type, file)
    formData.append("companyName", formData.companyName)
    formData.append("primaryColor", formData.primaryColor)
    formData.append("secondaryColor", formData.secondaryColor)
    formData.append("accentColor", formData.accentColor)
    formData.append("customDomain", formData.customDomain)
    formData.append("customCSS", formData.customCSS)
    formData.append("customJS", formData.customJS)
    formData.append("hideBranding", formData.hideBranding.toString())
    formData.append("customFooter", formData.customFooter)

    setIsSaving(true)
    try {
      const response = await fetch("/api/white-label", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      
      if (response.ok) {
        setWhiteLabel(data)
        toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`)
      } else {
        toast.error(data.error || `Failed to upload ${type}`)
      }
    } catch (error) {
      toast.error(`An error occurred while uploading ${type}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!formData.customDomain) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/white-label", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify_domain",
          domain: formData.customDomain,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setWhiteLabel(data.whiteLabel)
        toast.success("Domain verified successfully!")
      } else {
        toast.error(data.error || "Failed to verify domain")
      }
    } catch (error) {
      toast.error("An error occurred while verifying domain")
    } finally {
      setIsSaving(false)
    }
  }

  if (userSubscription?.plan !== "ENTERPRISE") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icons.crown className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Enterprise Feature</h3>
          <p className="text-muted-foreground text-center mb-4">
            White-label and branding options are only available for Enterprise subscribers.
          </p>
          <Button onClick={() => document.querySelector('[value="subscription"]')?.click()}>
            Upgrade to Enterprise
          </Button>
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
          <h2 className="text-2xl font-bold">White-Label & Branding</h2>
          <p className="text-muted-foreground">Customize the platform with your own branding</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Icons.eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Branding Preview</DialogTitle>
                <DialogDescription>
                  Preview how your branding will look on the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div 
                  className="p-6 rounded-lg border"
                  style={{ 
                    backgroundColor: formData.primaryColor + "20",
                    borderColor: formData.primaryColor,
                  }}
                >
                  <div className="flex items-center space-x-4">
                    {whiteLabel?.logo && (
                      <img 
                        src={whiteLabel.logo} 
                        alt="Logo" 
                        className="h-12 w-12 object-contain"
                      />
                    )}
                    <div>
                      <h3 
                        className="text-xl font-bold"
                        style={{ color: formData.primaryColor }}
                      >
                        {formData.companyName || "Your Company"}
                      </h3>
                      <p style={{ color: formData.secondaryColor }}>
                        Powered by Probability Engine
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className="p-4 rounded text-white text-center"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    Primary Color
                  </div>
                  <div 
                    className="p-4 rounded text-white text-center"
                    style={{ backgroundColor: formData.secondaryColor }}
                  >
                    Secondary Color
                  </div>
                  <div 
                    className="p-4 rounded text-white text-center"
                    style={{ backgroundColor: formData.accentColor }}
                  >
                    Accent Color
                  </div>
                </div>
                
                {formData.customFooter && (
                  <div className="p-4 border-t">
                    <p className="text-sm text-center">{formData.customFooter}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Domain Status */}
      {formData.customDomain && (
        <Alert>
          <Icons.globe className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Custom Domain: {formData.customDomain}
                {whiteLabel?.isDomainVerified && (
                  <Badge className="ml-2">Verified</Badge>
                )}
              </span>
              {!whiteLabel?.isDomainVerified && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleVerifyDomain}
                  disabled={isSaving}
                >
                  Verify Domain
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic company details and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter your company name"
              />
            </div>

            <div>
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                value={formData.customDomain}
                onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value }))}
                placeholder="yourdomain.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add a CNAME record pointing to our platform
              </p>
            </div>

            <div>
              <Label htmlFor="customFooter">Custom Footer</Label>
              <Textarea
                id="customFooter"
                value={formData.customFooter}
                onChange={(e) => setFormData(prev => ({ ...prev, customFooter: e.target.value }))}
                placeholder="Custom footer text or HTML"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="hideBranding"
                checked={formData.hideBranding}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hideBranding: checked }))}
              />
              <Label htmlFor="hideBranding">Hide Probability Engine branding</Label>
            </div>
          </CardContent>
        </Card>

        {/* Brand Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Assets</CardTitle>
            <CardDescription>Upload your logo and favicon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo">Company Logo</Label>
              <div className="mt-2">
                {whiteLabel?.logo ? (
                  <div className="flex items-center space-x-4">
                    <img 
                      src={whiteLabel.logo} 
                      alt="Company Logo" 
                      className="h-16 w-16 object-contain border rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleFileUpload(file, "logo")
                        }
                        input.click()
                      }}
                    >
                      Replace Logo
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Icons.upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload your company logo
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleFileUpload(file, "logo")
                        }
                        input.click()
                      }}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: PNG or SVG, max 2MB
              </p>
            </div>

            <div>
              <Label htmlFor="favicon">Favicon</Label>
              <div className="mt-2">
                {whiteLabel?.favicon ? (
                  <div className="flex items-center space-x-4">
                    <img 
                      src={whiteLabel.favicon} 
                      alt="Favicon" 
                      className="h-8 w-8 object-contain border rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleFileUpload(file, "favicon")
                        }
                        input.click()
                      }}
                    >
                      Replace Favicon
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Icons.upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload your favicon
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleFileUpload(file, "favicon")
                        }
                        input.click()
                      }}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: ICO or PNG, 32x32px, max 1MB
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>Customize the colors used throughout the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-12 border rounded cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-12 h-12 border rounded cursor-pointer"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="color"
                  id="accentColor"
                  value={formData.accentColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="w-12 h-12 border rounded cursor-pointer"
                />
                <Input
                  value={formData.accentColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Custom CSS</CardTitle>
            <CardDescription>Add custom CSS styles to further customize the appearance</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.customCSS}
              onChange={(e) => setFormData(prev => ({ ...prev, customCSS: e.target.value }))}
              placeholder="/* Add your custom CSS here */"
              rows={8}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom JavaScript</CardTitle>
            <CardDescription>Add custom JavaScript for additional functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.customJS}
              onChange={(e) => setFormData(prev => ({ ...prev, customJS: e.target.value }))}
              placeholder="/* Add your custom JavaScript here */"
              rows={8}
              className="font-mono text-sm"
            />
            <Alert className="mt-4">
              <Icons.alert className="h-4 w-4" />
              <AlertDescription>
                Custom JavaScript runs on all pages. Use with caution and only add trusted code.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}