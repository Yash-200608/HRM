import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutList, LayoutGrid, Search, Filter, MoreHorizontal, Mail, Phone, MapPin, Globe, Building2, Users, Briefcase, CheckCircle2, XCircle, Plus, Download } from "lucide-react";
import { Helmet } from "react-helmet-async";
import AddCompanyDialog from "@/job-portal/forms/CompanyDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getAllCompanyJob, CompanyJobStatusChange, generatePDF } from "@/services/Service";
import AddJobDialog from "./forms/JobDialog";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getCompanyJobList } from "@/redux-toolkit/slice/job-portal/companyJobSlice";

const CompaniesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [initialData, setInitialData] = useState(null);
  // const [companyJobList, setCompanyJobList] = useState([]);
  const [companyJobListRefresh, setCompanyJobListRefresh] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [jobListRefresh, setJobListRefresh] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const companyJobList = useAppSelector((state)=> state?.companyJob?.companyJobList);


  // Filter Logic
  const filteredCompanies = companyJobList.filter((company) => {
    const matchesSearch =
      company?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry =
      industryFilter === "all" || company.industry === industryFilter;
    const matchStatus = activeFilter === "all" || company?.status === activeFilter;

    return matchesSearch && matchesIndustry && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Active</Badge>;
      case "inactive":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Suspended</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openCompanyDetails = (company: any) => {
    setSelectedCompany(company);
    setIsSheetOpen(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await CompanyJobStatusChange({ id, status });
      if (res.status === 200) {
        toast({ title: "Company Status Changed", description: res?.data?.message });
        setCompanyJobListRefresh(true);
        setSelectedCompany({...selectedCompany, status:status})
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error Company Status Change.", description: err?.response?.data?.message || "Something went wrong", variant: "destructive" })
    }
  };

  const handleGetCompanyJob = async () => {
    try {
      const res = await getAllCompanyJob();
      if (res.status === 200) {
        // setCompanyJobList(res?.data?.data);
        dispatch(getCompanyJobList(res?.data?.data))
        setCompanyJobListRefresh(false);
      }
    }
    catch (err) {
      console.log(err);

    }
  }

  useEffect(() => {
    if (companyJobList?.length === 0 || companyJobListRefresh) {
      handleGetCompanyJob();
    }
  }, [companyJobListRefresh, companyJobList?.length])

  return (
    <>
      <AddCompanyDialog
        isOpen={formOpen}
        isOpenChange={setFormOpen}
        initialData={initialData}
        setCompanyListRefresh={setCompanyJobListRefresh}
      />
      <AddJobDialog
        isOpen={jobDialogOpen}
        isOpenChange={setJobDialogOpen}
        initialData={null}
        setJobListRefresh={setJobListRefresh}
        companyId={companyId}
      />
      <Helmet>
        <title>Companies | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/40 p-6 space-y-6">
        {/* Page Header */}
        <div className="flex  sm:flex-row justify-end items-start sm:items-center gap-4 mt-[-30px]">
          <div className="flex items-center gap-2">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => { setInitialData(null); setFormOpen(true) }}>
              <Plus className="h-4 w-4" /> Add Company
            </Button>
          </div>
        </div>

        {/* Filters */}
    <Card className="shadow-sm">
  <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

    {/* Search + Filters Wrapper */}
    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto md:items-center">

      {/* Search Input */}
      <div className="relative w-full sm:w-[250px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search companies..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Mobile: Toggle + Dropdown in one row | Desktop: normal layout */}
      <div className="flex flex-row items-center gap-4 w-full md:w-auto">

        {/* Active / Inactive Buttons */}
        <div className="flex border rounded-md overflow-hidden w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter("active")}
            className={`px-3 py-2 text-sm transition w-1/2 sm:w-auto ${
              activeFilter === "active"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter("inactive")}
            className={`px-3 py-2 text-sm transition w-1/2 sm:w-auto ${
              activeFilter === "inactive"
                ? "bg-gray-500 text-white"
                : "bg-white text-gray-600"
            }`}
          >
            Inactive
          </button>
        </div>

        {/* Industry Filter */}
        <div className="w-full sm:w-[200px] md:ml-auto">
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="it">IT & Software</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="ecommerce">E-commerce</SelectItem>
              <SelectItem value="realEstate">Real Estate</SelectItem>
              <SelectItem value="marketing">Marketing & Advertising</SelectItem>
              <SelectItem value="construction">Construction</SelectItem>
              <SelectItem value="logistics">Logistics</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="banking">Banking</SelectItem>
              <SelectItem value="hospitality">Hospitality</SelectItem>
              <SelectItem value="telecom">Telecom</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>
    </div>

  </CardContent>
</Card>

        {/* Content Area */}
     <Card className="shadow-sm">
  <CardContent className="p-0">
    <div className="w-full overflow-x-auto">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm px-2 py-2 md:px-4 md:py-3">
              Company
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Email
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Contact
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Total Jobs
            </TableHead>
            <TableHead className="text-xs md:text-sm px-2 py-2 md:px-4 md:py-3">
              Active Jobs
            </TableHead>
            <TableHead className="text-xs md:text-sm px-2 py-2 md:px-4 md:py-3">
              Status
            </TableHead>
            <TableHead className="text-right text-xs md:text-sm px-2 py-2 md:px-4 md:py-3">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <TableRow
                key={company._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openCompanyDetails(company)}
              >
                <TableCell className="px-2 py-2 md:px-4 md:py-3">
                  <div className="flex items-center gap-1 md:gap-3">
                    <Avatar className="h-7 w-7 md:h-9 md:w-9 rounded-lg hidden md:table-cell">
                      <AvatarImage src={company.logo} alt={company.name} />
                      <AvatarFallback className="rounded-lg text-xs">
                        {company.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-xs md:text-sm">
                        {company.name}
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-500 ">
                        {company.industry === "it"
                          ? "IT & Software"
                          : company?.industry}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {company.email}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {company.contact}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {company.jobs.length === 0 ? 0 : company?.jobs?.length}
                </TableCell>

                <TableCell className="text-xs md:text-sm px-2 py-2 md:px-4 md:py-3">
                  {
                    company.jobs.filter(
                      (v) =>
                        v?.status === "published" &&
                        v?.activeStatus === "active"
                    )?.length
                  }
                </TableCell>

                <TableCell className="text-xs md:text-sm px-2 py-2 md:px-4 md:py-3">
                  {getStatusBadge(company.status)}
                </TableCell>

                <TableCell className="text-right px-2 py-2 md:px-4 md:py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-7 w-7 md:h-8 md:w-8 p-0">
                        <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCompanyDetails(company);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>

                      {company.status === "active" && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompanyId(company?._id);
                            setJobDialogOpen(true);
                          }}
                        >
                          Add Job
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInitialData(company);
                          setFormOpen(true);
                        }}
                      >
                        Edit Company
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {company.status === "active" && (
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(company._id, "inactive");
                          }}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      )}

                      {company.status === "inactive" && (
                        <DropdownMenuItem
                          className="text-green-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(company._id, "active");
                          }}
                        >
                          Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-4 text-gray-500 text-xs md:text-sm"
              >
                No companies found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>

      </div>

      {/* Company Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedCompany && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>Company Profile</SheetTitle>
                <SheetDescription>Detailed information and metrics.</SheetDescription>
              </SheetHeader>

              {/* Profile Header */}
              <div className="flex flex-col items-center py-6 border-b text-center">
                <Avatar className="h-24 w-24 rounded-xl mb-4">
                  <AvatarImage src={selectedCompany.logo} />
                  <AvatarFallback className="text-2xl rounded-xl">{selectedCompany.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
                <p className="text-muted-foreground">{selectedCompany.industry === "it" ? "IT & Software" : selectedCompany?.industry}</p>
                <div className="mt-3">{getStatusBadge(selectedCompany.status)}</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 flex bg-gray-50 rounded-lg text-center border">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{selectedCompany.jobs.length === 0 ? 0 : selectedCompany?.jobs?.length}</h3>
                    <p className="text-xs text-muted-foreground uppercase">Total Jobs</p>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{selectedCompany.jobs.filter((v) => v?.status === "published" && v?.activeStatus === "active")?.length}</h3>
                    <p className="text-xs text-muted-foreground uppercase">Active Jobs</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center border">
                  <h3 className="text-2xl font-bold">{selectedCompany.jobs.reduce((total, job) => { const selectedCount = job?.applications?.filter(app => app?.status === "selected")?.length || 0; return total + selectedCount; }, 0)}</h3>
                  <p className="text-xs text-muted-foreground uppercase">Total Hires</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                {/* <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Overview</h3>
                <p className="text-sm text-gray-600">{selectedCompany.description}</p> */}

                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a href={selectedCompany.website} className="text-blue-600 hover:underline">{selectedCompany.website}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{selectedCompany.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{selectedCompany.contact}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{selectedCompany.size} Employees</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 border-t flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => { setInitialData(selectedCompany); setFormOpen(true) }}>Edit Profile</Button>
                  <Button variant="outline" className="w-full" onClick={() => { navigate("/jobs/jobs", { state: { companyId: selectedCompany?._id, companyName: selectedCompany?.name } }) }}>View Jobs</Button>
                </div>
              {selectedCompany?.status==="active" &&<Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleStatusChange(selectedCompany._id, "inactive") }}>Suspend Account</Button>}
              {selectedCompany?.status==="inactive"&&<Button variant="ghost" className="w-full text-green-600 hover:text-green-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleStatusChange(selectedCompany._id, "active") }}>Make Activate Account</Button>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CompaniesPage;
