"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"

interface Profile {
  id: string
  company?: string
  phone?: string
  address?: string
  country?: string
  timezone: string
  language: string
  bio?: string
  website?: string
  socialLinks?: any
}

interface ProfileManagerProps {
  profile?: Profile
  onProfileUpdate: () => void
}

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
]

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
]

const countries = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "AU", label: "Australia" },
]

export function ProfileManager({ profile, onProfileUpdate }: ProfileManagerProps) {
  const { data: session } = useSession()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editProfile, setEditProfile] = useState({
    company: profile?.company || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    country: profile?.country || "",
    timezone: profile?.timezone || "UTC",
    language: profile?.language || "en",
    bio: profile?.bio || "",
    website: profile?.website || "",
    socialLinks: profile?.socialLinks || {},
  })

  const handleUpdateProfile = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editProfile),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Profile updated successfully!")
        setIsEditDialogOpen(false)
        onProfileUpdate()
      } else {
        toast.error(data.error || "Failed to update profile")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Avatar updated successfully!")
        onProfileUpdate()
      } else {
        toast.error(data.error || "Failed to update avatar")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getSocialLinkIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter":
        return <Icons.twitter className="h-4 w-4" />
      case "linkedin":
        return <Icons.linkedin className="h-4 w-4" />
      case "github":
        return <Icons.gitHub className="h-4 w-4" />
      case "website":
        return <Icons.globe className="h-4 w-4" />
      default:
        return <Icons.link className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Profile Management</h2>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your personal information and preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={editProfile.company}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editProfile.phone}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Your phone number"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={editProfile.address}
                  onChange={(e) => setEditProfile(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Your address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={editProfile.country} onValueChange={(value) => setEditProfile(prev => ({ ...prev, country: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={editProfile.timezone} onValueChange={(value) => setEditProfile(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={editProfile.language} onValueChange={(value) => setEditProfile(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={editProfile.website}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editProfile.bio}
                  onChange={(e) => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleUpdateProfile} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your basic profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={session?.user?.image} />
                  <AvatarFallback className="text-2xl">
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90">
                  <Icons.camera className="h-4 w-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isLoading}
                />
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold">{session?.user?.name}</h3>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              {profile?.company && (
                <div className="flex items-center space-x-2">
                  <Icons.building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.company}</span>
                </div>
              )}
              
              {profile?.phone && (
                <div className="flex items-center space-x-2">
                  <Icons.phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              
              {profile?.address && (
                <div className="flex items-center space-x-2">
                  <Icons.mapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.address}</span>
                </div>
              )}
              
              {profile?.website && (
                <div className="flex items-center space-x-2">
                  <Icons.globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Your account settings and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Timezone</span>
                <span className="text-sm text-muted-foreground">{profile?.timezone || "UTC"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Language</span>
                <span className="text-sm text-muted-foreground">
                  {languages.find(l => l.value === profile?.language)?.label || "English"}
                </span>
              </div>
              
              {profile?.country && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Country</span>
                  <span className="text-sm text-muted-foreground">
                    {countries.find(c => c.value === profile.country)?.label}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Social Links Card */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>Your connected social profiles</CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.socialLinks && Object.keys(profile.socialLinks).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(profile.socialLinks).map(([platform, url]) => (
                  <div key={platform} className="flex items-center space-x-2">
                    {getSocialLinkIcon(platform)}
                    <a 
                      href={url as string} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {platform}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No social links added</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bio Section */}
      {profile?.bio && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}