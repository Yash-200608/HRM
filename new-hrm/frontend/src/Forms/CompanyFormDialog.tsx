
import { useEffect, useState } from "react";
import axios from "axios";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/contexts/AuthContext";

const initialState = {
    name: "",
    email: "",
    contactNumber: "",
    address: "",
    website: "",
    logo: null,
    logoPreview: "",
    isActive: true
};

const CompanyFormDialog = ({
    open,
    setOpen,
    mode = false, // false = add, true = edit
    initialData = null,
    onSuccess
}) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [form, setForm] = useState(initialState);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mode && initialData) {
            setForm({
                name: initialData.name || "",
                email: initialData.email || "",
                contactNumber: initialData.contactNumber || "",
                address: initialData.address || "",
                website: initialData.website || "",
                logo: null,
                logoPreview: initialData.logo || "",
                isActive: initialData.isActive ?? true
            });
        } else {
            setForm(initialState);
        }
    }, [mode, initialData, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm((prev) => ({
                ...prev,
                logo: file,
                logoPreview: URL.createObjectURL(file)
            }));
        }
    };

    const handleRemoveLogo = () => {
        setForm((prev) => ({ ...prev, logo: null, logoPreview: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("id", user?._id);
            formData.append("name", form.name);
            formData.append("email", form.email);
            formData.append("contactNumber", form.contactNumber);
            formData.append("address", form.address);
            formData.append("website", form.website);
            formData.append("isActive", form.isActive.toString());
            if (form?.logo) formData.append("logo", form?.logo);
            let res = null;
            if (!mode) {
                res = await axios.post(`${import.meta.env.VITE_API_URL}/api/company/add`, formData);
            } else {
                res = await axios.put(
                    `${import.meta.env.VITE_API_URL}/api/company/${initialData?._id}`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
            }

            if (res.status === 201 || res.status === 200) {
                setOpen(false);
                onSuccess(true);
                toast({ title: `${mode === false ?"Company Created." : "Company Updated."}`, description: `${res?.data?.message}` })
            }

        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: err?.response?.data?.message || "Something went wrong", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto p-4">
                <DialogHeader>
                    <DialogTitle>
                        {mode ? "Edit Company" : "Register New Company"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode ? "Update company details." : "Add a new company to the system."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Company Name */}
                    <div className="space-y-1">
                        <Label>Company Name</Label>
                        <Input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter company name"
                            required
                        />
                    </div>

                    {/* Email + Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="company@email.com"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Contact Number</Label>
                            <Input
                                name="contactNumber"
                                value={form.contactNumber}
                                onChange={handleChange}
                                placeholder="+91 98765 43210"
                                required
                            />
                        </div>
                    </div>

                    {/* Address + Website */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Address</Label>
                            <Input
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="123, ABC Street, City"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Website</Label>
                            <Input
                                name="website"
                                value={form.website}
                                onChange={handleChange}
                                placeholder="https://company.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-1">
                        <Label>Company Logo</Label>
                        <Input type="file" accept="image/*" onChange={handleLogoChange} />

                        {form.logoPreview && (
                            <div className="relative w-20 h-20 sm:w-28 sm:h-28 mt-1 mx-auto">
                                <img
                                    src={form.logoPreview}
                                    alt="Company Logo"
                                    className="w-full h-full object-cover rounded border"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between">
                        <Label>Company Active</Label>
                        <Switch
                            checked={form.isActive}
                            onCheckedChange={(val) =>
                                setForm((prev) => ({ ...prev, isActive: val }))
                            }
                        />
                    </div>

                    {/* Footer */}
                    <DialogFooter className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>

                        <Button type="submit" disabled={loading || !form?.name || !form?.email || !form?.contactNumber || !form?.website}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {mode ? "Update" : "Register"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CompanyFormDialog;

