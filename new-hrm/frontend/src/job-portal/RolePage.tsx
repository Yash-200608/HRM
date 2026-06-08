import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, MoreHorizontal, Mail, Phone, MapPin, Briefcase, FileText, CheckCircle2, XCircle, Clock, Calendar, Download, Users, Linkedin, Github, MoreVertical } from "lucide-react";
import { Helmet } from "react-helmet-async";
import RoleDialog from "@/job-portal/forms/RoleDialog";
import { getAllRole, roleStatusChange } from "@/services/Service";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getRoles } from "@/redux-toolkit/slice/job-portal/roleSlice";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const RolePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [initialData, setInitialData] = useState(null);
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [roleListRefresh, setRoleListRefresh] = useState(false);
  const dispatch = useAppDispatch();
  const roleList = useAppSelector((state) => state?.role?.roles);
  // Filter Logic
  const filteredRoles = roleList?.filter((role) => {
    const matchesSearch =
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && role.isActive === true) ||
      (statusFilter === "inactive" && role.isActive === false);
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, status: boolean) => {
    let obj = { id, status: status };
    try {
      const res = await roleStatusChange(obj);
      if (res.status === 200) {
        toast({ title: `Role Status Changed.`, description: res.data.message });
        setRoleListRefresh(true);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error Role.", description: err?.response?.data?.message || err?.message, variant: "destructive" })
    }
  }
  
  const getAllRoles = async () => {
    try {
      const res = await getAllRole();
      dispatch(getRoles(res?.data?.data));
      setRoleListRefresh(false);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (roleList?.length === 0 || roleListRefresh) {
      getAllRoles();
    }
  }, [roleList?.length, roleListRefresh]);

  return (
    <>
      <RoleDialog
        isOpen={isRoleFormOpen}
        onClose={() => { setIsRoleFormOpen(false) }}
        setRoleListRefresh={setRoleListRefresh}
        initialData={initialData}
      />

      <Helmet>
        <title>Roles | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/40 p-6 space-y-6">

        {/* Page Header */}
        <div className="flex justify-end gap-4 mt-[-30px]">
          <div className="flex items-center gap-2">
            <Button onClick={() => { setInitialData(null); setIsRoleFormOpen(true) }} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Briefcase className="h-4 w-4" /> Add Role
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Roles</p>
              <h3 className="text-2xl font-bold mt-1">{filteredRoles?.length}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </Card>
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Roles</p>
              <h3 className="text-2xl font-bold mt-1">{filteredRoles.filter((v) => v?.isActive === true)?.length}</h3>
            </div>
            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
          </Card>
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Active</p>
              <h3 className="text-2xl font-bold mt-1">{filteredRoles.filter((v) => v?.isActive === false)?.length}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">In Active</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="hidden md:inline-block" variant="outline" size="icon" title="Reset Filters" onClick={() => { setStatusFilter('all'); setSearchQuery('') }}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
       <Card className="shadow-sm">
  <CardContent className="p-0">

    {/* mobile overflow safety only */}
    <div className="w-full overflow-x-auto">

      <Table>

        <TableHeader>
          <TableRow>
            <TableHead className="px-2 md:px-4">Role Name</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead className="px-2 md:px-4">Status</TableHead>
            <TableHead className="px-2 md:px-4">Candidates</TableHead>
            <TableHead className="text-right px-2 md:px-4">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredRoles?.length > 0 ? (
            filteredRoles.map((role) => (
              <TableRow
                key={role._id}
                className="hover:bg-muted/50"
              >

                {/* Role Name */}
                <TableCell className="px-2 md:px-4">
                  <span className="text-sm md:text-base">
                    {role.name}
                  </span>
                </TableCell>

                {/* Description */}
                <TableCell className="hidden md:table-cell">
                  {role.description || "-"}
                </TableCell>

                {/* Status */}
                <TableCell className="px-2 md:px-4">
                  <span
                    className={`px-2 py-1 text-[11px] md:text-xs rounded-full ${
                      role.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {role.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>

                {/* Candidates */}
                <TableCell className="px-2 md:px-4 text-sm">
                  {role.candidateCount || 0}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right px-2 md:px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 md:p-2 rounded hover:bg-muted">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setInitialData(role);
                          setIsRoleFormOpen(true);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          Change Status
                        </DropdownMenuSubTrigger>

                        <DropdownMenuSubContent sideOffset={4} className="min-w-[120px]">
                          <DropdownMenuItem
                            disabled={role.isActive === true}
                            onClick={() => handleStatusChange(role._id, true)}
                          >
                            Active
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            disabled={role.isActive === false}
                            onClick={() => handleStatusChange(role._id, false)}
                          >
                            Inactive
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>

              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-4 text-muted-foreground text-sm"
              >
                No roles found matching your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>

      </Table>

    </div>

  </CardContent>
</Card>
      </div>
    </>
  );
};

export default RolePage;
