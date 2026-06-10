
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, User, Bell, Lock, Eye, EyeOff, ArrowLeft, Palette, Globe, Mail, Calendar, Save, Phone, Building2, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { getSingleUser, updateUser, updatePassword, getCompanysById, UpdateLeave, getActiveSessions, revokeAuthSession, revokeOtherAuthSessions } from "@/services/Service";
import { useToast } from '@/hooks/use-toast';
import { usePreferences } from "@/contexts/PreferencesContext";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  // const [userData, setUserData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState(null);
  const [newPasswordShow, setNewPasswordShow] = useState(false);
  const [confirmPasswordShow, setConfirmPasswordShow] = useState(false);
  const [leaves, setLeaves] = useState({ totalLeave: "", specialLeave: "" })
  const [attendanceRules, setAttendanceRules] = useState({
    clockInTime: "09:00",
    fullDayHours: "8",
    halfDayHours: "4",
  });
  const { preferences, saving: savingPreferences, savePreferences } = usePreferences();
  const [savingCompanySettings, setSavingCompanySettings] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsActionId, setSessionsActionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const languageOptions = ["en", "es", "fr", "de"];

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
      setLeaves({
        totalLeave: companyDetail?.totalLeave ?? "",
        specialLeave: companyDetail?.specialLeave ?? "",
      });
      setAttendanceRules({
        clockInTime: companyDetail?.attendanceRules?.clockInTime || "09:00",
        fullDayHours: String(companyDetail?.attendanceRules?.fullDayHours ?? 8),
        halfDayHours: String(companyDetail?.attendanceRules?.halfDayHours ?? 4),
      });
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

  const resolveCompanyId = () => {
    const companyId = user?.companyId;
    if (!companyId) return user?.createdBy?._id || user?.createdBy || null;
    return typeof companyId === "object" ? companyId._id : companyId;
  };

  const handleUpdateCompanySettings = async () => {
    const companyId = resolveCompanyId();
    if (!companyId) {
      toast({ title: t("common.error"), description: t("settings.companyIdMissing"), variant: "destructive" });
      return;
    }

    setSavingCompanySettings(true);
    const obj = {
      adminId: user?._id,
      companyId,
      totalLeave: leaves?.totalLeave,
      specialLeave: leaves?.specialLeave,
      attendanceRules: {
        clockInTime: attendanceRules.clockInTime,
        fullDayHours: Number(attendanceRules.fullDayHours),
        halfDayHours: Number(attendanceRules.halfDayHours),
      },
    };

    try {
      const res = await UpdateLeave(obj);
      if (res.status === 200) {
        toast({ title: t("settings.companySettingsUpdated"), description: res.data.message });
        setSettingRefresh(true);
      }
    } catch (err) {
      console.log(err);
      toast({
        title: t("common.error"),
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setSavingCompanySettings(false);
    }
  };

  const handleSavePreferences = async (
    nextPreferences = preferences,
    successTitle = t("common.success"),
    successDescription = t("settings.notificationSavedDesc"),
  ) => {
    const saved = await savePreferences(nextPreferences);
    if (saved) {
      toast({
        title: successTitle,
        description: successDescription,
      });
      return;
    }

    toast({
      title: t("common.error"),
      description: t("settings.preferencesError"),
      variant: "destructive",
    });
  };

  const handleLanguageChange = async (language: string) => {
    const nextPreferences = { ...preferences, language };
    await handleSavePreferences(
      nextPreferences,
      t("settings.languageUpdatedTitle"),
      t("settings.languageUpdatedDesc", {
        language: t(`languages.${language}`),
      }),
    );
  };

  const handleCompactViewChange = async (compactView: boolean) => {
    const nextPreferences = { ...preferences, compactView };
    await handleSavePreferences(
      nextPreferences,
      compactView ? t("settings.compactOnTitle") : t("settings.compactOffTitle"),
      compactView ? t("settings.compactOnDesc") : t("settings.compactOffDesc"),
    );
  };

  const handleNotificationToggle = async (
    key: keyof typeof preferences.notifications,
    checked: boolean,
  ) => {
    const nextPreferences = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: checked,
      },
    };
    await handleSavePreferences(
      nextPreferences,
      t("settings.notificationSavedTitle"),
      t("settings.notificationSavedDesc"),
    );
  };

  const handleGetCompanyDetail = async () => {

    const companyId = user?.companyId?._id || user?.createdBy?._id;
    if (!companyId) return toast({ title: t("common.error"), description: t("settings.companyIdMissing"), variant: "destructive" })
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

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await getActiveSessions();
      setSessions(res.data?.sessions || []);
    } catch (err) {
      toast({
        title: t("common.error"),
        description: t("settings.sessionsLoadFailed"),
        variant: "destructive",
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const handleRevokeSession = async (sessionId: string) => {
    setSessionsActionId(sessionId);
    try {
      await revokeAuthSession(sessionId);
      toast({ title: t("settings.sessionsRevoked") });
      await loadSessions();
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err?.response?.data?.message || t("common.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setSessionsActionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setSessionsActionId("others");
    try {
      await revokeOtherAuthSessions();
      toast({ title: t("settings.sessionsOthersRevoked") });
      await loadSessions();
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err?.response?.data?.message || t("common.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setSessionsActionId(null);
    }
  };

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
        toast({ title: t("settings.profileSaved"), description: res?.data?.message });
        setSettingRefresh(true);
      }
    } catch (err) {
      console.log(err);
      toast({ title: t("common.error"), description: err?.response?.data?.message || t("common.somethingWentWrong") });

    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: t("common.error"), description: t("settings.passwordRequired") }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: t("settings.passwordMismatch") }); return;
    }
    try {
      const res = await updatePassword(user?._id, userData?.email, newPassword, user?.role === "employee" ? user?.createdBy?._id : user?.companyId?._id);
      if (res.status === 200) {
        toast({ title: t("settings.passwordChanged"), description: res?.data?.message });
        setNewPassword("");
        setConfirmPassword("");
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: t("common.error"), description: err?.response?.data?.message || t("common.somethingWentWrong") });
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
        <title>{t("settings.pageTitle")}</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <div className="space-y-6 max-w-4xl md:ml-28">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t("settings.profileTitle")}
            </CardTitle>
            <CardDescription>{t("settings.profileDescription")}</CardDescription>
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
                <Button type='button' variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{t("common.changeAvatar")}</Button>
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
                  {t("common.avatarHint")}
                </p>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.role === "admin" || user?.role === "super_admin" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">{t("common.fullName")}</Label>
                    <Input id="username" value={formData.username} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">{t("common.phone")}</Label>
                    <Input id="mobile" value={formData.mobile} maxLength={10} onChange={handleChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("common.fullName")}</Label>
                    <Input id="fullName" value={formData.fullName} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">{t("common.phone")}</Label>
                    <Input id="contact" value={formData.contact} onChange={handleChange} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" defaultValue={userData?.email} className="pl-10" disabled />
                </div>
              </div>

              {user?.role === "employee" && (
                <div className="space-y-2">
                  <Label htmlFor="department">{t("common.department")}</Label>
                  <Input id="department" value={userData?.department?.name || ""} disabled />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{t("common.joined")}: {formatDate(userData?.createdAt)}</span>
            </div>

            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {user?.role !== "super_admin" &&
          <Card>
            <CardHeader>
              <CardTitle>{user?.role === "admin" ? t("settings.companyInfoAdmin") : t("settings.companyInfoEmployee")}</CardTitle>
              <CardDescription>
                {user?.role === "admin" ? t("settings.companyInfoAdminDesc") : t("settings.companyInfoEmployeeDesc")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">

              {/* ================= Company Details ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Company Name */}
                <div className="space-y-2">
                  <Label>{t("common.companyName")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.name} disabled className="pl-10" />
                  </div>
                </div>

                {/* Company Phone */}
                <div className="space-y-2">
                  <Label>{t("common.companyPhone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.contactNumber} disabled className="pl-10" />
                  </div>
                </div>

                {/* Company Email */}
                <div className="space-y-2">
                  <Label>{t("common.companyEmail")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.email} disabled className="pl-10" />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label>{t("common.websiteUrl")}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={companyDetail?.website} disabled className="pl-10" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-6">
                  <Calendar className="w-4 h-4" />
                  <span>{t("common.createdAt")}: {formatDate(companyDetail?.createdAt)}</span>
                </div>

              </div>

              {/* Divider */}
              {user?.role === "employee" && <> <div className="border-t pt-6" />

                {/* ================= Admin Details ================= */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t("common.adminDetails")}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label>{t("common.fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={companyDetail?.admins[0]?.username} disabled className="pl-10" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("common.adminPhone")}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={companyDetail?.admins[0]?.mobile} disabled className="pl-10" />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>{t("common.adminEmail")}</Label>
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
                  <span>{t("common.joined")}: {formatDate(userData?.createdAt)}</span>
                </div>
              </>}
            </CardContent>
          </Card>}

        {user?.role === "admin" && <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t("settings.leaveTitle")}
              </CardTitle>
              <CardDescription>{t("settings.leaveDescription")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalLeaves">{t("settings.totalLeaves")}</Label>
                  <Input
                    id="totalLeaves"
                    type="number"
                    value={leaves.totalLeave}
                    onChange={(e) => { setLeaves({ ...leaves, totalLeave: e.target.value }) }}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialLeave">{t("settings.specialLeave")}</Label>
                  <Input
                    id="specialLeave"
                    type="number"
                    value={leaves.specialLeave}
                    onChange={(e) => { setLeaves({ ...leaves, specialLeave: e.target.value }) }}
                    min={0}
                  />
                </div>
              </div>

              <div className="flex justify-start mt-2">
                <Button onClick={handleUpdateCompanySettings} disabled={savingCompanySettings}>
                  <Save className="w-4 h-4 mr-2" />
                  {savingCompanySettings ? t("common.saving") : t("settings.saveLeaveSettings")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-primary" />
                {t("settings.attendanceTitle")}
              </CardTitle>
              <CardDescription>{t("settings.attendanceDescription")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clockInTime">{t("settings.clockInTime")}</Label>
                  <Input
                    id="clockInTime"
                    type="time"
                    value={attendanceRules.clockInTime}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, clockInTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullDayHours">{t("settings.fullDayHours")}</Label>
                  <Input
                    id="fullDayHours"
                    type="number"
                    min={1}
                    value={attendanceRules.fullDayHours}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, fullDayHours: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="halfDayHours">{t("settings.halfDayHours")}</Label>
                  <Input
                    id="halfDayHours"
                    type="number"
                    min={1}
                    value={attendanceRules.halfDayHours}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, halfDayHours: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleUpdateCompanySettings} disabled={savingCompanySettings}>
                <Save className="w-4 h-4 mr-2" />
                {savingCompanySettings ? t("common.saving") : t("settings.saveAttendanceRules")}
              </Button>
            </CardContent>
          </Card>
        </>}

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {t("settings.notificationsTitle")}
            </CardTitle>
            <CardDescription>{t("settings.notificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.emailNotifications")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.emailNotificationsDesc")}</p>
              </div>
              <Switch
                checked={preferences.notifications.email}
                disabled={savingPreferences}
                onCheckedChange={(checked) => handleNotificationToggle("email", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.taskReminders")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.taskRemindersDesc")}</p>
              </div>
              <Switch
                checked={preferences.notifications.tasks}
                disabled={savingPreferences}
                onCheckedChange={(checked) => handleNotificationToggle("tasks", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.leaveUpdates")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.leaveUpdatesDesc")}</p>
              </div>
              <Switch
                checked={preferences.notifications.leave}
                disabled={savingPreferences}
                onCheckedChange={(checked) => handleNotificationToggle("leave", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.expenseUpdates")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.expenseUpdatesDesc")}</p>
              </div>
              <Switch
                checked={preferences.notifications.expenses}
                disabled={savingPreferences}
                onCheckedChange={(checked) => handleNotificationToggle("expenses", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              {t("settings.sessionsTitle")}
            </CardTitle>
            <CardDescription>{t("settings.sessionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.sessionsEmpty")}</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.deviceLabel}</p>
                        {session.current ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {t("settings.sessionsCurrent")}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.sessionsLastActive")}: {formatDate(session.lastActiveAt)}
                      </p>
                      {session.ipAddress ? (
                        <p className="text-sm text-muted-foreground">
                          {t("settings.sessionsIp")}: {session.ipAddress}
                        </p>
                      ) : null}
                    </div>
                    {!session.current ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sessionsActionId === session.sessionId}
                        onClick={() => handleRevokeSession(session.sessionId)}
                      >
                        {t("settings.sessionsRevoke")}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              disabled={sessionsLoading || sessionsActionId === "others" || sessions.length <= 1}
              onClick={handleRevokeOtherSessions}
            >
              {t("settings.sessionsRevokeOthers")}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {t("settings.securityTitle")}
            </CardTitle>
            <CardDescription>{t("settings.securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("common.newPassword")}</Label>

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
                <Label htmlFor="confirm-password">{t("common.confirmPassword")}</Label>

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

            <Button variant="outline" disabled={!newPassword || !confirmPassword} onClick={handleUpdatePassword}>{t("common.updatePassword")}</Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              {t("settings.preferencesTitle")}
            </CardTitle>
            <CardDescription>{t("settings.preferencesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("settings.language")}</p>
                  <p className="text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
                </div>
              </div>
              <select
                className="px-3 py-2 rounded-md border bg-background"
                value={preferences.language}
                disabled={savingPreferences}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {languageOptions.map((code) => (
                  <option key={code} value={code}>
                    {t(`languages.${code}`)}
                  </option>
                ))}
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.compactView")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.compactViewDesc")}</p>
              </div>
              <Switch
                checked={preferences.compactView}
                disabled={savingPreferences}
                onCheckedChange={handleCompactViewChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Settings;

