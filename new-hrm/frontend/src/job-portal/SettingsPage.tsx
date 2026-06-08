import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Settings,
  Mail,
  Lock,
  LogOut,
  Save,
  Globe,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const SettingsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Settings | Job Portal</title>
      </Helmet>

      <div className="container mx-auto p-6 space-y-8 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account, preferences, and portal configurations.
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-gray-100/80">
            <TabsTrigger value="general" className="gap-2 py-2">
              <Settings className="h-4 w-4" /> <span className="hidden md:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 py-2">
              <User className="h-4 w-4" /> <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 py-2">
              <Bell className="h-4 w-4" /> <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 py-2">
              <CreditCard className="h-4 w-4" /> <span className="hidden md:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 py-2">
              <Shield className="h-4 w-4" /> <span className="hidden md:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Portal Configuration</CardTitle>
                <CardDescription>
                  Configure general settings for your job portal instance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="portalName">Portal Name</Label>
                    <Input id="portalName" defaultValue="Office Harmony Hub" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input id="supportEmail" type="email" defaultValue="support@harmonyhub.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (US)</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC (Greenwich Mean Time)</SelectItem>
                        <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                        <SelectItem value="ist">IST (Indian Standard Time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t px-6 py-4">
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and public profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">Change Avatar</Button>
                    <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" defaultValue="Admin User" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue="Super Admin" disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="admin@harmonyhub.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" defaultValue="+1 (555) 000-0000" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t px-6 py-4">
                <Button>Save Profile</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive alerts and updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Email Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">New Applications</Label>
                      <p className="text-sm text-muted-foreground">Receive emails when a new candidate applies.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Job Status Updates</Label>
                      <p className="text-sm text-muted-foreground">Alerts when a job post expires or is closed.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Weekly Digest</Label>
                      <p className="text-sm text-muted-foreground">Summary of weekly activities an stats.</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified about suspicious login attempts.</p>
                    </div>
                    <Switch defaultChecked disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="space-y-6 mt-6">
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none">
              <CardContent className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 font-medium mb-1">Current Plan</p>
                    <h2 className="text-4xl font-bold">Enterprise Plan</h2>
                    <p className="text-blue-100 mt-2">Billed annually. Next invoice on April 24, 2025.</p>
                  </div>
                  <Button variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">Upgrade Plan</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage your payment details and billing address.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 border p-4 rounded-lg">
                  <div className="h-10 w-16 bg-gray-100 rounded flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2026</p>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Ensure your account is secure by using a strong password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="currentPass">Current Password</Label>
                  <Input id="currentPass" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPass">New Password</Label>
                  <Input id="newPass" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPass">Confirm Password</Label>
                  <Input id="confirmPass" type="password" />
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 border-t">
                <Button variant="destructive" className="mr-4">Log Out All Devices</Button>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </>
  );
};

export default SettingsPage;
