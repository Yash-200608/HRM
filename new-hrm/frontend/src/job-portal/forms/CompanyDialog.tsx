import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectLabel, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addCompanyJob, updateCompanyJob } from "@/services/Service";
import { Loader2 } from "lucide-react";



const AddCompanyDialog = ({ isOpen, isOpenChange, initialData, setCompanyListRefresh }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const imageRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ adminId: user?._id, name: "", skills: [], email: "", contact: "", address: "", state: "", country: "", industry: "", type: "", size: "", website: "", logo: null, adminName: "", adminEmail: "", adminContact: "", adminAddress: "" })
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setForm({
        adminId: initialData?.createdBy?._id || user?._id,
        name: initialData?.name || "",
        skills: initialData?.skills || [],
        email: initialData?.email || "",
        contact: initialData?.contact || "",
        address: initialData?.address || "",
        state: initialData?.state || "",
        country: initialData?.country || "",
        industry: initialData?.industry || "",
        type: initialData?.type || "",
        size: initialData?.size || "",
        website: initialData?.website || "",
        logo: initialData?.logo || null,
        adminName: initialData?.adminName || "",
        adminEmail: initialData?.adminEmail || "",
        adminContact: initialData?.adminContact || "",
        adminAddress: initialData?.adminAddress || "",
      });
      setLogoPreview(initialData?.logo);
    }
    else {
      resetForm();
    }
  }, [initialData, user, isOpen]);

  const resetForm = () => {
    setLogoPreview("");
    setForm({ adminId: user?._id, name: "", email: "", contact: "", skills: [], address: "", state: "", country: "", industry: "", type: "", size: "", website: "", logo: null, adminName: "", adminEmail: "", adminContact: "", adminAddress: "" })
  }
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setForm({ ...form, logo: file })
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      // Logo optional
      if (key === "logo") {
        if (value instanceof File) {
          formData.append("logo", value);
        }
      }
      // baaki fields
      else if (value !== null && value !== "") {
        formData.append(key, value);
      }
    });
    setIsLoading(true);
    try {
      const res = await (isEdit ? updateCompanyJob(initialData?._id, formData) : addCompanyJob(formData));
      if (res.status === 200 || res.status === 201) {
        setCompanyListRefresh(true)
        toast({ title: isEdit ? "Update Company." : "Add Company.", description: res.data?.message });
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error Company.", description: err?.response?.data?.message || err?.message, variant: "destructive" })
    }
    finally {
      setIsLoading(false);
      resetForm();
      isOpenChange(false);
      setStep(1);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); setStep(1); } isOpenChange(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>{step === 1 ? "Add Company Details" : "Add Company Details"} Step-{step}</DialogDescription>
          </DialogHeader>
          <form className="p-2" onSubmit={handleSubmit}>
            {step === 1 &&
              <>
                <div className="flex flex-row justify-between">
                  <div className="flex-1">
                    <Label className="text-xs">Name*</Label>
                    <Input type="text" value={form?.name} onChange={(e) => { setForm({ ...form, name: e.target.value }) }} placeholder="Company Name" className="placeholder:text-xs" required />
                  </div>
                  <div className="flex-1 ml-4">
                    <Label className="text-xs">email*</Label>
                    <Input type="email" value={form?.email} onChange={(e) => { setForm({ ...form, email: e.target.value }) }} placeholder="Company Email" className="placeholder:text-xs" required />
                  </div>
                </div>
                <div className="flex flex-row justify-between my-1">
                  <div className="flex-1">
                    <Label className="text-xs">Contact*</Label>
                    <Input type="text" maxLength={10} value={form?.contact} onChange={(e) => { setForm({ ...form, contact: e.target.value }) }} placeholder="Company Contact" className="placeholder:text-xs" required />
                  </div>
                  <div className="flex-1 ml-4">
                    <Label className="text-xs">Address*</Label>
                    <Input type="text" value={form?.address} onChange={(e) => { setForm({ ...form, address: e.target.value }) }} placeholder="Company Address" className="placeholder:text-xs" required />
                  </div>
                </div>
                <div className="flex flex-row justify-between">
                  <div className="flex-1">
                    <Label className="text-xs">State*</Label>
                    <Input type="text" value={form?.state} onChange={(e) => { setForm({ ...form, state: e.target.value }) }} placeholder="Company State" className="placeholder:text-xs" required />
                  </div>
                  <div className="flex-1 ml-4">
                    <Label className="text-xs">Country*</Label>
                    <Input type="text" value={form?.country} onChange={(e) => { setForm({ ...form, country: e.target.value }) }} placeholder="Company Country" className="placeholder:text-xs" required />
                  </div>
                </div>
                <div className="flex flex-row justify-between my-1">
                  <div className="flex-1">
                    <Label className="text-xs">Industry*</Label>
                    <Select value={form?.industry} onValueChange={(value) => { setForm({ ...form, industry: value }) }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Industry" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] w-[200px] overflow-y-auto">
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
                  <div className="flex-1 ml-3">
                    <Label className="text-xs">Type*</Label>
                    <Select value={form?.type} onValueChange={(value) => { setForm({ ...form, type: value }) }}>
                      <SelectTrigger className="">
                        <SelectValue placeholder="Select Type" className="text-xs" />
                      </SelectTrigger>
                      <SelectContent className="w-[200px] max-h-[300px] overflow-y-auto">
                        <SelectItem value="privateLimited">Private Limited</SelectItem>
                        <SelectItem value="publicLimited">Public Limited</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="soleProprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="llp">LLP</SelectItem>
                        <SelectItem value="startup">Startup</SelectItem>
                        <SelectItem value="mnc">MNC</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="ngo">NGO</SelectItem>
                        <SelectItem value="consultancy">Consultancy / Recruitment Agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-1">
                  {/* Upload Input */}
                  <div className="flex-1 max-w-[215px]">
                    <Label className="text-xs">Logo (Optional)</Label>
                    <Input
                      ref={imageRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="mt-1 w-full"
                    />
                  </div>

                  {/* Preview Box */}
                  {logoPreview && (
                    <div className="relative w-16 h-16 mt-1 border rounded overflow-hidden flex items-center justify-center bg-gray-100">
                      <>
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="w-full h-full object-cover"
                        />
                        {/* Change / Cut Icon */}
                        <button
                          onClick={() => { setLogoPreview(null); if (imageRef.current) { imageRef.current.value = null } }}
                          className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-gray-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </>

                    </div>
                  )}
                </div>

                <div className="flex flex-row justify-end gap-2 mt-2">
                  <Button type="button" variant="outline" onClick={() => { setStep(1); resetForm(); isOpenChange(false) }}>Cancel</Button>
                  <Button type="button" variant="default" onClick={() => { setStep(2) }} disabled={!form?.name || !form?.email || !form?.contact || !form?.address || !form?.state || !form?.country || !form?.industry || !form?.type}>Next</Button>
                </div>
              </>
            }
            <>
            {step === 2 && (
  <>
    {/* Row 1: Size + Website */}
    <div className="flex gap-4">
      <div className="flex-1">
        <Label className="text-xs">Size*</Label>
        <Select
          value={form?.size || ""}
          onValueChange={(value) => setForm({ ...form, size: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Size" className="text-xs" />
          </SelectTrigger>
          <SelectContent className="w-[200px] max-h-[300px] overflow-y-auto">
            <SelectItem value="1-10">1–10 Employees</SelectItem>
            <SelectItem value="11-50">11–50 Employees</SelectItem>
            <SelectItem value="51-200">51–200 Employees</SelectItem>
            <SelectItem value="201-500">201–500 Employees</SelectItem>
            <SelectItem value="501-1000">501–1000 Employees</SelectItem>
            <SelectItem value="1001-5000">1001–5000 Employees</SelectItem>
            <SelectItem value="5001-10000">5001–10000 Employees</SelectItem>
            <SelectItem value="10000+">10000+ Employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label className="text-xs">Website*</Label>
        <Input
          type="text"
          value={form?.website || ""}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="Company Website"
          className="placeholder:text-xs"
          required
        />
      </div>
    </div>

    {/* Row 2: Skills ONLY (Location Removed) */}
    <div className="flex gap-4 mt-2">
      <div className="flex-1">
        <Label className="text-xs">Skills*</Label>
        <Input
          type="text"
          value={form?.skills?.join(", ") || ""}
          onChange={(e) => {
            const skillsArray = e.target.value
              .split(",")
              .map((skill) => skill.trim());
            setForm({ ...form, skills: skillsArray });
          }}
          placeholder="Add Skills (comma separated)"
          className="placeholder:text-xs"
          required
        />
      </div>
    </div>

    {/* Row 3: Admin Name + Admin Email */}
    <div className="flex gap-4 mt-2">
      <div className="flex-1">
        <Label className="text-xs">Admin Name*</Label>
        <Input
          type="text"
          value={form?.adminName || ""}
          onChange={(e) => setForm({ ...form, adminName: e.target.value })}
          placeholder="Admin Name"
          className="placeholder:text-xs"
          required
        />
      </div>

      <div className="flex-1">
        <Label className="text-xs">Admin Email*</Label>
        <Input
          type="email"
          value={form?.adminEmail || ""}
          onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          placeholder="Admin Email"
          className="placeholder:text-xs"
          required
        />
      </div>
    </div>

    {/* Row 4: Admin Phone + Admin Address */}
    <div className="flex gap-4 mt-2">
      <div className="flex-1">
        <Label className="text-xs">Admin Phone*</Label>
        <Input
          type="text"
          maxLength={10}
          value={form?.adminContact || ""}
          onChange={(e) => setForm({ ...form, adminContact: e.target.value })}
          placeholder="Admin Phone"
          className="placeholder:text-xs"
          required
        />
      </div>
    </div>

    {/* Row 5: Admin Address FULL WIDTH */}
    <div className="mt-2">
      <Label className="text-xs">Admin Address*</Label>
      <Input
        type="text"
        value={form?.adminAddress || ""}
        onChange={(e) => setForm({ ...form, adminAddress: e.target.value })}
        placeholder="Admin Address"
        className="placeholder:text-xs w-full"
        required
      />
    </div>

    {/* Buttons */}
    <div className="flex justify-end gap-2 mt-4">
      <Button type="button" variant="outline" onClick={() => setStep(1)}>
        Back
      </Button>

      <Button
        type="submit"
        variant="default"
        disabled={
          isLoading ||
          !form?.size ||
          !form?.website ||
          !form?.skills?.length ||
          !form?.adminName ||
          !form?.adminEmail ||
          !form?.adminContact ||
          !form?.adminAddress
        }
      >
        {isLoading && <Loader2 className="animate-spin mr-2" />}
        {isLoading
          ? isEdit
            ? "Updating..."
            : "Adding..."
          : isEdit
          ? "Update"
          : "Add"}
      </Button>
    </div>
  </>
)}
            </>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}


export default AddCompanyDialog;