import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  LayoutList, Search, Filter, MoreHorizontal, Mail, Phone, Briefcase, Calendar, Clock, CheckCircle2, XCircle, FileText, MessageSquare, ArrowRight, Download, MapPin,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import AddApplicationForm from "@/job-portal/forms/ApplicationDialog";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getCandidates } from "@/redux-toolkit/slice/job-portal/candidateSlice";
import { getAllApplication, applicationStatusChange, getAllRole } from "@/services/Service";
import { formatDate, getStatusBadgeClassAndText, statusActions } from "@/services/allFunctions";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { getRoles } from "@/redux-toolkit/slice/job-portal/roleSlice";
import { getApplicationList } from "@/redux-toolkit/slice/job-portal/applicationSlice";

const ApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [applicationListRefresh, setApplicationListRefresh] = useState(false);
  const [isCandidateFormOpen, setIsCandidateFormOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  // const [applicationList, setApplicationList] = useState([]);
  const [showApplicants, setShowApplicants] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const dispatch = useAppDispatch();
  const roleList = useAppSelector((state) => state.role.roles);
  const applicationList = useAppSelector((state)=> state?.application?.applicationList);

  const location = useLocation();
  const jobId = location?.state?.jobId;
  const jobName = location?.state?.jobName;


  const jobApplications = applicationList?.filter(
    (app) => app.job?._id === selectedApplication?.job?._id && app?.applicant?._id !== selectedApplication?.applicant?._id
  );



  const filteredApplications = applicationList?.filter((application) => {
    const searchLower = searchQuery?.toLowerCase() || "";

    // 🔍 Search Match
    const matchesSearch =
      application.applicant?.name?.toLowerCase().includes(searchLower) ||
      application.applicant?.email?.toLowerCase().includes(searchLower) ||
      application.job?.jobTitle?.toLowerCase().includes(searchLower) ||
      application.job?.locationType?.toLowerCase().includes(searchLower) ||
      application.applicant?.role?.name?.toLowerCase().includes(searchLower);

    // 🎯 Role Filter
    const matchesRole =
      roleFilter === "all" ||
      application.applicant?.role?._id === roleFilter;

  const matchesStatus =
      statusFilter === "all" ||
      application.status === statusFilter;

    // 🏢 JobId Filter (NEW CONDITION)
    const matchesJobId =
      !jobId || application.job?._id === jobId;

    return matchesSearch && matchesRole && matchesJobId && matchesStatus;
  });

  
    const getAllRoles = async () => {
      try {
        const res = await getAllRole();
        dispatch(getRoles(res?.data?.data));
      } catch (error) {
        console.log(error);
      }
    };
  
    useEffect(() => {
      if (roleList?.length === 0) {
        getAllRoles();
      }
    }, [roleList?.length]);
  

  const updateStatus = async (e, id, status) => {
    e.stopPropagation();
    let obj = { applicationId: id, status }
    try {
      const response = await applicationStatusChange(obj);
      if (response.status === 200) {
        if (selectedApplication?._id === id) {
          setSelectedApplication(prev => ({ ...prev, status: status }));
        }
        toast({ title: "Candidate status updated successfully", description: response?.data?.message });
        setApplicationListRefresh(true);
      }
    }
    catch (error) {
      console.error("Error updating candidate status:", error);
      toast({ title: "Error updating candidate status", description: error?.message || error?.response?.data?.message, variant: "destructive" });
    }

  };


  const handleGetApplication = async () => {
    try {
      const response = await getAllApplication();
      if (response.status === 200) {
        dispatch(getApplicationList(response?.data?.applications))
        setApplicationListRefresh(false);
      }

    } catch (error) {
      console.error("Error fetching Applications:", error);
    }
  };

  useEffect(() => {
    if (applicationList.length === 0 || applicationListRefresh) {
    handleGetApplication();
    }
  }, [applicationListRefresh, applicationList.length]);

  return (
    <>
      <AddApplicationForm
        isOpen={isCandidateFormOpen}
        onOpenChange={() => { setIsCandidateFormOpen(false) }}
        initialData={initialData}
        setApplicationListRefresh={setApplicationListRefresh}
        jobId={null}
      />
      <Helmet>
        <title>Applications | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/40 p-6 space-y-6">

        {/* Page Header */}
        <div className="flex justify-between items-center gap-4 mt-[-32px]">

          {/* Left Side Title */}
          <h1 className="inline-block bg-white px-4 py-2 font-bold text-lg rounded-md shadow-sm">
            {jobName ? `${jobName} job / Applications` : "All jobs Applications"}
          </h1>

          {/* Right Side Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setInitialData(null);
                setIsCandidateFormOpen(true);
              }}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Briefcase className="h-4 w-4" /> Add Application
            </Button>
          </div>

        </div>

        {/* Filters */}
       <Card className="shadow-sm">
  <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

    {/* ================= LEFT SIDE : SEARCH ================= */}
    <div className="relative w-full md:w-1/3">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search candidate..."
        className="pl-9 w-full"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>

    {/* ================= RIGHT SIDE : FILTERS ================= */}
    <div className="flex flex-row sm:flex-row gap-3 w-full md:w-auto">

  {/* Role Filter */}
  <div className="w-1/2 sm:w-auto">
    <Select value={roleFilter} onValueChange={setRoleFilter}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Filter by Role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Roles</SelectItem>
        {roleList.map((role) => (
          <SelectItem
            key={role?._id}
            value={role?._id}
            className="cursor-pointer"
          >
            {role?.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Status Filter */}
  <div className="w-1/2 sm:w-auto">
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Filter by Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="applied">Applied</SelectItem>
        <SelectItem value="screening">In Review</SelectItem>
        <SelectItem value="shortlisted">Shortlisted</SelectItem>
        <SelectItem value="interview">Interview</SelectItem>
        <SelectItem value="selected">Selected</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  </div>

</div>

  </CardContent>
</Card>
        {/* Content Area */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden md:table-cell">Role Applied</TableHead>
                  <TableHead>Job Name</TableHead>
                  <TableHead className="hidden md:table-cell">Location Type</TableHead>
                  <TableHead className="hidden md:table-cell">Date Applied</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Rating</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length > 0 ? (
                  filteredApplications.map((app) => (
                    <TableRow key={app?._id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedApplication(app); setIsSheetOpen(true) }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={app?.applicant?.profileImage} alt={app?.applicant?.name} />
                            <AvatarFallback>{app?.applicant?.name.substring(0, 2)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{app?.applicant?.name}</div>
                            <div className="text-xs text-muted-foreground">{app?.applicant.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{app?.applicant?.role?.name}</TableCell>
                      <TableCell>{app?.job?.jobTitle}</TableCell>
                      <TableCell className="hidden md:table-cell">{app?.job?.locationType}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(app.createdAt)}</TableCell>
                      <TableCell><Badge className={getStatusBadgeClassAndText(app.status)?.className}>{getStatusBadgeClassAndText(app.status)?.text}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setInitialData(app); setIsCandidateFormOpen(true) }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedApplication(app); setIsSheetOpen(true) }}>View Profile</DropdownMenuItem>
                            {statusActions[app.status]?.map((action) => (
                              <DropdownMenuItem
                                key={action}
                                onClick={(e) =>
                                  updateStatus(e, app._id, action)
                                }
                                className={action === "rejected" ? "text-red-600 cursor-pointer" : "cursor-pointer"}
                              >
                                {action === "shortlisted" && "Shortlist"}
                                {action === "interview" && "Schedule Interview"}
                                {action === "selected" && "Select"}
                                {action === "rejected" && "Reject"}
                                {action === "screening" && "In Review"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No applications found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto space-y-6">

          {selectedApplication && (
            <div className="space-y-6">

              {/* ================= SHEET HEADER ================= */}
              <SheetHeader>
                <SheetTitle>Application Details</SheetTitle>
                <SheetDescription>
                  Complete information about this job and applicants.
                </SheetDescription>
              </SheetHeader>

              {/* ================= JOB DETAILS ================= */}
              <div className="border rounded-xl p-4 bg-gray-50 space-y-4">
                <h2 className="text-lg font-bold">
                  {selectedApplication?.job?.jobTitle}
                </h2>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Experience:</span>
                    <p className="font-medium">
                      {selectedApplication?.job?.experience?.min} -{" "}
                      {selectedApplication?.job?.experience?.max} Years
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">Location Type:</span>
                    <p className="font-medium">{selectedApplication?.job?.locationType}</p>
                  </div>

                  <div>
                    <span className="text-gray-500">Salary:</span>
                    <p className="font-medium">
                      ₹{selectedApplication?.job?.salary?.min} - ₹{selectedApplication?.job?.salary?.max}
                    </p>
                  </div>
                </div>

                {/* Job Skills */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplication?.job?.skills?.map((skill: string) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* ================= SELECTED CANDIDATE DETAIL ================= */}
              <div className="border rounded-xl p-4 bg-white space-y-4">
                <h3 className="text-lg font-bold">Candidate Details</h3>
                <div className="flex justify-between items-start gap-4">
                  {/* Left side: Avatar, Name, Role, Skills */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedApplication?.applicant?.profileImage} />
                      <AvatarFallback>
                        {selectedApplication?.applicant?.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{selectedApplication?.applicant?.name}</h4>
                      <p className="text-muted-foreground">{selectedApplication?.applicant?.role?.name}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {selectedApplication?.skills?.map((skill: string) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Status */}
                  <div className="flex items-start">
                    <Badge className={getStatusBadgeClassAndText(selectedApplication?.status)?.className}>
                      {getStatusBadgeClassAndText(selectedApplication?.status)?.text}
                    </Badge>
                  </div>
                </div>

                {/* Candidate Contact & Professional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{selectedApplication?.applicant?.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Mobile:</span>
                    <p className="font-medium">{selectedApplication?.applicant?.mobile}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Location:</span>
                    <p className="font-medium">{selectedApplication?.applicant?.address}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Experience:</span>
                    <p className="font-medium">{selectedApplication?.applicant?.totalExperience} Years</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Relevant Experience:</span>
                    <p className="font-medium">{selectedApplication?.applicant?.relevantExperience} Years</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Applied On:</span>
                    <p className="font-medium">{formatDate(selectedApplication?.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Skills</span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {selectedApplication?.applicant?.skills?.map((skill) => (
                        <Badge key={skill} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                {statusActions[selectedApplication?.status]?.length > 0 && (
                  <div className="pt-4 flex flex-col gap-3">
                    {statusActions[selectedApplication?.status].map((action) => {
                      let btnClass = "w-full";
                      let btnVariant: "default" | "outline" = "default";
                      let btnLabel = action;

                      if (action === "interview") {
                        btnClass += " bg-blue-600 hover:bg-blue-700 text-white";
                      } else if (action === "selected") {
                        btnClass += " border-green-600 text-green-600 hover:bg-green-50";
                        btnVariant = "outline";
                        btnLabel = "Hire Candidate";
                      } else if (action === "rejected") {
                        btnClass += " border-red-600 text-red-600 hover:bg-red-50";
                        btnVariant = "outline";
                        btnLabel = "Reject Application";
                      }

                      return (
                        <Button
                          key={action}
                          className={btnClass}
                          variant={btnVariant}
                          onClick={(e) => updateStatus(e, selectedApplication._id, action)}
                        >
                          {btnLabel === "screening" ? "In Review" : btnLabel}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ================= OTHER INFORMATION / APPLICANTS ================= */}
              <div
                onClick={() => setShowApplicants(!showApplicants)}
                className="cursor-pointer border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition"
              >
                <h2 className="text-lg font-bold mb-2">Other Information</h2>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Total Applicants</h3>
                  <Badge>{jobApplications?.length || 0}</Badge>
                </div>
              </div>

              {/* Other Applicants List */}
              {showApplicants && (
                <div className="max-h-[200px] overflow-y-auto space-y-4 mt-2">
                  {jobApplications?.map((app) => (
                    <div
                      key={app._id}
                      className="border rounded-xl p-4 flex justify-between items-start"
                    >
                      {/* Left side: Avatar, Name, Skills */}
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={app?.applicant?.profileImage} />
                          <AvatarFallback>
                            {app?.applicant?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h4 className="font-semibold">{app?.applicant?.name}</h4>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {app?.applicant?.skills?.map((skill: string) => (
                              <Badge key={skill} variant="outline" className="text-xs px-2 py-1">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Status + Action Buttons in a row */}
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeClassAndText(app?.status)?.className}>
                          {getStatusBadgeClassAndText(app?.status)?.text}
                        </Badge>

                        {statusActions[app?.status]?.length > 0 && (
                          <div className="flex gap-1">
                            {statusActions[app?.status].map((action) => {
                              let btnClass = "text-xs px-2 py-1";
                              let btnVariant: "default" | "outline" = "default";
                              let btnLabel = action;

                              if (action === "interview") {
                                btnClass += " bg-blue-600 hover:bg-blue-700 text-white";
                              } else if (action === "selected") {
                                btnClass += " border-green-600 text-green-600 hover:bg-green-50";
                                btnVariant = "outline";
                                btnLabel = "Hire";
                              } else if (action === "rejected") {
                                btnClass += " border-red-600 text-red-600 hover:bg-red-50";
                                btnVariant = "outline";
                                btnLabel = "Reject";
                              }

                              return (
                                <Button
                                  key={action}
                                  className={btnClass}
                                  variant={btnVariant}
                                  size="sm"
                                  onClick={(e) => updateStatus(e, app._id, action)}
                                >
                                  {btnLabel === "screening" ? "In Review" : btnLabel}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ApplicationsPage;
