import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Briefcase, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllRole, addApplication, updateApplication, getAllJob, getAllCandidates } from "@/services/Service";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getCandidates } from "@/redux-toolkit/slice/job-portal/candidateSlice";
import { getJobList } from "@/redux-toolkit/slice/job-portal/jobSlice";

const ApplicationFormDialog = ({
  isOpen,
  onOpenChange,
  initialData,
  setApplicationListRefresh,
  jobId
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // const [jobList, setJobList] = useState([]);
  const isEdit = Boolean(initialData);
  const [jobListRefresh,setJobListRefresh] = useState(false);
  const [candidateListRefresh,setCandidateListRefresh] = useState(false);

  const [form, setForm] = useState({
    jobId: "",
    applicantId: "",
    coverLetter: "",
  });
   const dispatch = useAppDispatch();
    const candidateList = useAppSelector((state) => state.candidate.candidates);
    const jobList = useAppSelector((state)=> state?.job?.jobList);


  
    const handleGetJobs = async() =>{
      try{
        const res = await getAllJob();
        if(res.status===200){
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
    


  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setForm({
        jobId: initialData.job?._id || "",
        applicantId: initialData.applicant?._id || "",
        coverLetter: initialData.coverLetter || "",
      });
    }else if(jobId){
        setForm({...form, jobId:jobId})
    }
     else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setForm({
      jobId: "",
      applicantId: "",
      coverLetter: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = { ...form };

      let res;
      if (isEdit) {
        res = await updateApplication(initialData._id, payload);
      } else {
        res = await addApplication(payload);
      }

      if (res.status === 200 || res.status === 201) {
        toast({
          title: isEdit ? "Application updated." : "Application added.",
          description: res.data?.message,
        });
        setApplicationListRefresh(true);
      }
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Application" : "Add Application"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update candidate application" : "Fill candidate details"}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit}>
          {/* Job Select */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Select Job*</Label>
            <Select
              value={form.jobId}
              onValueChange={(value) => setForm({ ...form, jobId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Job" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {jobList?.filter((v)=> v?.status==="published"&& v?.activeStatus==="active").map((job) => (
                  <SelectItem key={job._id} value={job._id} className="cursor-pointer">
                    {job.jobTitle} ({job.companyJobId?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Applicant Select */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Select Applicant*</Label>
            <Select
              value={form.applicantId}
              onValueChange={(value) => setForm({ ...form, applicantId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Applicant" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {candidateList?.map((app) => (
                  <SelectItem key={app._id} value={app._id} className="cursor-pointer">
                    {app.name} ({app.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>        

          {/* Cover Letter */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Cover Letter(Optional)</Label>
            <Input
              type="text"
              placeholder="Cover Letter"
              value={form.coverLetter}
              onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
              className="placeholder:text-xs"
            />
          </div>

          {/* Status */}
          {/* <div className="flex flex-col gap-1">
            <Label className="text-xs">Status*</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm({ ...form, status: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                 <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* Submit Button */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isLoading || !form?.jobId || !form?.applicantId}>
              {isLoading && <Loader2 className="animate-spin mr-2" />}
              {isLoading ? (isEdit ? "Updating..." : "Adding...") : isEdit ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationFormDialog;