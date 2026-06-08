import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter} from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Briefcase, MapPin, Clock, DollarSign, Users, Plus, Edit, IndianRupee} from "lucide-react";
import { Helmet } from "react-helmet-async";
import AddJobDialog from "./forms/JobDialog";
import {getAllJob, JobStatusChange, applicationStatusChange, JobPublished} from "@/services/Service";
import {formatDate, getStatusBadgeClassAndText, statusActions} from "@/services/allFunctions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import AddApplicationForm from "@/job-portal/forms/ApplicationDialog";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getJobList } from "@/redux-toolkit/slice/job-portal/jobSlice";


const JobsPage: React.FC = () => {
  const {user} = useAuth();
  const {toast} = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [initialData, setInitialData] = useState(null);
  // const [jobList, setJobList] = useState([]);
  const [jobListRefresh, setJobListRefresh] = useState(false);
    const [showApplicants, setShowApplicants] = useState(false);
    const [isCandidateFormOpen, setIsCandidateFormOpen] = useState(false);
      const [applicationListRefresh, setApplicationListRefresh] = useState(false);
      const [jobId,setJobId] = useState(null);
    
  const location = useLocation();
  const navigate  = useNavigate();
  const dispatch = useAppDispatch();
  const jobList = useAppSelector((state)=> state?.job?.jobList);

const companyId = location?.state?.companyId;
const companyName = location?.state?.companyName;

// Filter Logic with Job Title, Skills, Company Name & CompanyId
const filteredJobs = jobList?.filter((job) => {
  const lowerQuery = searchQuery.toLowerCase();

  // Match Job Title
  const matchesTitle = job.jobTitle?.toLowerCase().includes(lowerQuery);

  // Match Skills
  const matchesSkill = job.skills?.some((skill) =>
    skill.toLowerCase().includes(lowerQuery)
  );

  // Match Company Name
  const matchesCompany = job?.companyJobId?.name
    ?.toLowerCase()
    .includes(lowerQuery);

  // Status filter
  const matchesStatus =
    statusFilter === "all" ||
    job.status === statusFilter ||
    job.activeStatus === statusFilter;

  // Active/Inactive toggle
  const matchActiveStatus =
    !activeFilter ||
    activeFilter === "all" ||
    activeFilter === job?.activeStatus;

  // ✅ CompanyId condition
  const matchesCompanyId =
    !companyId || job?.companyJobId?._id === companyId;
const matchesLocationType = job?.locationType?.toLowerCase().includes(lowerQuery || '');
  // Final return
  return (
    (matchesTitle || matchesSkill || matchesCompany || matchesLocationType) &&
    matchesStatus &&
    matchActiveStatus &&
    matchesCompanyId 
  );
});
const updateApplicantStatus = async (e, applicationId, newStatus) => {
  e.stopPropagation();

  const payload = {
    applicationId,
    status: newStatus,
  };
  try {
    const response = await applicationStatusChange(payload);
    if (response.status === 200) {
      setSelectedJob((prev) => ({
        ...prev,
        applications: prev.applications.map((app) =>
          app._id === applicationId
            ? { ...app, status: newStatus }
            : app
        ),
      }));

      toast({
        title: "Candidate status updated successfully",
        description: response?.data?.message,
      });
    }
  } catch (error) {
    console.error("Error updating candidate status:", error);

    toast({
      title: "Error updating candidate status",
      description:
        error?.response?.data?.message || error?.message,
      variant: "destructive",
    });
  }
};


  const handleStatusChange = async(id, status)=> {
    try{
        const res = await JobStatusChange(id, status);
        if(res.status===200){
          toast({title:"Status Updated.", description:res.data?.message});
          setJobListRefresh(true);
        }
    }
    catch(err){
      console.log(err);
      toast({title:"Error Status Update", description:err?.response?.data?.message, variant:"destructive"})
    }
  }

  
  const handleAddPublishJob = async(id)=> {
    try{
        const res = await JobPublished(id);
        if(res.status===200){
          toast({title:"Status Updated.", description:res.data?.message});
          setJobListRefresh(true);
        }
    }
    catch(err){
      console.log(err);
      toast({title:"Error Status Update", description:err?.response?.data?.message, variant:"destructive"})
    }
  }

  const handleGetJobs = async() =>{
    try{
      const res = await getAllJob();
      if(res.status===200){
      // setJobList(res.data?.jobs);
      dispatch(getJobList(res?.data?.jobs));
      setJobListRefresh(false);
      }
    }
    catch(err){
      console.log(err);
    }
  }

  useEffect(()=>{
    if(jobList?.length===0||jobListRefresh){
 handleGetJobs()
    }
   
  },[jobListRefresh, jobList?.length])
  
const getStatusBadge = (
  status: string,
  activeStatus: string
) => {
  // Draft always highest priority
  if (status === "draft") {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none">
        Draft
      </Badge>
    );
  }
  
  // Published & Active
  if (status === "published" && activeStatus === "active") {
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
        Publish
      </Badge>
    );
  }

  // Published but Closed
  if (status === "published" && activeStatus === "inactive") {
    return (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">
        publish
      </Badge>
    );
  }

  return <Badge variant="secondary">Unknown</Badge>;
};

  const openJobDetails = (job: any) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  return (
    <>
      <AddJobDialog
        isOpen={formOpen}
        isOpenChange={setFormOpen}
        initialData={initialData}
        setJobListRefresh={setJobListRefresh}
        companyId={null}
      />

       <AddApplicationForm
        isOpen={isCandidateFormOpen}
        onOpenChange={() => { setIsCandidateFormOpen(false) }}
        initialData={initialData}
        setApplicationListRefresh={setApplicationListRefresh}
        jobId={jobId}
      />

      <Helmet>
        <title>Jobs | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/40 p-6 space-y-6 mt-[-40px]">

      <div className="flex justify-between items-center gap-4">
  
  <div>
    <h1 className="inline-block bg-white px-4 py-2 font-bold text-lg rounded-md shadow-sm">
      {companyId ? `${companyName} Company / Jobs` : "All Company Jobs"}
    </h1>
  </div>

  {/* Right Side Button */}
  <Button
    className="gap-2 bg-blue-600 hover:bg-blue-700 md:mt-2"
    onClick={() => {
      setInitialData(null);
      setFormOpen(true);
    }}
  >
    <Plus className="h-4 w-4" />
    Post New Job
  </Button> 

</div>
        {/* Filters */}
   <Card className="shadow-sm">
  <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">

    {/* Wrapper */}
    <div className="flex flex-col md:flex-row w-full md:w-1/2 gap-2 md:items-center">

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search jobs..."
          className="pl-9 w-full md:w-auto"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Toggle + Select row (mobile only side by side) */}
      <div className="flex w-full md:w-auto gap-2">

        {/* Toggle */}
        <div className="flex border rounded-md overflow-hidden w-1/2 md:w-auto">
          <button
            onClick={() => setActiveFilter("active")}
            className={`flex-1 md:flex-none px-3 py-2 text-sm transition ${
              activeFilter === "active"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600"
            }`}
          >
            Active
          </button>

          <button
            onClick={() => setActiveFilter("inactive")}
            className={`flex-1 md:flex-none px-3 py-2 text-sm transition ${
              activeFilter === "inactive"
                ? "bg-gray-500 text-white"
                : "bg-white text-gray-600"
            }`}
          >
            Inactive
          </button>
        </div>

        {/* Select */}
        <div className="w-1/2 md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Publish</SelectItem>
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

    {/* only safety wrapper (no layout change, no gap added) */}
    <div className="w-full overflow-x-auto">

      <Table>

        <TableHeader>
          <TableRow>
            <TableHead className="px-2 md:px-4">Job Title</TableHead>
            <TableHead className="hidden md:table-cell">Location Type</TableHead>
            <TableHead className="px-2 md:px-4">Status</TableHead>
            <TableHead className="hidden md:table-cell">Posted Date</TableHead>
            <TableHead className="px-2 md:px-4">Applications</TableHead>
            <TableHead className="hidden md:table-cell">Hired</TableHead>
            <TableHead className="text-right px-2 md:px-4">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredJobs?.length > 0 ? (
            filteredJobs?.map((job) => (
              <TableRow
                key={job._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openJobDetails(job)}
              >
                <TableCell className="px-2 md:px-4">
                  <div className="space-y-0">
                    <div className="font-medium text-sm md:text-base leading-tight">
                      {job.jobTitle}
                    </div>
                    <div className="text-[11px] md:text-xs text-muted-foreground leading-tight">
                      {job.companyJobId?.name?.charAt(0).toUpperCase() +
                        job?.companyJobId?.name?.slice(1)}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {job.locationType?.charAt(0).toUpperCase() +
                    job?.locationType.slice(1)}
                </TableCell>

                <TableCell className="px-2 md:px-4">
                  {getStatusBadge(job.status, job.activeStatus)}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {Boolean(job.postedDate)
                    ? formatDate(job?.postedDate)
                    : "No Posted"}
                </TableCell>

                <TableCell className="px-2 md:px-4">
                  <div className="flex items-center gap-1 font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {job.applications?.length}
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary" className="rounded-full px-2">
                    {job.applications?.filter(
                      (v) => v?.status === "selected"
                    )?.length}
                  </Badge>
                </TableCell>

                <TableCell className="text-right px-2 md:px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openJobDetails(job);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobId(job?._id);
                          setIsCandidateFormOpen(true);
                        }}
                      >
                        Add Application
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setInitialData(job);
                          setFormOpen(true);
                        }}
                      >
                        Edit Job
                      </DropdownMenuItem>

                      {job?.status === "draft" && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPublishJob(job?._id);
                          }}
                        >
                          Publish Job
                        </DropdownMenuItem>
                      )}

                      {job?.activeStatus === "active" &&
                        job?.status === "published" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(job?._id, "inactive");
                            }}
                          >
                            Close Job
                          </DropdownMenuItem>
                        )}

                      {job?.activeStatus === "inactive" && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(job?._id, "active");
                          }}
                          className="text-green-500"
                        >
                          Make Active
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
                className="text-center py-3 text-muted-foreground text-sm"
              >
                No Job Found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>

      </Table>

    </div>

  </CardContent>
