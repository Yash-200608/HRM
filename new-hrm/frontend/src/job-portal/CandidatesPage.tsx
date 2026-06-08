import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, MoreHorizontal, Mail, Phone, MapPin, Briefcase, FileText, CheckCircle2, XCircle, Clock, Calendar, Download, Users, Linkedin, Github } from "lucide-react";
import { Helmet } from "react-helmet-async";
import AddCandidateForm from "@/job-portal/forms/CandidateDialog";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getCandidates } from "@/redux-toolkit/slice/job-portal/candidateSlice";
import { getAllCandidates, candidateStatusChange } from "@/services/Service";
import { formatDate, getStatusBadgeClassAndText, statusActions } from "@/services/allFunctions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CandidatesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCandidateFormOpen, setIsCandidateFormOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [candidateListRefresh, setCandidateListRefresh] = useState(false);
  const dispatch = useAppDispatch();
  const candidateList = useAppSelector((state) => state.candidate.candidates);
  const roleList = useAppSelector((state) => state.role.roles);
  // Filter Logic
  const filteredCandidates = candidateList?.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || candidate.candidateStatus === statusFilter;
    const matchesRole = roleFilter === "all" || candidate.role?._id === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const openCandidateDetails = (candidate: any) => {
    setSelectedCandidate(candidate);
    setIsSheetOpen(true);
  };

  const updateStatus = async (e, id, status) => {
    e.stopPropagation();
    let obj = { adminId:user?._id, userId:id, status }
    try {
      const response = await candidateStatusChange(obj);
      if (response.status === 200) {
        if(selectedCandidate?._id === id){
    setSelectedCandidate(prev => ({...prev, candidateStatus: status}));
  }
          toast({ title: "Candidate status updated successfully", description: response?.data?.message });
        setCandidateListRefresh(true);
      }
    }
    catch (error) {
      console.error("Error updating candidate status:", error);
      toast({ title: "Error updating candidate status", description: error?.message|| error?.response?.data?.message, variant:"destructive" });
    }

  };

  const handleGetCandidates = async () => {
    try {
      const response = await getAllCandidates();
      if (response.status === 200) {
        dispatch(getCandidates(response?.data?.data));
        setCandidateListRefresh(false);
      }

    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  useEffect(() => {
    if (candidateList.length === 0 || candidateListRefresh) {
      handleGetCandidates();
    }
  }, [candidateListRefresh, candidateList.length]);

  return (
    <>
      <AddCandidateForm
        isOpen={isCandidateFormOpen}
        onClose={() => { setIsCandidateFormOpen(false) }}
        initialData={initialData}
        setCandidateListRefresh={setCandidateListRefresh}
      />

      <Helmet>
        <title>Candidates | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/40 p-6 space-y-6">

        {/* Page Header */}
        <div className="flex sm:flex-row justify-end  gap-4 mt-[-30px]">
          <div className="flex items-center gap-2">
            <Button onClick={() => { setInitialData(null); setIsCandidateFormOpen(true) }} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Briefcase className="h-4 w-4" /> Add Candidate
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
              <h3 className="text-2xl font-bold mt-1">{candidateList?.length}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </Card>
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Shortlisted</p>
              <h3 className="text-2xl font-bold mt-1">{candidateList?.filter((candidate) => candidate.candidateStatus === "shortlisted").length}</h3>
            </div>
            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
          </Card>
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Review</p>
              <h3 className="text-2xl font-bold mt-1">{candidateList?.filter((candidate) => candidate.candidateStatus === "screening").length}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </Card>
          <Card className="items-center p-4 flex justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hired</p>
              <h3 className="text-2xl font-bold mt-1">{candidateList?.filter((candidate) => candidate.candidateStatus === "selected").length}</h3>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-green-600" />
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
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Roles</SelectItem>
                    {roleList.map((role) => (
                      <SelectItem key={role?._id} value={role?._id} className="cursor-pointer">{role?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent >
                    <SelectItem value="all" className="cursor-pointer">All Status</SelectItem>
                    <SelectItem value="screening" className="cursor-pointer">In Review</SelectItem>
                    <SelectItem value="shortlisted" className="cursor-pointer">Shortlisted</SelectItem>
                    <SelectItem value="interview" className="cursor-pointer">Interview</SelectItem>
                    <SelectItem value="selected" className="cursor-pointer">Hired</SelectItem>
                    <SelectItem value="rejected" className="cursor-pointer">Rejected</SelectItem>
                  </SelectContent>
                </Select> */}

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role Applied</TableHead>
                  <TableHead>Date Applied</TableHead>
                  {/* <TableHead>Status</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((candidate) => (
                    <TableRow key={candidate._id} className="cursor-pointer hover:bg-muted/50" onClick={() => openCandidateDetails(candidate)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={candidate?.profileImage} alt={candidate?.name} />
                            <AvatarFallback>{candidate?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{candidate?.name}</div>
                            <div className="text-xs text-muted-foreground">{candidate?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{candidate?.role?.name}</TableCell>
                      <TableCell>{formatDate(candidate?.createdAt)}</TableCell>
                      {/* <TableCell><Badge className={getStatusBadgeClassAndText(candidate?.candidateStatus)?.className}>{getStatusBadgeClassAndText(candidate?.candidateStatus)?.text}</Badge></TableCell> */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" >
                            <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setInitialData(candidate); setIsCandidateFormOpen(true) }}>
                              Edit
                            </DropdownMenuItem>

                            {/* View Profile - Always visible */}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openCandidateDetails(candidate);
                              }}
                              className="cursor-pointer"
                            >
                              View Profile
                            </DropdownMenuItem>

                            {/* Dynamic Status Buttons */}
                            {/* {statusActions[candidate.candidateStatus]?.map((action) => (
                              <DropdownMenuItem
                                key={action}
                                onClick={(e) =>
                                  updateStatus(e, candidate._id, action)
                                }
                                className={action === "rejected" ? "text-red-600 cursor-pointer" : "cursor-pointer"}
                              >
                                {action === "shortlisted" && "Shortlist"}
                                {action === "interview" && "Schedule Interview"}
                                {action === "selected" && "Select"}
                                {action === "rejected" && "Reject"}
                                {action === "screening" && "In Review"} 
                              </DropdownMenuItem>
                            ))} */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No candidates found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      {/* Candidate Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedCandidate && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>Candidate Profile</SheetTitle>
                <SheetDescription>Detailed information about the applicant.</SheetDescription>
              </SheetHeader>

              {/* Profile Header */}
              <div className="flex items-center gap-4 py-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCandidate?.profileImage} />
                  <AvatarFallback className="text-lg">{selectedCandidate?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{selectedCandidate?.name}</h2>
                  <p className="text-muted-foreground">{selectedCandidate?.role?.name}</p>
                  {/* <div className="mt-2 text-sm"><Badge className={getStatusBadgeClassAndText(selectedCandidate?.candidateStatus)?.className}>{getStatusBadgeClassAndText(selectedCandidate?.candidateStatus)?.text}</Badge></div> */}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Contact Information</h3>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{selectedCandidate?.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{selectedCandidate?.mobile}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedCandidate?.address}</span>
                </div>
              </div>

              {/* Proffessional Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Professional Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Total Experience</span>
                    <p className="font-medium">{selectedCandidate?.totalExperience}</p>
                  </div>
                   <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Relevant Experience</span>
                    <p className="font-medium">{selectedCandidate?.relevantExperience}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Applied Date</span>
                    <p className="font-medium">{formatDate(selectedCandidate.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
        {/* { statusActions[selectedCandidate?.candidateStatus]?.length > 0 && (
  <div className="pt-6 border-t flex flex-col gap-3">
    {statusActions[selectedCandidate?.candidateStatus].map((action) => {
      // Button ke liye default props
      let btnClass = "w-full";
      let btnVariant: "default" | "outline" = "default";
      let btnLabel = action;

      // Styling logic action ke type ke hisaab se
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
          onClick={(e) => updateStatus(e,selectedCandidate._id, action)}
        >
          {btnLabel==="screening"?"In Review":btnLabel}
        </Button>
      );
    })}
  </div>
)} */}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CandidatesPage;
