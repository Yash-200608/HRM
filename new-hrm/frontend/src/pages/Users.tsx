import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users as UsersIcon, Plus, Search, MoreHorizontal, ArrowLeft, FileMinus, Award, Mail, FileCheck, Phone, UserPlus, Building2, FileText, Calendar, Edit, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { EmployeeFormDialog } from "@/Forms/EmployeeFormDialog"
import DeleteCard from "@/components/cards/DeleteCard"
import { getEmployees, getAdmins, handleGetPdfLetter, deleteAdmin, updateAdminStatus, updateEmployeeStatus, getRolesList, assignEmployeeRole } from "@/services/Service";
import { useToast } from '@/hooks/use-toast';
import RelieveEmployeeCard from "@/components/cards/RelieveEmployeeCard"
import AdminFormDialog from "@/Forms/AdminFormDialog";
import AdminListCard from "@/components/cards/AdminListCard";
import { Helmet } from "react-helmet-async";
import { formatDate } from "@/services/allFunctions"
import AddManagerForm from "@/task/forms/AddManagerForm";
import { getAdminList, getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { socket } from "@/socket/socket";
import { useTranslation } from "react-i18next";





const Users: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isAdminDialog, setIsAdminDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeeListRefresh, setEmployeeListRefresh] = useState(false);
  const [allLetter, setAllLetter] = useState([]);
  const [showRelieve, setShowRelieve] = useState(false);
  const [adminInitialData, setAdminInitialData] = useState(null);
  const [adminListRefresh, setadminListRefresh] = useState(false);
  const [roles,setRoles] = useState([])
  const [letterCache, setLetterCache] = useState<Record<string, any[]>>({});
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string, type: "pdf" | "image" } | null>({
    name: "",
    url: "",
    type: "image"
  });
  const [isPreview, setIsPreview] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [managerRefresh, setManagerRefresh] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [addManagerData, setAddManagerData] = useState(null);
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const adminList = useAppSelector((state) => state.user.admins);
  const userList = useAppSelector((state) => state.user.employees);


  


  const resolveCompanyId = () => {
    const companyId = user?.companyId;
    if (!companyId) return null;
    return typeof companyId === "object" ? companyId._id : companyId;
  };

  const canAssignRoles =
    user?.role === "admin" ||
    (user as any)?.assignedRole?.permissions?.employees?.edit;

  const deduplicateRoles = (roleList: any[]) => {
    const seen = new Map<string, any>();

    roleList.forEach((role) => {
      const key = role.roleName?.trim().toLowerCase();
      if (!key) return;

      const existing = seen.get(key);
      if (
        !existing ||
        new Date(role.updatedAt || role.createdAt) >=
          new Date(existing.updatedAt || existing.createdAt)
      ) {
        seen.set(key, role);
      }
    });

    return Array.from(seen.values());
  };

  const loadRoles = async () => {
    const companyId = resolveCompanyId();
    if (!companyId) return;

    try {
      const res = await getRolesList(companyId);
      setRoles(deduplicateRoles(res.data || []));
    } catch (err) {
      console.log(err);
      toast({
        title: t("users.failedLoadRoles"),
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    }
  };




  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || u.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    socket.on("getEmployeeRefresh", () => {
      setEmployeeListRefresh(true);
      setManagerRefresh(true);
    });

    return () => {
      socket.off("getEmployeeRefresh");
    };
  }, []);

  useEffect(() => {
    if (canAssignRoles && resolveCompanyId()) {
      loadRoles();
    }
  }, [user, canAssignRoles]);




  const handleUpdateEmployeeStatus = async (id) => {
    let obj = { adminId: user?._id, companyId: user?.companyId?._id, employeeId: id, status: "ACTIVE" }
    try {
      const res = await updateEmployeeStatus(obj);
      if (res.status === 200) {
        setEmployeeListRefresh(true);
        socket.emit("addEmployeeRefresh");
        toast({ title: t("users.employeeStatusActive"), description: res.data.message });
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: t("users.errorEmployeeStatus"), description: err?.response?.data?.message || err?.message, variant: "destructive" })
    }
  }
  const handleGetEmployee = async () => {
    if (!user?.companyId?._id) {
      toast({ title: t("common.error"), description: t("users.companyIdMissing") })
      return;
    }
    try {
      const data = await getEmployees(user?.companyId?._id);
      if (Array.isArray(data)) {
        dispatch(getEmployeeList(data));
        setEmployeeListRefresh(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleGetAdmins = async () => {
    if (!user?._id) {
      toast({ title: t("common.error"), description: t("users.userIdMissing") })
      return;
    }
    try {
      const data = await getAdmins(user?._id);

      if (Array.isArray(data?.data?.admins)) {
        dispatch(getAdminList(data?.data?.admins));
        setadminListRefresh(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin" && (adminList.length === 0 || adminListRefresh)) {
      handleGetAdmins();
    }
  }, [user, adminListRefresh, user?._id, adminList.length]);


  useEffect(() => {
  const canViewEmployees =
    user?.role === "admin" ||
    (user as any)?.assignedRole?.permissions?.employees?.view;

  if (canViewEmployees && (userList.length === 0 || employeeListRefresh)) {
    handleGetEmployee();
  }
}, [employeeListRefresh, user, userList.length]);



  const handleDeleteClick = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteAdmin(selectedEmployeeId, user?._id);
      if (res.status === 200) {
        handleGetAdmins();
        toast({ title: t("users.deleteAdmin"), description: res.data?.message })
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAdminStatus = async (adminId, status) => {
    try {
      const res = await updateAdminStatus(adminId, user?._id, status);
      if (res.status === 200) {
        handleGetAdmins();
        toast({ title: t("users.adminStatus"), description: res.data?.message })
      }
    }
    catch (err) {
      toast({ title: t("common.error"), description: err?.response?.data?.message, variant: "destructive" })
    }
  }

  const getStatusBadge = (status: "ACTIVE" | "RELIEVED" | "ON_HOLD") => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-success/10 text-success text-xs font-medium px-2 py-1 rounded",
      RELIEVED: "bg-destructive/10 text-destructive text-xs font-medium px-2 py-1 rounded",
      ON_HOLD: "bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded",
    };

    // 2️⃣ Labels
    const labels: Record<string, string> = {
      ACTIVE: t("users.active"),
      RELIEVED: t("users.relieved"),
      ON_HOLD: t("users.onHold"),
    };

    return (
      <span className={styles[status]}>
        {labels[status]}
      </span>
    );
  };

  const handleGetPreview = async (employeeId: string, type: string) => {
    try {
      let letters;

      // ✅ Check cache first
      if (letterCache[employeeId]) {
        letters = letterCache[employeeId];
      } else {
        letters = await handleGetPdfLetter(employeeId);

        // ✅ store in cache
        setLetterCache((prev) => ({
          ...prev,
          [employeeId]: letters,
        }));
      }

      const letter = letters?.find(
        (l) => l.letterType === type
      );

      if (!letter || !letter.pdfData) {
        toast({
          title: t("users.previewNotAvailable"),
          description: t("users.documentNotExist"),
          variant: "destructive",
        });
        return;
      }

      const byteCharacters = atob(letter.pdfData);
      const byteNumbers = Array.from(byteCharacters, c => c.charCodeAt(0));
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setPreviewDoc({
        name: letter.letterType,
        url,
        type: "pdf",
      });

      setIsPreview(true);

    } catch (err) {
      console.error(err);
      toast({
        title: t("common.error"),
        description: t("users.failedLoadDocument"),
        variant: "destructive",
      });
    }
  };

  const fetchLetters = async () => {
    const letters = await handleGetPdfLetter(selectedEmployeeId);
    setAllLetter(letters); // ya jo bhi state me store karna ho
  };

  useEffect(() => {
    if (selectedEmployeeId && user?.role !== "super_admin") {
      fetchLetters();
    }
  }, [selectedEmployeeId])



  if (pageLoading && (userList.length === 0 || (user?.role === "super_admin" && adminList.length === 0))) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  const getAssignedRoleId = (employee: any) => {
    const assignedRole = employee?.assignedRole;
    if (!assignedRole) return "";
    return typeof assignedRole === "object" ? assignedRole._id : assignedRole;
  };

  const assignRole = async (employeeId: string, roleId: string) => {
    setAssigningRoleId(employeeId);

    try {
      const res = await assignEmployeeRole(employeeId, roleId || null);

      if (res.status === 200) {
        setEmployeeListRefresh(true);
        toast({
          title: t("users.roleUpdated"),
          description: res.data?.message || t("users.roleUpdatedDesc"),
        });
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: t("users.failedAssignRole"),
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setEmployeeListRefresh(true);
    } finally {
      setAssigningRoleId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>{user?.role === "super_admin" ? t("users.pageTitleAdmin") : t("users.pageTitleEmployee")}</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <div className="space-y-6">
        <AddManagerForm
          isOpen={isFormOpen}
          onIsOpenChange={() => setIsFormOpen(false)}
          initialData={null}
          setManagerRefresh={setManagerRefresh}
          managerData={addManagerData}
        />
        <EmployeeFormDialog
          open={isDialogOpen}
          onClose={() => { setIsDialogOpen(false) }}
          isEditMode={isEditDialogOpen}
          initialData={initialData}
          setEmployeeListRefresh={setEmployeeListRefresh}
          selectedDepartmentId={""} //blank hai kyuki y sirf department k case m use hoga
        />

        <AdminFormDialog
          open={isAdminDialog}
          setOpen={() => { setIsAdminDialog(false) }}
          mode={isEditDialogOpen}
          initialData={adminInitialData}
          setadminListRefresh={setadminListRefresh}
        />

        {
          showRelieve && (
            <RelieveEmployeeCard
              onClose={() => setShowRelieve(false)}
              employeeId={selectedEmployeeId}
              setRelieveEmployeeId={setSelectedEmployeeId}
              setEmployeeListRefresh={setEmployeeListRefresh}

            />
          )
        }
        <DeleteCard
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          title={t("users.deleteAdminTitle")}
          message={t("users.deleteAdminMessage")}
        />

        {isPreview && previewDoc && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-3">

            {/* Modal Card */}
            <div
              className={`
                  bg-white dark:bg-gray-900
                  ${previewDoc.type === "pdf"
                  ? "w-[95vw] sm:w-[700px] md:w-[900px] max-h-[95vh]"
                  : "w-[90vw] sm:w-[420px] md:w-[500px] max-h-[85vh]"
                }
                  rounded-xl shadow-lg
                  p-4 sm:p-5
                  relative
                  overflow-hidden
                `}
            >

              {/* Header */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base sm:text-lg font-semibold truncate">
                  {previewDoc.name}
                </h3>
                <button
                  onClick={() => setIsPreview(false)}
                  className="text-xl px-2 hover:opacity-70"
                >
                  ✕
                </button>
              </div>

              {/* Preview */}
              <div
                className={`
                  border rounded-md
                  ${previewDoc.type === "pdf"
                    ? "h-[400px] sm:h-[520px] md:h-[600px]"
                    : "h-[220px] sm:h-[300px] md:h-[350px]"
                  }
                  flex items-center justify-center
                `}
              >
                {previewDoc.type === "pdf" ? (
                  <iframe
                    src={previewDoc.url}
                    className="w-full h-full"
                    title={previewDoc.name}
                  />
                ) : (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              {/* Actions (only for image) */}
              {previewDoc.type === "image" && (
                <div className="flex justify-end gap-3 mt-4">
                  <a
                    href={previewDoc.url}
                    download
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                  >
                    {t("common.download")}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3 sm:gap-4">

          {/* Left Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">

            {/* Search Box */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={user?.role === "super_admin" ? t("users.searchAdmins") : t("users.searchEmployees")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Toggle Buttons */}
            {(
  user?.role === "admin" ||
  (user as any)?.assignedRole?.permissions?.employees?.view
) && (
              <div className="flex w-full sm:w-auto bg-muted rounded-lg p-1 justify-start sm:justify-end">
                <button
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1 text-xs sm:text-sm rounded-md transition
            ${statusFilter === "ACTIVE"
                      ? "bg-white shadow text-primary"
                      : "text-muted-foreground"}
          `}
                >
                  {t("users.active")}
                </button>

                <button
                  onClick={() => setStatusFilter("RELIEVED")}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1 text-xs sm:text-sm rounded-md transition
            ${statusFilter === "RELIEVED"
                      ? "bg-white shadow text-primary"
                      : "text-muted-foreground"}
          `}
                >
                  {t("users.relieve")}
                </button>
              </div>
            )}

          </div>

          {/* Right Side Button */}
          {user?.role === "super_admin" ? (
            <button
              className="flex items-center justify-center sm:justify-start gap-2 
                 bg-blue-600 hover:bg-blue-700 text-white 
                 px-3 py-1.5 sm:px-4 sm:py-2 
                 text-sm sm:text-base 
                 rounded-md transition-colors whitespace-nowrap"
              onClick={() => {
                setAdminInitialData(null);
                setIsEditDialogOpen(false);
                setIsAdminDialog(true);
              }}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("users.addAdmin")}
            </button>
          ) : (
            <button
              className="flex items-center justify-center sm:justify-start gap-2 
                 bg-blue-600 hover:bg-blue-700 text-white 
                 px-3 py-1.5 sm:px-4 sm:py-2 
                 text-sm sm:text-base 
                 rounded-md transition-colors whitespace-nowrap"
              onClick={() => {
                setInitialData(null);
                setIsEditDialogOpen(false);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("users.addEmployee")}
            </button>
          )}

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10 md:pb-0">
          {filteredUsers.map((userData) => (
            <Card key={userData._id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/user/${userData._id}`)} >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-primary/10">
                      {userData?.profileImage ? (
                        <img
                          src={userData.profileImage}
                          alt={userData.fullName || "Profile"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-primary">
                          {userData?.fullName?.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">{userData?.fullName}</h3>
                      {getStatusBadge(userData?.status)}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { setAddManagerData(userData); setIsFormOpen(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("users.addManager")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setInitialData(userData);
                          setIsEditDialogOpen(true);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t("common.edit")}
                      </DropdownMenuItem>

                      {userData?.status === "ACTIVE" && (<DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setShowRelieve(true);
                          setSelectedEmployeeId(userData?._id);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t("users.relieve")}
                      </DropdownMenuItem>)}

                      {userData?.status === "RELIEVED" && (
                        <DropdownMenuItem
                          className="cursor-pointer text-green-600"
                          onClick={() => handleUpdateEmployeeStatus(userData?._id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {t("users.makeActive")}
                      </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { handleGetPreview(userData?._id, "offer") }}  >
                        <FileText className="w-4 h-4 mr-2" />
                        {t("users.offerLetter")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { handleGetPreview(userData?._id, "join") }}  >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t("users.joinLetter")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { handleGetPreview(userData?._id, "noc"); }}
                      >
                        <FileCheck className="w-4 h-4 mr-2" />
                        {t("users.noc")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { handleGetPreview(userData?._id, "recommendation") }}
                      >
                        <Award className="w-4 h-4 mr-2" />
                        {t("users.recommendation")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { handleGetPreview(userData?._id, "relieve") }}
                      >
                        <FileMinus className="w-4 h-4 mr-2" />
                        {t("users.relievingLetter")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>

                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{userData.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{userData.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{userData.department?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{t("users.joined", { date: formatDate(userData.joinDate) })}</span>
                  </div>
                  {canAssignRoles && (
                    <div
                      className="mt-3"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <label className="text-sm text-gray-500 block mb-1">
                        {t("users.assignRole")}
                      </label>

                      <select
                        className="border rounded-md px-3 py-2 w-full disabled:opacity-60"
                        value={getAssignedRoleId(userData)}
                        disabled={assigningRoleId === userData._id}
                        onChange={(e) => assignRole(userData._id, e.target.value)}
                      >
                        <option value="">{t("users.noRole")}</option>

                        {roles.map((role: any) => (
                          <option key={role._id} value={role._id}>
                            {role.roleName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {user?.role === "super_admin" ? <AdminListCard handleStatusChange={handleAdminStatus} handleDeleteClick={handleDeleteClick} adminList={adminList} setAdminInitialData={setAdminInitialData} setIsEditDialogOpen={setIsEditDialogOpen} setIsAdminDialog={setIsAdminDialog} /> : []}

        {(
          user?.role === "super_admin"
            ? adminList.length === 0
            : filteredUsers.length === 0
        ) && (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t("users.noUsersFound")}
              </p>
            </div>
          )}


      </div>
    </>
  );
};

export default Users;