</Card>
      </div>

      {/* Job Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedJob && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-2xl">{selectedJob.jobTitle}</SheetTitle>
                    <SheetDescription className="text-lg">{selectedJob.companyJobId?.name}</SheetDescription>
                  </div>
                 {getStatusBadge(selectedJob.status, selectedJob.activeStatus)}
                </div>
              </SheetHeader>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-4">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {selectedJob?.locationType.charAt(0).toUpperCase() + selectedJob?.locationType?.slice(1)}</div>
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {selectedJob?.type}</div>
                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4" /> {selectedJob?.salary?.min} - {selectedJob?.salary?.max}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Posted:- {Boolean(selectedJob.postedDate)?formatDate(selectedJob?.postedDate):"No Posted"}</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{selectedJob?.applications?.length}</p>
                    <p className="text-xs text-blue-600 font-medium uppercase">Applicants</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedJob?.applications?.filter((v)=> v?.status==="selected")?.length}</p>
                    <p className="text-xs text-green-600 font-medium uppercase">Hired</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedJob.description}</p>

                <h3 className="text-lg font-semibold">Requirements</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {selectedJob?.skills?.map((req: string, i: number) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>

                   <h3 className="text-lg font-semibold">Experience</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedJob?.experience?.min} - {selectedJob?.experience?.max} Year</p>

               <h3 className="text-lg font-semibold">Type</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedJob?.employmentType}</p>


              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => { setInitialData(selectedJob); setFormOpen(true) }}><Edit className="h-4 w-4 mr-2" />Edit Job</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{navigate("/jobs/application",{state:{jobId:selectedJob?._id, jobName:selectedJob?.jobTitle}})}}>View Applications</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Job Sheet (Simplified) */}
    <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
  <SheetContent className="sm:max-w-2xl overflow-y-auto">
    {selectedJob && (
      <div className="space-y-6">

        {/* ================= HEADER ================= */}
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl">
                {selectedJob.jobTitle}
              </SheetTitle>
              <SheetDescription className="text-lg">
                {selectedJob.companyJobId?.name}
              </SheetDescription>
            </div>
            {getStatusBadge(selectedJob.status, selectedJob.activeStatus)}
          </div>
        </SheetHeader>

        {/* ================= BASIC INFO ================= */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {selectedJob?.locationType?.charAt(0).toUpperCase() +
              selectedJob?.locationType?.slice(1)}
          </div>

          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {selectedJob?.employmentType}
          </div>

          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            {selectedJob?.salary?.min} - {selectedJob?.salary?.max}
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Posted:{" "}
            {Boolean(selectedJob.postedDate)
              ? formatDate(selectedJob?.postedDate)
              : "Not Posted"}
          </div>
        </div>

        {/* ================= REQUIREMENTS / EXPERIENCE / TYPE ================= */}
        <div className="grid grid-cols-3 gap-4">

          <Card>
            <CardContent className="p-4 text-center ">
              <p className="text-sm text-muted-foreground">Requirements</p>
              <div className="flex flex-wrap justify-center gap-1 mt-2 max-h-[150px] overflow-y-auto">
                {selectedJob?.skills?.map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Experience</p>
              <p className="font-semibold mt-2">
                {selectedJob?.experience?.min} -{" "}
                {selectedJob?.experience?.max} Years
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-semibold mt-2">
                {selectedJob?.employmentType}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* ================= DESCRIPTION ================= */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            {selectedJob?.description}
          </p>
        </div>

        {/* ================= APPLICATION COUNT BOX ================= */}
        <div
          onClick={() => setShowApplicants(!showApplicants)}
          className="cursor-pointer border rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Total Applications</h3>
            <Badge className="text-sm px-3 py-1">
              {selectedJob?.applications?.length || 0}
            </Badge>
          </div>
        </div>

        {/* ================= APPLICANT LIST ================= */}
        {showApplicants && (
          <div className="max-h-[250px] overflow-y-auto space-y-4 mt-2">
            {selectedJob?.applications?.map((app) => (
              <div
                key={app._id}
                className="border rounded-xl p-4 flex justify-between items-start"
              >
                {/* Left Side */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={app?.applicant?.profileImage} />
                    <AvatarFallback>
                      {app?.applicant?.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h4 className="font-semibold">
                      {app?.applicant?.name}
                    </h4>

                    <div className="flex gap-2 mt-1 flex-wrap">
                      {app?.applicant?.skills?.map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs px-2 py-1"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      getStatusBadgeClassAndText(app?.status)?.className
                    }
                  >
                    {getStatusBadgeClassAndText(app?.status)?.text}
                  </Badge>

                  {statusActions[app?.status]?.length > 0 && (
                    <div className="flex gap-1">
                      {statusActions[app?.status].map((action) => {
                        let btnClass = "text-xs px-2 py-1";
                        let btnVariant: "default" | "outline" = "default";
                        let btnLabel = action;

                        if (action === "interview") {
                          btnClass +=
                            " bg-blue-600 hover:bg-blue-700 text-white";
                        } else if (action === "selected") {
                          btnClass +=
                            " border-green-600 text-green-600 hover:bg-green-50";
                          btnVariant = "outline";
                          btnLabel = "Hire";
                        } else if (action === "rejected") {
                          btnClass +=
                            " border-red-600 text-red-600 hover:bg-red-50";
                          btnVariant = "outline";
                          btnLabel = "Reject";
                        }

                        return (
                          <Button
                            key={action}
                            className={btnClass}
                            variant={btnVariant}
                            size="sm"
                            onClick={(e) =>
                              updateApplicantStatus(e, app._id, action)
                            }
                          >
                            {btnLabel === "screening"
                              ? "In Review"
                              : btnLabel}
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

        {/* ================= FOOTER ACTIONS ================= */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setInitialData(selectedJob);
              setFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Job
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              navigate("/jobs/application", {
                state: {
                  jobId: selectedJob?._id,
                  jobName: selectedJob?.jobTitle,
                },
              })
            }
          >
            View Applications
          </Button>
        </div>

      </div>
    )}
  </SheetContent>
</Sheet>
    </>
  );
};

export default JobsPage;
