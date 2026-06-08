import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Search, Users, MoreHorizontal, Edit, Trash2, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import DepartmentDialog from "@/Forms/DepartmentDialog";
import DeleteCard from "@/components/cards/DeleteCard";
import DepartmentCard from "@/components/cards/DepartmentCard";
import { getDepartments, getEmployees } from "@/services/Service";
import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { EmployeeFormDialog } from "@/Forms/EmployeeFormDialog"
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getDepartment, removeDepartment } from '@/redux-toolkit/slice/allPage/departmentSlice';
import { getEmployeeList } from '@/redux-toolkit/slice/allPage/userSlice';
import EmployeeListModal from "@/components/cards/EmployeeList";


const departmentColors = [
  'bg-primary/10 text-primary',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
  'bg-info/10 text-info',
  'bg-destructive/10 text-destructive',
  'bg-accent text-accent-foreground',
];

const Departments: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>();
  const [showDepartment, setShowDepartment] = useState(false);
  const [departmentRefresh, setDepartmentRefresh] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<null | any>(null);
  const [selectedDepartmentEmployees, setSelectedDepartmentEmployees] = useState<any[]>([]);
  const [employeeListRefresh, setEmployeeListRefresh] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [employeeListDialog, setEmployeeListDialog] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const dispatch = useAppDispatch();
  const departmentList = useAppSelector((state) => state.department.departments);
  const employeeList = useAppSelector((state) => state.user.employees);
  const filterEmployees = employeeList.filter((e) => e?.status !== "RELIEVED")
  const filteredDepartments = departmentList.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGetDepartment = async () => {
    try {
      setPageLoading(true);
      const data = await getDepartments(user?.companyId?._id);
      if (Array.isArray(data)) {
        dispatch(getDepartment(data));
        setDepartmentRefresh(false);
      }
    } catch (err) {
      console.log(err);
    }
    finally {
      setPageLoading(false);
    }
  };


  const handleGetEmployees = async () => {
    try {
      setPageLoading(true);
      const data = await getEmployees(user?.companyId?._id);
      if (Array.isArray(data)) {
        dispatch(getEmployeeList(data));
        setEmployeeListRefresh(false);
      }
    } catch (err) {
      console.log(err);
    }
    finally {
      setPageLoading(false);
    }
  };





  useEffect(() => {
  const canViewDepartments =
    user?.role === "admin" ||
    (user as any)?.assignedRole?.permissions?.departments?.view;

  const canViewEmployees =
    user?.role === "admin" ||
    (user as any)?.assignedRole?.permissions?.employees?.view;

  if (canViewDepartments && (departmentList.length === 0 || departmentRefresh)) {
    handleGetDepartment();
  }

  if (canViewEmployees && (filterEmployees.length === 0 || employeeListRefresh)) {
    handleGetEmployees();
  }
}, [
  departmentRefresh,
  employeeListRefresh,
  filterEmployees.length,
  departmentList.length,
  user
]);




  const handleDeleteClick = (employeeId) => {
    setSelectedDepartmentId(employeeId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/departments/deleteDepartment/${selectedDepartmentId}`
        , { data: { companyId: user?.companyId?._id } }
      )
      if (res.status === 200) {
        dispatch(removeDepartment(selectedDepartmentId));
        setDepartmentRefresh(true);
        toast({
          title: "Department Deleted",
          description: `${res?.data?.message}`,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };



  if (pageLoading && (departmentList.length === 0 || filterEmployees.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <EmployeeListModal open={employeeListDialog} onClose={() => { setEmployeeListDialog(false) }} data={filterEmployees} />
      <Helmet>
        <title>Department Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <div className="space-y-8 pb-10">
        <DepartmentDialog
          isOpen={isDialogOpen}
          setIsOpen={() => { setIsDialogOpen(false) }}
          setDepartmentRefresh={setDepartmentRefresh}
          initialData={initialData}
          mode={isEditDialogOpen}
        />
        <EmployeeFormDialog
          open={employeeDialogOpen}
          onClose={() => { setEmployeeDialogOpen(false) }}
          isEditMode={null}
          initialData={null}
          setEmployeeListRefresh={setEmployeeListRefresh}
          selectedDepartmentId={selectedDepartmentId}
        />

        <DeleteCard
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          title="Delete Department?"
          message="This Action Will Permanently Delete This Department."
        />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end md:mt-[-15px] gap-4">
          {/* Right: Add Department Button */}
          <div className="flex flex-wrap sm:flex-nowrap justify-end gap-2 sm:gap-3">

            <Button
              onClick={() => { setEmployeeDialogOpen(true) }}
              className="flex items-center gap-1 sm:gap-2 
               px-2 py-1 sm:px-4 sm:py-2 
               text-xs sm:text-sm 
               bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              Add Employee
            </Button>

            <Button
              onClick={() => {
                setInitialData(null);
                setIsEditDialogOpen(false);
                setIsDialogOpen(true);
              }}
              className="flex items-center gap-1 sm:gap-2 
               px-2 py-1 sm:px-4 sm:py-2 
               text-xs sm:text-sm 
               bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              Add Department
            </Button>

          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">

          {/* Departments Card */}
          <Card className="rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-xl font-bold">{departmentList?.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Employees Card */}
          <Card className="rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">

                {/* Left side */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Users className="w-5 h-5 text-success" />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-xl font-bold">{filterEmployees?.length}</p>
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => setEmployeeListDialog(true)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 py-2 rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-800"
                >
                  View
                </button>

              </div>
            </CardContent>
          </Card>

          {/* Avg per Dept Card */}
          <Card className="col-span-1 sm:col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Users className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg per Dept</p>
                  <p className="text-xl font-bold">
                    {(filterEmployees?.length > 0 && departmentList?.length > 0)
                      ? Math.round(filterEmployees?.length / departmentList?.length)
                      : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-14 rounded-2xl border-slate-200 bg-white shadow-sm"
          />
        </div>

        {/* Departments Grid */}
       {/* PREMIUM DEPARTMENT GRID */}

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7 pb-10">

  {filteredDepartments.map((dept, index) => {

    const departmentEmployees = filterEmployees.filter(
      (emp) => emp.department?._id === dept._id
    );

    return (

      <div
        key={dept._id}
        className="
        group
        relative
        overflow-hidden
        rounded-[32px]
        border
        border-slate-200/70
        bg-white
        shadow-sm
        hover:shadow-2xl
        hover:-translate-y-1
        transition-all
        duration-300
        "
      >

        {/* TOP GRADIENT */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-700" />

        <div className="p-7">

          {/* HEADER */}
          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              <div className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-slate-100
              border border-slate-200
              ">

                <Briefcase className="h-7 w-7 text-slate-700" />

              </div>

              <div>

                <div className="flex items-center gap-2">

                  <h3 className="text-xl font-bold text-slate-900">
                    {dept.name}
                  </h3>

                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />

                </div>

                <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                  {dept.description || "Department workspace"}
                </p>

              </div>

            </div>

            {/* ACTIONS */}

            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <button
                  className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  hover:bg-slate-100
                  transition-all
                  "
                >

                  <MoreHorizontal className="h-5 w-5 text-slate-600" />

                </button>

              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="rounded-2xl border-slate-200 p-2"
              >

                <DropdownMenuItem
                  className="cursor-pointer rounded-xl"
                  onClick={() => {
                    setSelectedDepartmentId(dept._id);
                    setEmployeeDialogOpen(true);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Employee
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer rounded-xl"
                  onClick={() => {
                    setInitialData(dept);
                    setIsEditDialogOpen(true);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Department
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer rounded-xl text-red-600"
                  onClick={() => handleDeleteClick(dept?._id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </div>

          {/* ANALYTICS SECTION */}

          <div className="mt-7 grid grid-cols-2 gap-4">

            <div className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-4
            ">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Employees
              </p>

              <div className="mt-2 flex items-center gap-2">

                <Users className="h-5 w-5 text-slate-600" />

                <span className="text-2xl font-bold text-slate-900">
                  {departmentEmployees.length}
                </span>

              </div>

            </div>

            <div className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-4
            ">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>

              <div className="mt-3 flex items-center gap-2">

                <div className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="font-semibold text-slate-900">
                  Active
                </span>

              </div>

            </div>

          </div>

          {/* EMPLOYEE AVATARS */}

          <div className="mt-7">

            <div className="flex items-center justify-between mb-3">

              <p className="text-sm font-semibold text-slate-700">
                Team Members
              </p>

              <span className="text-xs text-slate-400">
                {departmentEmployees.length} members
              </span>

            </div>

            <div className="flex items-center">

              <div className="flex -space-x-3">

                {departmentEmployees
                  .slice(0, 5)
                  .map((emp, i) => (

                    <img
                      key={i}
                      src={
                        emp?.profileImage ||
                        `https://ui-avatars.com/api/?name=${emp?.fullName}`
                      }
                      alt={emp?.fullName}
                      className="
                      h-11
                      w-11
                      rounded-2xl
                      border-2
                      border-white
                      object-cover
                      shadow-sm
                      "
                    />

                  ))}

              </div>

              {departmentEmployees.length > 5 && (

                <div className="
                ml-3
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                border
                border-slate-200
                bg-slate-100
                text-sm
                font-bold
                text-slate-700
                ">

                  +{departmentEmployees.length - 5}

                </div>

              )}

            </div>

          </div>

          {/* FOOTER */}

          <div className="
          mt-8
          flex
          items-center
          justify-between
          border-t
          border-slate-100
          pt-5
          ">

            <div>

              <p className="text-xs text-slate-400">
                Enterprise Workspace
              </p>

              <p className="text-sm font-semibold text-slate-700">
                Team Collaboration Enabled
              </p>

            </div>

            <Button
              onClick={() => {
                setSelectedDepartment(dept);

                setSelectedDepartmentEmployees(
                  departmentEmployees
                );

                setShowDepartment(true);
              }}
              className="
              rounded-2xl
              bg-slate-900
              px-5
              text-white
              hover:bg-slate-800
              "
            >
              View Team
            </Button>

          </div>

        </div>

      </div>

    );
  })}

</div>

        {showDepartment && selectedDepartment && (
          <DepartmentCard

            departmentData={selectedDepartment} // pura dept object
            employees={selectedDepartmentEmployees}
            onClose={() => setShowDepartment(false)}
            departmentList={filteredDepartments}
            setSelectedDepartmentEmployees={setSelectedDepartmentEmployees}
            refreshList={handleGetEmployees}
          />
        )}


        {filteredDepartments.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No departments found.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Departments;
