import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Briefcase, User, GraduationCap, CheckCircle, Mail, Phone, DollarSign, MapPin, Backpack, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import RoleDialog from "./RoleDialog";
import { getRoles } from "@/redux-toolkit/slice/job-portal/roleSlice";
import { getAllRole, addCandidate, updateCandidate } from "@/services/Service";
import { title } from "process";
import { useToast } from "@/hooks/use-toast";

interface AddCandidateFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  setCandidateListRefresh: (value: boolean) => void;
}

const AddCandidateForm: React.FC<AddCandidateFormProps> = ({ isOpen, onClose, initialData, setCandidateListRefresh }) => {
  const { toast } = useToast();
  const dobRef = useRef(null);
  const formRef = useRef(null);
  const imageRef = useRef(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", role: "", profileImage: null, resume: null, gender: "male", dob: "", address: "", designation: "", totalExperience: "", relevantExperience: "", currentCTC: "", expectedSalary: "", noticePeriod: "", employmentType: "fullTime", preferredLocation: "", skills: [], highestQualification: "", universityName: "", passingYear: "", remarks: ""
  });
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [roleListRefresh, setRoleListRefresh] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const dispatch = useAppDispatch();
  const roleList = useAppSelector((state) => state?.role?.roles);
  const isEdit = Boolean(initialData);

  const handleScroll = () => {
    const el = formRef.current;

    const isBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

    setShowArrow(!isBottom);
  };
  const handleChangeImage = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setForm({ ...form, profileImage: file });
      // Preview generate karne ke liye
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData?.name || "",
        email: initialData?.email || "",
        mobile: initialData?.mobile || "",
        role: initialData?.role?._id || "",
        resume: initialData?.resume || null,
        gender: initialData?.gender || "male",
        dob: initialData?.dob ? new Date(initialData.dob).toISOString().split("T")[0] : "",
        address: initialData?.address || "",
        designation: initialData?.designation || "",
        totalExperience: initialData?.totalExperience || "",
        relevantExperience: initialData?.relevantExperience || "",
        currentCTC: initialData?.currentCTC || "",
        expectedSalary: initialData?.expectedSalary || "",
        noticePeriod: initialData?.noticePeriod || "",
        employmentType: initialData?.employmentType || "fullTime",
        preferredLocation: initialData?.preferredLocation || "",
        skills: initialData?.skills || [],
        highestQualification: initialData?.highestQualification || "",
        universityName: initialData?.universityName || "",
        passingYear: initialData?.passingYear || "",
        remarks: initialData?.remarks || "",
        profileImage: initialData?.profileImage || ""
      });
      setImagePreview(initialData?.profileImage);
    }
  }, [initialData]);

  const resetForm = () => {
    setForm({
      name: "", email: "", mobile: "", role: "", profileImage: null, resume: null, gender: "male", dob: "", address: "", designation: "", totalExperience: "", relevantExperience: "", currentCTC: "", expectedSalary: "", noticePeriod: "", employmentType: "fullTime", preferredLocation: "", skills: [], highestQualification: "", universityName: "", passingYear: "", remarks: ""
    });
    setStep(1);
    setIsLoading(false);
    setImagePreview("");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData();
    for (const key in form) {
      if (form.hasOwnProperty(key)) {
        // If the field is an array (skills), append each item individually
        if (Array.isArray(form[key])) {
          form[key].forEach(item => formData.append(key, item));
        } else {
          formData.append(key, form[key]);
        }
      }
    }

    // Add id if edit mode
    if (isEdit && initialData?._id) {
      formData.append("id", initialData._id);
    }

    try {
      const res = await (isEdit ? updateCandidate(formData) : addCandidate(formData));
      if (res.status === 200 || res.status === 201) {
        toast({ title: `${isEdit ? "Updated" : "Added"} Candidate.`, description: res?.data?.message });
        setCandidateListRefresh(true);
        resetForm();
        onClose();
      }
    }
    catch (error) {
      console.log(error);
      toast({ title: "Error Candidate.", description: error?.response?.data?.message || error?.message, variant: "destructive" })
    }
    finally {
      setIsLoading(false);
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
  }, [roleList?.length, roleListRefresh, setRoleListRefresh]);

  return (
    <>
      <RoleDialog
        isOpen={isRoleFormOpen}
        onClose={() => { setIsRoleFormOpen(false) }}
        setRoleListRefresh={setRoleListRefresh}
        initialData={null}
      />

      <Dialog open={isOpen} onOpenChange={() => { resetForm(); onClose() }}>
        <DialogContent className="md:w-[600px]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                {step === 2 && <ArrowLeft className="w-5 h-5 text-gray-700 cursor-pointer" onClick={() => { setStep(1) }} />}
                <span className="text-lg font-semibold">Add Candidate</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Add a new candidate to the system. Step-{step}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} ref={formRef} onScroll={handleScroll} className={step === 1 ? "relative max-h-[500px] overflow-y-auto no-scrollbar p-2" : "relative max-h-[500px] overflow-y-auto no-scrollbar p-2"}>
            {step === 1 && (
              <>
                <Label className="block mb-2 text-xs">Name*</Label>
                <Input type="text" value={form?.name} required onChange={(e) => { setForm({ ...form, name: e.target.value }) }} placeholder="Full name" className="placeholder:text-xs" />
                <div className="flex flex-row justify-between md:mt-1">
                  <div className="flex-1">
                    <Label className="block my-2 text-xs">Email*</Label>
                    <Input type="email" value={form?.email} required onChange={(e) => { setForm({ ...form, email: e.target.value }) }} placeholder="Email address" className="placeholder:text-xs" />
                  </div>
                  <div className="flex-1 ml-2">
                    <Label className="block my-2 text-xs">Mobile*</Label>
                    <Input type="text" value={form?.mobile} maxLength={10} required onChange={(e) => { const onlyNumbers = e.target.value.replace(/\D/g, ''); setForm({ ...form, mobile: onlyNumbers }) }} placeholder="Mobile number" className="placeholder:text-xs" />
                  </div>
                </div>

                <div className="flex flex-row justify-between">
                  <div className="flex-1 ">
                    <Label className="block my-2 text-xs">Gender*</Label>
                    <Select value={form?.gender || "male"} required onValueChange={(value: string) => { setForm({ ...form, gender: value }) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 ml-2">
                    <Label className="block my-2 text-xs">DOB*</Label>
                    <Input type="date" ref={dobRef} value={form?.dob} required onChange={(e) => { setForm({ ...form, dob: e.target.value }) }} placeholder="Date of birth" className="placeholder:text-xs" onClick={() => { if (dobRef.current?.showPicker) { dobRef.current?.showPicker() } }} />
                  </div>

                </div>
                <div className="flex flex-row justify-between gap-2">
                  {/* Address Input */}
                  <div className="flex-1">
                    <Label className="block my-2 text-xs">Address*</Label>
                    <Input
                      type="text"
                      value={form?.address}
                      required
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Residential address"
                      className="placeholder:text-xs"
                    />
                  </div>

                  {/* Role Select */}
                  <div className="flex-1">
                    <Label className="block my-2 text-xs">Role</Label>

                    {roleList?.length > 0 ? (
                      <Select
                        value={form?.role}
                        required
                        onValueChange={(value: string) => setForm({ ...form, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleList.filter((v) => v?.isActive !== false).map((role) => (
                            <SelectItem key={role._id} value={role._id}>
                              {role.name}
                            </SelectItem>
                          ))}

                          {/* Add New Button as last item */}
                          <div className="px-2 py-1 border-t mt-1">
                            <button
                              type="button"
                              className="text-sm text-primary hover:underline w-full text-left"
                              onClick={() => { setIsRoleFormOpen(true) }}
                            >
                              + Add New Role
                            </button>
                          </div>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="No roles available" />
                          </SelectTrigger>
                        </Select>
                        <p className="text-xs text-muted mt-1 flex items-center justify-between gap-2">
                          Add role first
                          <button
                            type="button"
                            onClick={() => { setIsRoleFormOpen(true) }}
                            className="px-2 py-1 text-xs bg-primary text-white rounded"
                          >
                            Add
                          </button>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-row justify-between mt-2">
                  <div className="flex-1 ">
                    <Label className="block my-2 text-xs">Desigation*</Label>
                    <Input type="text" value={form?.designation} required onChange={(e) => { setForm({ ...form, designation: e.target.value }) }} placeholder="Current designation" className="placeholder:text-xs" />
                  </div>
                  <div className="flex-1 ml-2 ">
                    <Label className="block my-2 text-xs">Total Experience(years)*</Label>
                    <Input type="text" value={form?.totalExperience} required onChange={(e) => { setForm({ ...form, totalExperience: e.target.value }) }} placeholder="Total experience (yrs)" className="placeholder:text-xs" /> </div>
                </div>
                <div className="flex flex-row justify-between mt-2">
                  <div className="flex-1">
                    <Label className="block my-2 text-xs">Relevant Experience(years)*</Label>
                    <Input type="text" value={form?.relevantExperience} required onChange={(e) => { setForm({ ...form, relevantExperience: e.target.value }) }} placeholder="Relevant experience (yrs)" className="placeholder:text-xs" />
                  </div>
                  <div className="flex-1 ml-2">
                    <Label className="block my-2 text-xs">Current CTC (in LPA)*</Label>
                    <Input type="text" value={form?.currentCTC} required onChange={(e) => { setForm({ ...form, currentCTC: e.target.value }) }} placeholder="Current CTC (in LPA)" className="placeholder:text-xs" />
                  </div>
                </div>
                <div className="relative w-full h-24 mt-2">
                  <Label className="block my-2 text-xs">Profile Image(Optional)</Label>

                  {/* File Input */}
                  <Input
                    ref={imageRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChangeImage} // File handling
                    className="placeholder:text-xs"
                  />

                  {/* Preview Card */}
                  {imagePreview && (
                    <div className="relative w-24 h-24 mt-2 border rounded overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />

                      {/* Cut / Remove Icon */}
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-gray-200 rounded-full p-1 hover:bg-gray-300"
                        onClick={() => {
                          setForm({ ...form, profileImage: null });
                          setImagePreview(""); if (imageRef?.current) imageRef.current.value = "";
                        }}
                      >
                        ✖
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-row justify-end mt-2s">
                  <Button type="button" variant="outline" className="mx-2 my-2" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
                  <Button type="button" variant="default" className="mx-2 my-2" onClick={() => { setStep(2) }} disabled={isLoading || !form?.name || !form?.email || !form?.mobile || !form?.address || !form?.gender || !form?.dob || !form?.address || !form?.designation || !form?.totalExperience || !form?.relevantExperience || !form?.currentCTC}>Next</Button>
                </div>
                {showArrow && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-black-600 text-sm animate-bounce pointer-events-none">
                    ↓
                  </div>
                )}
              </>
            )}
            {
              step === 2 && (
                <>
                  <div className="flex flex-row justify-between">
                    <div className="flex-1">
                      <Label className="block my-2 text-xs">Expected Salary(in LPA)*</Label>
                      <Input type="text" value={form?.expectedSalary} required onChange={(e) => { setForm({ ...form, expectedSalary: e.target.value }) }} placeholder="Expected salary (in LPA)" className="placeholder:text-xs" />
                    </div>
                    <div className="flex-1 ml-2">
                      <Label className="block my-2 text-xs">Notice Period*</Label>
                      <Input type="text" value={form?.noticePeriod} required onChange={(e) => { setForm({ ...form, noticePeriod: e.target.value }) }} placeholder="Notice period" className="placeholder:text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-row justify-between">
                    <div className="flex-1">
                      <Label className="block my-2 text-xs">Employment Type*</Label>
                      <Select value={form?.employmentType || "onSite"} required onValueChange={(value: string) => { setForm({ ...form, employmentType: value }) }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a employment type" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="fullTime">FullTime</SelectItem>
                          <SelectItem value="partTime">PartTime</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="contract">contract</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 ml-2">
                      <Label className="block my-2 text-xs">Preferred Location*</Label>
                      <Input type="text" value={form?.preferredLocation} required onChange={(e) => { setForm({ ...form, preferredLocation: e.target.value }) }} placeholder="Preferred location" className="file:text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-row justify-between">
                    <div className="flex-1">
                      <Label className="block my-2 text-xs">Skills*</Label>
                      <Input
                        type="text"
                        value={form?.skills?.join(", ")} // Array ko display karne ke liye join
                        required
                        onChange={(e) => {
                          // Input ko comma se split karke array me convert karna
                          const skillsArray = e.target.value.split(",").map(skill => skill.trim());
                          setForm({ ...form, skills: skillsArray });
                        }}
                        placeholder="Key skills (comma separated)"
                        className="placeholder:text-xs"
                      />
                    </div>

                    <div className="flex-1 ml-2">
                      <Label className="block my-2 text-xs">Resume Upload(Optional)</Label>
                      <div className="relative">
                        {/* Hidden actual file input */}
                        <Input
                          type="file"
                          id="resume-upload"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setForm({ ...form, resume: file });
                          }}
                        />

                        {/* Custom styled label */}
                        <label
                          htmlFor="resume-upload"
                          className="flex items-center justify-center w-full p-3 border-2 border-dashed rounded-md cursor-pointer text-sm text-gray-600 hover:border-primary hover:bg-primary/5"
                        >
                          {form?.resume ? "form.resume.name" : "Click to upload resume"}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row justify-between">
                    <div className="flex-1">
                      <Label className="block my-2 text-xs">Highest Qualification*</Label>
                      <Input type="text" value={form?.highestQualification} required onChange={(e) => { setForm({ ...form, highestQualification: e.target.value }) }} placeholder="Highest qualification" className="placeholder:text-xs" />
                    </div>
                    <div className="flex-1 ml-2">
                      <Label className="block my-2 text-xs">University/School Name*</Label>
                      <Input type="text" value={form?.universityName} required onChange={(e) => { setForm({ ...form, universityName: e.target.value }) }} placeholder="University/School name" className="placeholder:text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-row justify-between">
                    <div className="flex-1">
                      <Label className="block my-2 text-xs">Passing Year*</Label>
                      <Input type="text" value={form?.passingYear} required onChange={(e) => { setForm({ ...form, passingYear: e.target.value }) }} placeholder="Year of passing" className="placeholder:text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="block my-2 text-xs">Remarks/Notes(Optional)</Label>
                    <Input type="text" value={form?.remarks} onChange={(e) => { setForm({ ...form, remarks: e.target.value }) }} placeholder="Remarks/Notes" className="placeholder:text-xs" />
                  </div>

                  <div className="flex flex-row justify-end">
                    <Button type="button" variant="outline" className="text-sm mx-2 mt-2" onClick={() => { setStep(1) }}>Back</Button>
                    <Button
                      disabled={isLoading || !form.expectedSalary || !form?.noticePeriod || !form?.employmentType || !form?.preferredLocation || !form?.skills || !form?.highestQualification || !form?.universityName || !form?.passingYear}
                      type="submit" variant="default" className="text-sm mx-2 mt-2">
                      {isLoading && <Loader2 className="animate-spin" />}
                      {isLoading ? "Submiting..." : "Submit"}
                    </Button>
                  </div>
                </>
              )

            }
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddCandidateForm;
