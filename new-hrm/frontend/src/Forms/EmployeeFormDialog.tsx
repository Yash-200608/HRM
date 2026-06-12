
import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getDepartments, addEmployees, updateEmployees } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateFromInput, getPasswordErrors } from "@/services/allFunctions";
import DepartmentDialog from "@/Forms/DepartmentDialog";
import { EmployeeFormDialogProps, EmployeeDepartment } from "@/types/index";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getDepartment } from "@/redux-toolkit/slice/allPage/departmentSlice";
import { socket } from "@/socket/socket";
import {ValidateEmployeeForm} from "@/hook/EmployeeDialog";
import { resolveCompanyIdFromUser } from "@/lib/tenant";

export const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onClose,
  isEditMode = false,
  initialData,
  setEmployeeListRefresh,
  selectedDepartmentId
}) => {
  
  const { user } = useAuth();
  const companyId = resolveCompanyIdFromUser(user);
  const { toast } = useToast();

  const [formStep, setFormStep] = useState(1);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Previews
  const [imagePreview, setImagePreview] = useState("");
  const [salarySlipPreview, setSalarySlipPreview] = useState("");
  const [aadhaarPreview, setAadhaarPreview] = useState("");
  const [panPreview, setPanPreview] = useState("");
  const [bankPreview, setBankPreview] = useState("");
  const [departmentRefresh, setDepartmentRefresh] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmited, setIsSubmited] = useState(false);
