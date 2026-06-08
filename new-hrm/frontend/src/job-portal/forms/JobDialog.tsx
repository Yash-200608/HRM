import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addJob, updateJob, getAllCompanyJob } from "@/services/Service";
import AddCompanyDialog from "./CompanyDialog";
import {formatDateFromInput} from "@/services/allFunctions";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getCompanyJobList } from "@/redux-toolkit/slice/job-portal/companyJobSlice";

const AddJobDialog = ({ isOpen, isOpenChange, initialData, setJobListRefresh, companyId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const dateRef = useRef(null);
  const [step, setStep] = useState(1);
  // const [companyJobList, setCompanyJobList] = useState([]);
  const [companyDialog, setCompanyDialog] = useState(false)
  const [companyJobListRefresh, setCompanyListRefresh] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const dispatch = useAppDispatch();
  const companyJobList = useAppSelector((state)=> state?.companyJob?.companyJobList)

  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    jobTitle: "",
    companyJobId: "",
    locationType: "",
    address: "",
    description: "",
    employmentType: "",
    experience: { min: "", max: "" },
    salary: { min: "", max: "" },
    skills: [],
    postedBy: user?._id || "",
    expiresAt: "",
  });


  const handleGetCompanyJob = async () => {
    try {
      const res = await getAllCompanyJob();
      if (res.status === 200) {
        dispatch(getCompanyJobList(res?.data?.data))
        setCompanyListRefresh(false);
      }
    }
    catch (err) {
      console.log(err);

    }
  }

  useEffect(() => {
    if (companyJobList.length === 0 || companyJobListRefresh) {
      handleGetCompanyJob();
    }
  }, [companyJobListRefresh, companyJobList.length])

  useEffect(() => {
    if (initialData) {
      setForm({
        jobTitle: initialData.jobTitle || "",
        companyJobId: initialData.companyJobId?._id || "",
        locationType: initialData.locationType || "",
        address: initialData.address || "",
        description: initialData.description || "",
        employmentType: initialData.employmentType || "",
        experience: {
          min: initialData.experience?.min || "",
          max: initialData.experience?.max || "",
        },
        salary: {
          min: initialData.salary?.min || "",
          max: initialData.salary?.max || "",
        },
        skills: initialData.skills || [],
        postedBy: initialData.postedBy?._id || user?._id,
        expiresAt: formatDateFromInput(initialData.expiresAt) || "",
      });
    }
    else if(companyId){
      setForm({...form, companyJobId:companyId})
    }
     else {
      resetForm();
    }
  }, [initialData, user, isOpen]);

  const resetForm = () => {
    setStep(1);
    setForm({
      jobTitle: "",
      companyJobId: "",
      locationType: "",
      address: "",
      description: "",
      employmentType: "",
      experience: { min: "", max: "" },
      salary: { min: "", max: "" },
      skills: [],
      postedBy: user?._id || "",
      expiresAt: "",
    });
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setLoadingType(type);

    try {
      // Prepare payload for backend
      const payload = {
        ...form,
        skills: form.skills.map((s) => s.trim().toLowerCase()),
        experience: {
          min: Number(form.experience.min),
          max: Number(form.experience.max),
        },
        salary: {
          min: form.salary.min ? Number(form.salary.min) : undefined,
          max: form.salary.max ? Number(form.salary.max) : undefined,
        },
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        adminId: user?._id,
        status: type,
        id:initialData?._id || null
      };

      // Uncomment and use your API calls
      const res = isEdit ? await updateJob(payload) : await addJob(payload);
      if (res.status === 200 || res.status === 201) {
        setJobListRefresh(true);
        toast({ title: isEdit ? "Job updated." : "Job added.", description: res.data?.message });
      }

    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setLoadingType(null);
      resetForm();
      isOpenChange(false);
    }
  };

  return (
    <>
     <AddCompanyDialog
            isOpen={companyDialog}
            isOpenChange={setCompanyDialog}
            initialData={null}
            setCompanyListRefresh={setCompanyListRefresh}
          />

    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) resetForm();
        isOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Job" : "Add Job"}</DialogTitle>
          <DialogDescription>Step {step}: Fill job details</DialogDescription>
        </DialogHeader>

        <form className="p-2">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="text-xs">Job Title*</Label>
                  <Input
                    type="text"
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="Job Title"
                    required
                    className="placeholder:text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Company Name*</Label>

                  {companyJobList?.length === 0 ? (
                    <>
                      {/* Disabled Select */}
                      <Select value="" disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="No Companies Available" className="text-xs" />
                        </SelectTrigger>
                      </Select>

                      {/* Message */}
                      <p className="text-[10px] text-gray-500 mt-1">
                        No companies found. Please add a company first.
                      </p>

                      {/* Disabled Add Button */}
                      <Button
                        variant="outline"
                        onClick={()=> {setCompanyDialog(true)}}
                        className="mt-1"
                      >
                        Add Company
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Normal Select */}
                      <Select
                        value={form?.companyJobId}
                        onValueChange={(value) => setForm({ ...form, companyJobId: value })}
                        disabled={companyJobList?.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Company" className="text-xs" />
                        </SelectTrigger>
                       {companyJobList?.length > 0 && (
                        <SelectContent className="max-h-[200px] overflow-y-auto ">
                          {companyJobList?.filter((v)=>v?.status==="active").map((v) => (
                            <SelectItem key={v?._id} value={v?._id}>
                              {v?.name}
                            </SelectItem>
                          ))}
                          <div className="border-t my-1" />

                          <button
                            type="button"
                            onClick={() => { setCompanyDialog(true) }}
                            className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                          >
                            + Add New Company
                          </button>
                        </SelectContent>
                        )}
                      </Select>
                    </>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Location Type*</Label>
                    <Select
                      value={form.locationType}
                      onValueChange={(value) => setForm({ ...form, locationType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Location Type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] w-[200px] overflow-y-auto">
                        <SelectItem value="onSite">On-Site</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Address*</Label>
                    <Input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Job Address"
                      required
                      className="placeholder:text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Description(Optional)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Job Description"
                    required
                    className="placeholder:text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    isOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setStep(2)}
                  disabled={
                    !form.jobTitle ||
                    !form.companyJobId ||
                    !form.locationType ||
                    !form.address
                  }
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Additional Info */}
          {step === 2 && (
            <>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="text-xs">Skills*</Label>
                  <Input
                    type="text"
                    placeholder="Comma separated skills"
                    value={form.skills.join(", ")}
                    onChange={(e) => {
                      const skillsArray = e.target.value.split(",").map((s) => s.trim());
                      setForm({ ...form, skills: skillsArray });
                    }}
                    required
                    className="placeholder:text-xs"
                  />
                </div>

                {/* Row 2: Experience Min + Max */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Experience Min*</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.experience.min}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          experience: { ...form.experience, min: e.target.value },
                        })
                      }
                      placeholder="Min years"
                      required
                      className="placeholder:text-xs"
                    />
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Experience Max*</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.experience.max}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          experience: { ...form.experience, max: e.target.value },
                        })
                      }
                      placeholder="Max years"
                      required
                      className="placeholder:text-xs"
                    />
                  </div>
                </div>

                {/* Row 3: Salary Min + Max */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Salary Min</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.salary.min}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          salary: { ...form.salary, min: e.target.value },
                        })
                      }
                      placeholder="Min"
                      className="placeholder:text-xs"
                    />
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Salary Max</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.salary.max}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          salary: { ...form.salary, max: e.target.value },
                        })
                      }
                      placeholder="Max"
                      className="placeholder:text-xs"
                    />
                  </div>
                </div>

                {/* Row 4: Skills */}

                <div className="flex">
                  <div className="flex-1">
                    <Label className="text-xs">Employment Type*</Label>
                    <Select
                      value={form.employmentType}
                      onValueChange={(value) => setForm({ ...form, employmentType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Employment Type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] w-full overflow-y-auto">
                        <SelectItem value="fullTime">Full-Time</SelectItem>
                        <SelectItem value="partTime">Part-Time</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 ml-4">
                    <Label className="text-xs">Expire/End Date</Label>
                    <Input type="date" ref={dateRef} value={form.expiresAt || ""} onChange={(e) => { setForm({ ...form, expiresAt: e.target.value }) }} onClick={()=>{if(dateRef.current?.showPicker){dateRef.current.showPicker()}}} />
                  </div>
                </div>

              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
             {
              initialData?.status!=="published" &&
               <Button
                  type="submit"
                  onClick={(e) => { handleSubmit(e, "draft") }}
                  variant="default"
                  disabled={
                    loadingType==="draft" ||
                    !form.employmentType ||
                    !form.experience.min ||
                    !form.experience.max ||
                    !form.skills.length
                  }
                >
                  {loadingType==="draft" && <Loader2 className="animate-spin mr-2" />}
                  {loadingType==="draft" ? (isEdit ? "Updating Draft..." : "Adding Draft...") : isEdit ? "Update Draft" : "Add Draft"}
                </Button>
}
                <Button
                  type="submit"
                  className="bg-green-500 hover:bg-green-400"
                  onClick={(e) => { handleSubmit(e, "published") }}
                  disabled={
                    loadingType==="published" ||
                    !form.employmentType ||
                    !form.experience.min ||
                    !form.experience.max ||
                    !form.skills.length
                  }
                >
                  {loadingType==="published" && <Loader2 className="animate-spin mr-2" />}
                  {loadingType==="published" ? (isEdit ? "Updating Publish..." : "Adding Publish...") : isEdit ? "Update Publish" : "Add Publish"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AddJobDialog;