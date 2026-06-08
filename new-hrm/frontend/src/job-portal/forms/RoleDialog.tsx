import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Briefcase, User, GraduationCap, CheckCircle, Mail, Phone, DollarSign, MapPin, Backpack, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { addRole, updateRole } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AddCandidateFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  setRoleListRefresh?: (value: boolean) => void
}

const RoleDialog: React.FC<AddCandidateFormProps> = ({ isOpen, onClose, initialData, setRoleListRefresh }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", isActive: false
  });
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData?.name,
        description: initialData?.description,
        isActive: initialData?.isActive
      });
    }
  }, [initialData]);

  const resetForm = () => {
    setForm({
      name: "", description: "", isActive: false
    });
    setIsLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast({ title: "Error", description: "Role name is required.", variant: "destructive" })
    setIsLoading(true);
    try {
      let obj = { ...form, userId: user?._id }
      const res = await (isEdit ? updateRole(initialData?._id, obj) : addRole(obj));
      if (res.status === 200 || res.status === 201) {
        toast({ title: `${isEdit ? "Role updated successfully" : "Role added successfully"}`, description: res.data.message })
        setRoleListRefresh(true);
      }
    }
    catch (error) {
      console.log(error);
      toast({ title: "Error", description: error.response.data.message || error.message, variant: "destructive" })
    }
    finally {
      resetForm();
      onClose();
      setIsLoading(false);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => { resetForm(); onClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Add Role</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Add a new role to the system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            {/* Role Name */}
            <Label className="block mb-2 text-xs">Role Name*</Label>
            <Input
              type="text"
              value={form?.name}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter role name"
              className="placeholder:text-xs"
            />

            {/* Role Description */}
            <Label className="block my-3 text-xs">Description(Optional)</Label>
            <Input
              type="text"
              value={form?.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter role description"
              className="placeholder:text-xs"
            />

            {/* Active / Inactive Toggle */}
            <div className="mb-4 mt-2">
              {/* Status Label */}
              <Label className="block mb-2 text-xs">Status*</Label>

              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form?.isActive })}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300
      ${form?.isActive ? "bg-blue-500" : "bg-gray-400"}`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300
        ${form?.isActive ? "translate-x-6" : "translate-x-1"}`}
                ></span>
              </button>
            </div>

            {/* Buttons */}
            <div className="flex flex-row justify-end mt-4">
              <Button
                type="button"
                variant="outline"
                className="mx-2"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="default"
                className="mx-2"
                disabled={!form?.name || isLoading}
              >
                {isLoading ? "Submitting..." : "Save Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleDialog;
