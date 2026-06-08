
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, User, Bell, Lock, Eye, EyeOff, ArrowLeft, Palette, Globe, Mail, Calendar, Save, Phone, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { getSingleUser, updateUser, updatePassword, getCompanysById, UpdateLeave } from "@/services/Service";
import { useToast } from '@/hooks/use-toast';
import { Helmet } from "react-helmet-async";
import { getSetting, getCompanyDetail } from "@/redux-toolkit/slice/allPage/settingSlice";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { socket } from "@/socket/socket";

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";

  const dateObj: Date = new Date(isoDate);
  if (isNaN(dateObj.getTime())) return "-"; // handle invalid dates

  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return dateObj.toLocaleString("en-US", options);
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // const [userData, setUserData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState(null);
  const [newPasswordShow, setNewPasswordShow] = useState(false);
  const [confirmPasswordShow, setConfirmPasswordShow] = useState(false);
  const [leaves, setLeaves] = useState({ totalLeave: "", specialLeave: "" })
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    username: "",
    mobile: "",
    fullName: "",
    contact: "",
    profileImage: "",
  });
  const [settingRefresh, setSettingRefresh] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  // const [companyDetail, setCompanyDetail] = useState(null);


  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.setting.setting);
  const companyDetail = useAppSelector((state) => state.setting?.companyDetail);


  useEffect(() => {
    if (companyDetail !== null) {
      setLeaves({ totalLeave: companyDetail?.totalLeave, specialLeave: companyDetail?.specialLeave })
    }
  }, [companyDetail])

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "super_admin") {
      setFormData({
        username: userData?.username || "",
        mobile: userData?.mobile || "",
        fullName: "",
        contact: "",
        profileImage: userData?.profileImage || "",
      });
    } else {
      setFormData({
        username: "",
        mobile: "",
        fullName: userData?.fullName || "",
        contact: userData?.contact || "",
        profileImage: userData?.profileImage || "",
      });
    }
  }, [userData]);

  const handleUpdateLeave = async () => {
    let obj = { adminId: user?._id, companyId: user?.companyId?._id, specialLeave: leaves?.specialLeave }
    try {
      const res = await UpdateLeave(obj);
      if (res.status === 200) {
        toast({ title: "Update Leave Count.", description: res.data.message });
        setSettingRefresh(true);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error Update Leave.", description: err?.response?.data?.message, variant: "destructive" })
    }
  }

  const handleGetCompanyDetail = async () => {

    const companyId = user?.companyId?._id || user?.createdBy?._id;
    if (!companyId) return toast({ title: "Error CompanyId.", description: "Company Id Not Found.", variant: "destructive" })
    try {
      const res = await getCompanysById(companyId);

      if (res.status === 200) {
        // setCompanyDetail(res?.data)
        dispatch(getCompanyDetail(res.data))
      }
    }
    catch (err) {
      console.log(err);
    }
  }
  useEffect(() => {
    if (user?.role !== "super_admin" && (Object.keys(companyDetail ?? {})?.length === 0 || settingRefresh)) {
      handleGetCompanyDetail()
    }
  }, [settingRefresh, companyDetail])

  const fetchUser = async () => {
    setPageLoading(true);
    try {
      const res = await getSingleUser(user?._id, user?.role === "employee" ? user?.createdBy?._id : user?.companyId?._id);
      if (res.status === 200) {
        dispatch(getSetting(res.data.user));
        setSettingRefresh(false);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setPageLoading(false);
    }
  };
  // Fetch user on mount
  useEffect(() => {

    if (user && (userData === null || Object.keys(userData).length === 0 || settingRefresh)) {
      fetchUser();
    }
  }, [user, settingRefresh]);



  // Generic input change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Save user data
  const handleSave = async () => {
    try {
      let dataToSend: any = {};
      let userData = JSON.parse(localStorage.getItem("user"));
      if (user?.role === "admin" || user?.role === "super_admin") {
        dataToSend = {
          username: formData.username,
          mobile: formData.mobile,
          profileImage: formData.profileImage,
        };
      } else {
        dataToSend = {
          fullName: formData.fullName,
          contact: formData.contact,
          profileImage: formData.profileImage,
        };
      }

      const res = await updateUser(user?._id, user?.role === "employee" ? user?.createdBy?._id : user?.companyId?._id, dataToSend);

      if (res.status === 200) {

        if (userData?.username) {
          userData.username = formData?.username;
        }
        else {
          userData.fullName = formData?.fullName;
        }
        localStorage.setItem("user", JSON.stringify(userData));
        socket.emit("refreshProfile");
        toast({ title: `Profile Update Successfully.`, description: res?.data?.message });
        setSettingRefresh(true);
      }
    } catch (err) {
      console.log(err);
      toast({ title: "Error", description: err?.response?.data?.message || "Something went wrong" });

    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Password Or Confirm Password Is Required." }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Your Password Did Not Match." }); return;
    }
    try {
      const res = await updatePassword(user?._id, userData?.email, newPassword, user?.role === "employee" ? user?.createdBy?._id : user?.companyId?._id);
      if (res.status === 200) {
        toast({ title: `Password Changed.`, description: res?.data?.message });
        setNewPassword("");
        setConfirmPassword("");
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err?.response?.data?.message || "Something went wrong" });
    }
  }


  if (pageLoading && (userData === null || Object.keys(userData).length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Setting Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <div className="space-y-6 max-w-4xl md:ml-28">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              {/* Avatar Preview */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {(userData?.username || userData?.fullName || "U").charAt(0)}
                  </span>
                )}
              </div>

              {/* Change Avatar */}
              <div className="flex flex-col gap-2">
                {/* <label htmlFor="profileImageInput"> */}
                <Button type='button' variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Change Avatar</Button>
                {/* </label> */}
                <input
                  type="file"
                  id="profileImageInput"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData((prev) => ({ ...prev, profileImage: reader.result as string }));
                      };
                      reader.readAsDataURL(file); // convert image to base64
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 2MB
                </p>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.role === "admin" || user?.role === "super_admin" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Full Name</Label>
                    <Input id="username" value={formData.username} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Phone</Label>
                    <Input id="mobile" value={formData.mobile} maxLength={10} onChange={handleChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={formData.fullName} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Phone</Label>
                    <Input id="contact" value={formData.contact} onChange={handleChange} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" defaultValue={userData?.email} className="pl-10" disabled />
                </div>
              </div>

              {user?.role === "employee" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={userData?.department?.name || ""} disabled />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Joined: {formatDate(userData?.createdAt)}</span>
            </div>

            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {user?.role !== "super_admin" &&
          <Card>
            <CardHeader>
              <CardTitle>{user?.role === "admin" ? "Company Information." : "Company & Admin Information."}</CardTitle>
              <CardDescription>
                {user?.role === "admin" ? "View our company details." : "View your company and admin details."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">

              {/* ================= Company Details ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Company Name */}
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.name} disabled className="pl-10" />
                  </div>
                </div>

                {/* Company Phone */}
                <div className="space-y-2">
                  <Label>Company Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.contactNumber} disabled className="pl-10" />
                  </div>
                </div>

                {/* Company Email */}
                <div className="space-y-2">
                  <Label>Company Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.email} disabled className="pl-10" />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label>Website Url</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.website} disabled className="pl-10" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-6">
                  <Calendar className="w-4 h-4" />
                  <span>CreatedAt :- {formatDate(companyDetail?.createdAt)}</span>
                </div>

              </div>

              {/* Divider */}
              {user?.role === "employee" && <> <div className="border-t pt-6" />

                {/* ================= Admin Details ================= */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Admin Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={companyDetail?.admins[0]?.username} disabled className="pl-10" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Admin Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={companyDetail?.admins[0]?.mobile} disabled className="pl-10" />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Admin Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={userData?.email} disabled className="pl-10" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Joined Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-6">
                  <Calendar className="w-4 h-4" />
                  <span>Joined: {formatDate(userData?.createdAt)}</span>
                </div>
              </>}
            </CardContent>
          </Card>}

        {user?.role === "admin" && <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Leave Settings
              </CardTitle>
              <CardDescription>Update company leave allocations</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {/* Total Leaves */}
                {/* <div className="space-y-2">
                  <Label htmlFor="totalLeaves">Total Leaves</Label>
                  <Input
                    id="totalLeaves"
                    type="number"
                    value={leaves.totalLeave}
                    onChange={(e) => { setLeaves({ ...leaves, totalLeave: e.target.value }) }}
                    min={0}
                  />
                </div> */}

                {/* Special Leave */}
                <div className="space-y-2">
                  <Label htmlFor="specialLeave">Special Leave</Label>
                  <Input
                    id="specialLeave"
                    type="number"
                    value={leaves.specialLeave}
                    onChange={(e) => { setLeaves({ ...leaves, specialLeave: e.target.value }) }}
                    min={0}
                  />
                </div>
              </div>

              {/* Change Button */}
              <div className="flex justify-start mt-2">
                <Button onClick={handleUpdateLeave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>

            </CardContent>
          </Card>
        </>}

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email for important updates</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Task Reminders</p>
                <p className="text-sm text-muted-foreground">Get notified about task deadlines</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Leave Updates</p>
                <p className="text-sm text-muted-foreground">Notifications for leave request status</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Expense Updates</p>
                <p className="text-sm text-muted-foreground">Get notified when expenses are processed</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>

                <div className="relative">
                  <Input
                    id="new-password"
                    value={newPassword}
                    type={newPasswordShow ? "text" : "password"}
                    placeholder="••••••••"
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setNewPasswordShow((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {newPasswordShow ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>

                <div className="relative">
                  <Input
                    id="confirm-password"
                    value={confirmPassword}
                    type={confirmPasswordShow ? "text" : "password"}
                    placeholder="••••••••"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setConfirmPasswordShow((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {confirmPasswordShow ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button variant="outline" disabled={!newPassword || !confirmPassword} onClick={handleUpdatePassword}>Update Password</Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Language</p>
                  <p className="text-sm text-muted-foreground">Select your preferred language</p>
                </div>
              </div>
              <select className="px-3 py-2 rounded-md border bg-background">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Compact View</p>
                <p className="text-sm text-muted-foreground">Show more content with less spacing</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Settings;

