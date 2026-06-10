import React, { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // apne project ka Dialog component path
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { resolveCompanyIdFromUser } from "@/lib/tenant";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import {addDepartment,updateDepartment } from "@/services/Service";
import {setDepartment} from "@/redux-toolkit/slice/allPage/departmentSlice";
import { useAppDispatch } from "@/redux-toolkit/hooks/hook";

interface DepartmentData {
  _id: string;
  name: string;
  description: string;
}

interface DepartmentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setDepartmentRefresh: (open: boolean) => void;
  initialData?: DepartmentData;
  mode?: boolean;
}

const DepartmentDialog: React.FC<DepartmentDialogProps> = ({
  isOpen,
  setIsOpen,
  setDepartmentRefresh,
  initialData,   // { name, description } for edit
  mode = false,       // "add" or "edit"
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (mode === true && initialData) {
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [initialData, mode, isOpen]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!name ) {
      toast({ title: "Error", description: "Name Field Are Required." })
      return;
    }

    const companyId = resolveCompanyIdFromUser(user);
    if (!companyId) {
      toast({ title: "Error", description: "CompanyId Not Found." })
      return;
    }

    const obj = {
      name: name,
      description: description,
      companyId,
    };
    try {
      let res;

      if (mode === true) {
        // 🔄 UPDATE API
        res = await updateDepartment(initialData?._id, obj)
      } else {
        // ➕ ADD API
        res = await addDepartment(obj);
      }
      if (res.status === 200 || res.status === 201) {
        if(!mode){
          dispatch(setDepartment(res?.data?.department))
        }
        toast({
          title: mode ? "Department Updated." : "Department Added.",
          description: res?.data?.message,
        });

        setDepartmentRefresh(true);
        setIsOpen(false);
      }
    } catch (err) {
      console.log(err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || err?.message || "Something went wrong",
        variant:"destructive"
      });
    }
    finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === false ? "Create Department" : "Edit Department"}</DialogTitle>
          <DialogDescription>
            {mode === false
              ? "Add a new department to your organization."
              : "Edit the department details."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              placeholder="e.g., Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional: Briefly describe what this department does"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Loader2 className="spin" />
                  Please wait
                </span>
              ) : (
                mode === false ? "Create" : "Update"
              )}
            </Button>          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentDialog;