const [passwordErrors, setPasswordErrors] = useState([]); 
const [errors, setErrors] = useState<any>({}) 

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);
  const salarySlipRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef(null);
  const formRef = useRef(null);
  const [showArrow, setShowArrow] = useState(true);
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.department.departments);


  const handleScroll = () => {
    const el = formRef.current;

    const isBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

    setShowArrow(!isBottom);
  };


  const handleGetDepartment = async () => {
    if (!companyId) return;
    try {
      const data = await getDepartments(companyId);
      dispatch(getDepartment(data || []));
      setDepartmentRefresh(false);
    } catch (err: any) {
      console.error("Error fetching departments:", err);
    }
  };

  useEffect(() => {
    if (categories?.length === 0) {
      handleGetDepartment()
    }
  }, [categories?.length])

  useEffect(() => {
    if (selectedDepartmentId) {
      setCurrentEmployee((prev) => ({ ...prev, department: selectedDepartmentId }));
    }
  }, [selectedDepartmentId]);

  useEffect(() => {
    if (user?.role === "admin" && (categories.length === 0 || departmentRefresh)) {
      // handleGetDepartment();
    }
  }, [user, departmentRefresh]);

  useEffect(() => {
    if (initialData) {
      setCurrentEmployee({
        ...initialData,
        department: initialData?.department?._id,
        documents: {
          Aadhaar: initialData.documents?.aadhaar
            ? { url: initialData.documents.aadhaar }
            : { url: "" },
          PAN: initialData.documents?.panCard
            ? { url: initialData.documents.panCard }
            : { url: "" },
          BankPassbook: initialData.documents?.bankPassbook
            ? { url: initialData.documents.bankPassbook }
            : { url: "" },
          SalarySlip: initialData.documents?.salarySlip
            ? { url: initialData.documents.salarySlip }
            : { url: "" },
          ifscCode: initialData.documents?.ifscCode
            ? initialData.documents?.ifscCode
            : "",
        }
      });

      setImagePreview(initialData?.profileImage);
      setAadhaarPreview(initialData.documents?.aadhaar);
      setPanPreview(initialData.documents?.panCard);
      setBankPreview(initialData.documents?.bankPassbook);
      setSalarySlipPreview(initialData.documents?.salarySlip);
    } else if(!selectedDepartmentId) {
      setCurrentEmployee(null);
    }
  }, [initialData, open]);


  const handleChange = (e)=>{
    const {name, value} = e.target;
    let obj = {...currentEmployee, [name] : value};
    setCurrentEmployee(obj);

    if(isSubmited){
       const errorData = ValidateEmployeeForm(obj, formStep);
      setErrors(errorData);
      if(Object.values(errorData)?.length > 0) return;
    }
  };

  const handleStepChange  = () => {
    const errorData = ValidateEmployeeForm(currentEmployee, formStep);
    setErrors(errorData);
    if(Object.values(errorData)?.length === 0){
      setFormStep(2);
    }
    else{
      setIsSubmited(true);
    }
  }

  // Scroll indicator logic
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    const isScrollable = scrollHeight > clientHeight + 30;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 40;

    setShowScrollIndicator(isScrollable && !isNearBottom);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const timer = setTimeout(checkScroll, 100);
    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [formStep, currentEmployee, open]);

  const resetForm = () => {
    setCurrentEmployee(null);
    setFormStep(1);
    setImagePreview("");
    setSalarySlipPreview("");
    setAadhaarPreview("");
    setPanPreview("");
    setBankPreview("");
    setShowScrollIndicator(false);
    setErrors({});
  };

  // File handlers
  const handleFileProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentEmployee((prev: any) => ({ ...prev, profileImage: file }));

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "SalarySlip" | "Aadhaar" | "PAN" | "BankPassbook",
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentEmployee((prev: any) => ({
      ...prev,
      documents: {
        ...prev?.documents,
        [field]: { url: file, fileName: file.name, fileType: file.type },
      },
    }));

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview("PDF_SELECTED");
    }
  };

  // Form submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
   
    setIsSubmited(true);
    const errorData = ValidateEmployeeForm(currentEmployee, formStep);
      setErrors(errorData);
      if(Object.values(errorData)?.length > 0) return;
    try {

      const formData = new FormData();
      formData.append("userId", user?._id || "");
      if (companyId) {
        formData.append("companyId", companyId);
      }
      if (!isEditMode) formData.append("password", currentEmployee?.password || "");
      formData.append("id", currentEmployee?.id || "");
      formData.append("fullName", currentEmployee?.fullName || "");
      formData.append("email", currentEmployee?.email || "");
      formData.append("departmentId", currentEmployee?.department || "");
      formData.append("designation", currentEmployee?.designation || "");
      formData.append("remarks", currentEmployee?.remarks || "");
      formData.append("contact", currentEmployee?.contact || "");
      formData.append(
  "employeeId",
  currentEmployee?.employeeId || ""
);

formData.append(
  "address",
  currentEmployee?.address || ""
);

formData.append(
  "bloodGroup",
  currentEmployee?.bloodGroup || ""
);
      formData.append(
  "dateOfBirth",
  currentEmployee?.dateOfBirth || ""
);
      formData.append("joinDate", currentEmployee?.joinDate || "");
      formData.append("monthSalary", String(currentEmployee?.monthSalary || 0));
      formData.append("employeeType", currentEmployee?.employeeType || "");
      formData.append("roleResponsibility", currentEmployee?.roleResponsibility || "");
      formData.append("lpa", String(currentEmployee?.lpa || 0));
      if (currentEmployee?.documents?.ifscCode) {
        formData.append("ifscCode", currentEmployee?.documents?.ifscCode)
      }
      if (currentEmployee?.profileImage instanceof File) {
        formData.append("profileImage", currentEmployee.profileImage);
      }

      if (currentEmployee?.documents?.Aadhaar?.url instanceof File) {
        formData.append("aadhaar", currentEmployee.documents.Aadhaar.url);
      } else if (typeof currentEmployee?.documents?.Aadhaar?.url === "string" && currentEmployee?.documents?.Aadhaar?.url !== "") {
        formData.append("aadhaar", currentEmployee.documents.Aadhaar.url);
      }

      if (currentEmployee?.documents?.PAN?.url instanceof File) {
        formData.append("panCard", currentEmployee.documents.PAN.url);
      } else if (typeof currentEmployee?.documents?.PAN?.url === "string" && currentEmployee?.documents?.PAN?.url !== "") {
        formData.append("panCard", currentEmployee.documents.PAN.url);
      }

      if (currentEmployee?.documents?.BankPassbook?.url instanceof File) {
        formData.append("bankPassbook", currentEmployee.documents.BankPassbook.url);
      }
      else if (
        typeof currentEmployee?.documents?.BankPassbook?.url === "string" &&
        currentEmployee?.documents?.BankPassbook?.url !== ""
      ) {
        formData.append("bankPassbook", currentEmployee.documents.BankPassbook.url);
      }
      if (currentEmployee?.documents?.SalarySlip?.url instanceof File) {
        formData.append("salarySlip", currentEmployee.documents.SalarySlip.url);
      }

       setIsLoading(true);

      let response;

      if (isEditMode) {
        response = await updateEmployees(currentEmployee?._id, formData);
        toast({ title: "Success", description: "Employee updated successfully" });
      } else {
        response = await addEmployees(formData)
        toast({ title: "Success", description: "Employee added successfully" });
      }

      setEmployeeListRefresh(true);
      socket.emit("addEmployeeRefresh");
      onClose();
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  //                  RENDER
  // ──────────────────────────────────────────────

  return (
    <>
      <DepartmentDialog
        isOpen={isDialogOpen}
        setIsOpen={() => { setIsDialogOpen(false) }}
        setDepartmentRefresh={setDepartmentRefresh}
        initialData={null}
        mode={false}
      />

      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) {
            onClose();
            resetForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[420px] sm:max-w-lg md:max-w-xl p-0 gap-0">
          <form onSubmit={handleSave} className="flex flex-col max-h-[92vh] h-full relative">
            {/* Scrollable area */}
            <div
              ref={formRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto scrollbar-hide px-4 py-5 sm:px-6 sm:py-6 relative"
              style={{ paddingBottom: formStep === 2 ? "10px" : "24px" }}
            >
              <DialogHeader className="pb-4 sm:pb-5">
                <DialogTitle className="text-lg sm:text-xl md:text-2xl">
                  {isEditMode ? "Edit Employee" : "Add New Employee"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  Step {formStep} of 2 • {formStep === 1 ? "Basic Details" : "Employment & Documents"}
                </DialogDescription>
              </DialogHeader>

              {/* Scroll indicator */}
              <div
                className={`absolute ${formStep === 1 ? "bottom-10" : "bottom-[72px]"} left-0 right-0 h-16 pointer-events-none flex items-end justify-center transition-opacity duration-300 z-10 ${showScrollIndicator ? "opacity-70" : "opacity-0"
                  }`}
              >

                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
                <ChevronDown className="text-muted-foreground animate-bounce" size={24} />
              </div>

              {/* STEP 1 */}
              {formStep === 1 && (
                <div className="space-y-4 sm:space-y-5 pb-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Full Name *</Label>
                    <Input
                     name="fullName"
                      className="h-9 sm:h-10 text-sm"
                      value={currentEmployee?.fullName || ""}
                      // onChange={(e) => setCurrentEmployee({ ...currentEmployee, fullName: e.target.value })}
                      onChange={handleChange}
                      placeholder="Amit Kumar Sharma"
                      required
                    />
                   {errors?.fullName && <p className="text-xs text-red-500">{errors?.fullName}</p>}

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Email *</Label>
                      <Input
                        type="email"
                        name="email"
                        className="h-9 sm:h-10 text-sm"
                        value={currentEmployee?.email || ""}
                        // onChange={(e) => setCurrentEmployee({ ...currentEmployee, email: e.target.value })}
                        onChange={handleChange}
                        placeholder="amit@example.com"
                        required
                      />
                       {errors?.email && <p className="text-xs text-red-500">{errors?.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Password {isEditMode ? "" : "*"}</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={isEditMode ? "" : currentEmployee?.password || ""}
                          disabled={isEditMode}
                          onChange={(e) => {
                            const value = e.target.value;
                            let obj = {...currentEmployee, password:value};
                            setCurrentEmployee(obj);
                            setIsSubmited(true);
                            const errorData = ValidateEmployeeForm(obj, formStep);
                            setErrors(errorData);

                            const errors = getPasswordErrors(value);
                            setPasswordErrors(errors);
                          }}
                          placeholder={isEditMode ? "••••••••" : "Enter password"}
                          className={`h-9 sm:h-10 text-sm pr-10 ${isEditMode ? "bg-muted cursor-not-allowed" : ""}`}
                        />
                        {!isEditMode && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                      {isEditMode && (
                        <p className="text-xs text-muted-foreground">Password cannot be changed in edit mode</p>
                      )}
                       {errors?.password && <p className="text-xs text-red-500">{errors?.password}</p>}
                      {passwordErrors.length > 0 && (
                        <ul className="text-xs text-red-500 space-y-1">
                          {passwordErrors.map((err, index) => (
                            <li key={index}>• {err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department */}

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Department *</Label>

                      <Select
                        value={currentEmployee?.department || ""}
                        onValueChange={(val) =>{
                          let obj = {...currentEmployee, department:val};
                          setCurrentEmployee(obj);
                          const errorData = ValidateEmployeeForm(obj, formStep);
                          setErrors(errorData);
                        }
                         
                        }
                        disabled={categories?.length === 0}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>

                        {categories?.length > 0 && (
                          <SelectContent className="max-h-48 overflow-y-auto">
                            {categories.map((dept) => (
                              <SelectItem key={dept._id} value={dept._id}>
                                {dept.name}
                              </SelectItem>
                            ))}

                            <div className="border-t my-1" />

                            <button
                              type="button"
                              onClick={() => { setIsDialogOpen(true) }}
                              className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                            >
                              + Add New Department
                            </button>
                          </SelectContent>
                        )}
                      </Select>
                       {errors?.department && <p className="text-xs text-red-500">{errors?.department}</p>}

                      {categories?.length === 0 && (
                        <div className="flex items-center justify-between text-xs text-red-500">
                          <span>Please add department first</span>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => { setIsDialogOpen(true) }}
                            className="h-7 px-3 text-xs"
                          >
                            + Add Department
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Designation *</Label>
                      <Input
                        className="h-9 sm:h-10 text-sm"
                        name="designation"
                        value={currentEmployee?.designation || ""}
                        // onChange={(e) => setCurrentEmployee({ ...currentEmployee, designation: e.target.value })}
                        onChange={handleChange}
                        placeholder="Software Developer"
                        required
                      />
                       {errors?.designation && <p className="text-xs text-red-500">{errors?.designation}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contact */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Contact *</Label>
                      <Input
                        className="h-9 sm:h-10 text-sm"
                        type="text"
                        name="contact"
                        value={currentEmployee?.contact || ""}
                        // onChange={(e) => { const onlyDigits = e.target.value.replace(/\D/g, ""); setCurrentEmployee({ ...currentEmployee, contact: onlyDigits }) }}
                        onChange={handleChange}
                        placeholder="9876543210"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        required
                      />
                       {errors?.contact && <p className="text-xs text-red-500">{errors?.contact}</p>}
                    </div>
                    <div className="space-y-1.5">
  <Label>Employee ID</Label>

  <Input
    name="employeeId"
    value={currentEmployee?.employeeId || ""}
    onChange={handleChange}
    placeholder="EMP001"
  />
</div>
<div className="space-y-1.5">
  <Label>Blood Group</Label>

  <Select
    value={currentEmployee?.bloodGroup || ""}
    onValueChange={(val) =>
      setCurrentEmployee({
        ...currentEmployee,
        bloodGroup: val
      })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="Select Blood Group" />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="A+">A+</SelectItem>
      <SelectItem value="A-">A-</SelectItem>
      <SelectItem value="B+">B+</SelectItem>
      <SelectItem value="B-">B-</SelectItem>
      <SelectItem value="AB+">AB+</SelectItem>
      <SelectItem value="AB-">AB-</SelectItem>
      <SelectItem value="O+">O+</SelectItem>
      <SelectItem value="O-">O-</SelectItem>
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label>Address</Label>

  <textarea
    rows={3}
    name="address"
    value={currentEmployee?.address || ""}
    onChange={handleChange}
    className="w-full border rounded-md p-2"
    placeholder="Employee Address"
  />
</div>

                    {/* Monthly Salary */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Monthly Salary *</Label>
                      <Input
                        type="number"
                        name="monthSalary"
                        className="h-9 sm:h-10 text-sm"
                        value={currentEmployee?.monthSalary ?? ""}
                        // onChange={(e) => setCurrentEmployee({ ...currentEmployee, monthSalary: (e.target.value) })}
                        onChange={handleChange}
                        placeholder="48000"
                        required
                      />
                       {errors?.monthSalary && <p className="text-xs text-red-500">{errors?.monthSalary}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
  <Label className="text-sm font-medium">
    Date of Birth *
  </Label>

  <Input
    type="date"
    name="dateOfBirth"
    className="h-9 sm:h-10 text-sm"
    value={
      currentEmployee?.dateOfBirth
        ? formatDateFromInput(currentEmployee?.dateOfBirth)
        : ""
    }
    onChange={handleChange}
    required
  />

  {errors?.dateOfBirth && (
    <p className="text-xs text-red-500">
      {errors?.dateOfBirth}
    </p>
  )}
</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Joining Date */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Joining Date *</Label>
                      <Input
                        type="date"
                        ref={dateRef}
                        name="joinDate"
                        disabled={isEditMode}
                        value={formatDateFromInput(currentEmployee?.joinDate) || ""}
                        // onChange={(e) => setCurrentEmployee({ ...currentEmployee, joinDate: e.target.value })}
                        onChange={handleChange}
                        className="h-9 sm:h-10 text-sm"
                        required
                        onClick={() => {
                          if (dateRef.current?.showPicker) {
                            dateRef.current.showPicker();
                          }
                        }}
                      />
                       {errors?.joinDate && <p className="text-xs text-red-500">{errors?.joinDate}</p>}
                    </div>

                    {/* Profile Image */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Profile Image (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={profileRef}
                        onChange={(e) => handleFileProfileChange(e)}
                        className="h-9 sm:h-10 text-sm file:mr-3 file:py-1 file:px-3 file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                      />
                      {imagePreview && (
                        <div className="relative w-20 h-20 mt-1.5 rounded-md overflow-hidden border">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentEmployee({ ...currentEmployee, profileImage: undefined });
                              setImagePreview("");
                              if (profileRef.current) profileRef.current.value = "";
                            }}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 shadow-sm"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {showArrow && <div className="relative w-full top-[-60px]">
                    <span className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 flex justify-center">
                      <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
                    </span>
                  </div>}



                  <div className="flex justify-end gap-3 pt-5 border-t mt-4">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStepChange()}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {formStep === 2 && (
                <div className="space-y-4 sm:space-y-5 pb-5">
                  <div className="grid grid-cols-1  gap-4">
                    {/* Employee Type */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Employee Type</Label>
                      <Select
                        value={currentEmployee?.employeeType?.toLowerCase() || ""}
                        onValueChange={(val) => {
                          let obj = {...currentEmployee,employeeType: val };
                          setCurrentEmployee(obj);
                          const errorData = ValidateEmployeeForm(obj, formStep);
                          setErrors(errorData);
                        }} 
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Permanent</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                        {errors?.employeeType && <p className="text-xs text-red-500">{errors?.employeeType}</p>}
                    </div>
                  </div>

                  {/* Role & Responsibilities */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Role & Responsibilities (Optional)</Label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-md p-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={currentEmployee?.roleResponsibility || ""}
                      onChange={(e) => setCurrentEmployee({ ...currentEmployee, roleResponsibility: e.target.value })}
                      placeholder="Enter key responsibilities (Optional)"
                    />
                  </div>

                  {/* LPA */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">LPA (Last Year Package) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      name="lpa"
                      className="h-9 sm:h-10 text-sm"
                      value={currentEmployee?.lpa || ""}
                      // onChange={(e) => setCurrentEmployee({ ...currentEmployee, lpa: Number(e.target.value) })}
                      onChange={handleChange}
                      placeholder="7.2"
                    
                    />
                      {errors?.lpa && <p className="text-xs text-red-500">{errors?.lpa}</p>}
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium block">Documents (Optional)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FileInput
                        label="Salary Slip"
                        ref={salarySlipRef}
                        file={currentEmployee?.salarySlip || currentEmployee?.documents?.SalarySlip?.url}
                        preview={salarySlipPreview}
                        setPreview={setSalarySlipPreview}
                        onChange={(e) => handleFileChange(e, "SalarySlip", setSalarySlipPreview)}
                      />
                      <FileInput
                        label="Aadhaar Card"
                        ref={aadhaarRef}
                        file={currentEmployee?.documents?.Aadhaar?.url}
                        preview={aadhaarPreview}
                        setPreview={setAadhaarPreview}
                        onChange={(e) => handleFileChange(e, "Aadhaar", setAadhaarPreview)}
                        allowText={true}
                        textValue={typeof currentEmployee?.documents?.Aadhaar?.url === "string" ? currentEmployee?.documents?.Aadhaar?.url : ""}
                        onTextChange={(val) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: {
                              ...prev?.documents,
                              Aadhaar: { ...prev?.documents?.Aadhaar, url: val }
                            }
                          }));
                        }}
                      />
                      <FileInput
                        label="PAN Card"
                        ref={panRef}
                        file={currentEmployee?.documents?.PAN?.url}
                        preview={panPreview}
                        setPreview={setPanPreview}
                        onChange={(e) => handleFileChange(e, "PAN", setPanPreview)}
                        allowText={true}
                        textValue={typeof currentEmployee?.documents?.PAN?.url === "string" ? currentEmployee?.documents?.PAN?.url : ""}
                        onTextChange={(val) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: {
                              ...prev?.documents,
                              PAN: { ...prev?.documents?.PAN, url: val }
                            }
                          }));
                        }}
                      />
                      <FileInput
                        label="Bank Passbook"
                        ref={bankRef}
                        file={currentEmployee?.documents?.BankPassbook?.url}
                        preview={bankPreview}
                        setPreview={setBankPreview}
                        onChange={(e) => handleFileChange(e, "BankPassbook", setBankPreview)}
                        allowText={true}
                        textValue={
                          typeof currentEmployee?.documents?.BankPassbook?.url === "string"
                            ? currentEmployee?.documents?.BankPassbook?.url
                            : ""
                        }
                        onTextChange={(val) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: {
                              ...prev?.documents,
                              BankPassbook: {
                                ...prev?.documents?.BankPassbook,
                                url: val, // Update url in state
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Bank IFSC Code(Optional)</Label>
                      <Input
                        placeholder="Enter Bank IFSC code"
                        value={currentEmployee?.documents?.ifscCode}
                        onChange={(e) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: { ...prev?.documents, ifscCode: e.target.value }
                          }))
                        }}
                      />
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Remark (Optional)</Label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-md p-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={currentEmployee?.remarks || ""}
                      onChange={(e) => setCurrentEmployee({ ...currentEmployee, remarks: e.target.value })}
                      placeholder="Describe key responsibilities, if any (Optional)"
                    />
                  </div>
                  {showArrow && <div className="relative w-full top-[-350px]">
                    <span className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 flex justify-center">
                      <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
                    </span>
                  </div>}

                  <div className="flex justify-between pt-5 border-t mt-4 sticky bottom-0 bg-background z-20">
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormStep(1)}>
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      size="sm"
                      className="min-w-[140px] flex items-center gap-2"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isLoading
                        ? isEditMode
                          ? "Updating..."
                          : "Submitting..."
                        : isEditMode
                          ? "Update Employee"
                          : "Submit Employee"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};



interface FileInputProps {
  label: string;
  ref: React.RefObject<HTMLInputElement>;
  file: any;
  preview: string;
  setPreview: React.Dispatch<React.SetStateAction<string>>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowText?: boolean;
  textValue?: string;
  onTextChange?: (value: string) => void;
}

const FileInput: React.FC<FileInputProps> = ({
  label,
  ref,
  file,
  preview,
  setPreview,
  onChange,
  allowText,
  textValue,
  onTextChange,
}) => {
  const [useText, setUseText] = useState(false);

  // Decide when to show text input vs file input
  useEffect(() => {
    if (!allowText) return;

    // File object image
    if (file instanceof File && file.type.startsWith("image/")) {
      setUseText(false);
    }
    // URL image
    else if (typeof file === "string" && file.startsWith("http")) {
      setUseText(false);
    }
    // Text value
    else if (textValue) {
      setUseText(true);
    } else {
      setUseText(false);
    }
  }, [textValue, file, allowText]);

  // Determine preview content
  const getPreviewContent = () => {
    const src =
      preview ||
      (file instanceof File
        ? URL.createObjectURL(file)
        : typeof file === "string"
          ? file
          : "");

    if (!src) return null;

    // Image detection
    const isImage =
      file instanceof File
        ? file.type.startsWith("image/")
        : typeof src === "string" &&
        /\.(jpg|jpeg|png|webp|gif)$/i.test(src);

    if (isImage) {
      return (
        <img
          src={src}
          alt={`${label} Preview`}
          className="w-full h-full object-cover"
        />
      );
    }

    // PDF detection
    const isPDF =
      file instanceof File
        ? file.type === "application/pdf"
        : typeof src === "string" && src.toLowerCase().endsWith(".pdf");

    if (isPDF) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-gray-100 text-sm text-gray-600 font-medium">
          PDF
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <Label className="text-xs sm:text-sm text-muted-foreground">
          {label}
        </Label>

        {allowText && (
          <button
            type="button"
            onClick={() => setUseText(!useText)}
            className="text-[10px] text-primary hover:underline"
          >
            {useText ? "Upload File" : "Enter Number"}
          </button>
        )}
      </div>

      {useText ? (
        <Input
          type="text"
          className="h-9 sm:h-10 text-sm"
          placeholder={`Enter ${label} number or URL`}
          value={textValue || ""}
          onChange={(e) => onTextChange?.(e.target.value)}
        />
      ) : (
        <Input
          type="file"
          accept=".pdf,image/*"
          ref={ref}
          onChange={onChange}
        />
      )}

      {!useText && preview && (
        <div className="relative w-24 h-24 mt-1 border rounded overflow-hidden">
          {getPreviewContent()}

          <button
            type="button"
            className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 shadow-sm"
            onClick={() => {
              setPreview("");

              if (ref?.current) {
                ref.current.value = "";
              }

              onTextChange?.("");
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

