import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";
import { resolveCompanyIdFromUser } from "@/lib/tenant";
import { socket } from "@/socket/socket";

export interface LeaveTypeFormData {
  _id?: string; // optional, used for edit mode
  name: string;
  description: string;
  paid: boolean;
  color?: string;
}

interface LeaveTypeFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: LeaveTypeFormData; // for edit mode
   setLeaveTypeRefresh: (open: boolean) => void;
}

const LeaveTypeDialog: React.FC<LeaveTypeFormDialogProps> = ({
  isOpen,
  onOpenChange,
  initialData,
setLeaveTypeRefresh
}) => {
  const [form, setForm] = useState<LeaveTypeFormData>({
    name: '',
    description: '',
    paid: true,
    color: '#0d6efd',
  });
  const { user } = useAuth();
  const companyId = resolveCompanyIdFromUser(user);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // If initialData is passed (edit mode), populate form
  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({ name: '', description: '', paid: true, color: '#0d6efd' });
    }
  }, [initialData, isOpen]);

  const isEditMode = !!initialData;

  const handleSubmit = async (e?:React.FormEvent) => {
    e.preventDefault();
  if (!form.name) {
    toast({title:"Leave Type.", description:"Name is required.", variant:"destructive"})
    return;
  }

  setLoading(true);

  try {
    let response;

    if (isEditMode) {
      // ✅ UPDATE (PUT)
      response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/leaves/${initialData?._id}`,
        {
          name: form.name,
          description: form.description,
          paid: form.paid,
          color: form.color,
          companyId,
        }
      );
    } else {
      // ✅ CREATE (POST)
      response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/leaves`,
        {
          name: form.name,
          description: form.description,
          paid: form.paid,
          color: form.color,
          companyId,
        }
      );
    }

    if (response?.data?.success) {
      socket.emit("addLeaveRefresh");
      toast({
        title: "Success",
        description: isEditMode
          ? "Leave updated successfully"
          : "Leave created successfully",
      });
      setLeaveTypeRefresh(true);
      onOpenChange(false);

      // reset only when creating
      if (!isEditMode) {
        setForm({
          name: "",
          description: "",
          paid: true,
          color: "#0d6efd",
        });
      }
 
      // refresh list (if you have)
      // setLeaveRefresh(true);
    }
  } catch (err: any) {
    console.error(err);
    toast({
      title: "Error",
      description:
        err?.response?.data?.message || "Something went wrong",
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Leave Type' : 'Create Leave Type'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details of the leave type.'
              : 'Define a new leave type for your employees.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="leave-name">Leave Type Name *</Label>
            <Input
              id="leave-name"
              placeholder="e.g. Casual, Sick"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-desc">Description (optional)</Label>
            <Textarea
              id="leave-desc"
              placeholder="Short description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="leave-paid"
              checked={form.paid}
              onCheckedChange={(checked) =>
                setForm({ ...form, paid: !!checked })
              }
            />
            <Label htmlFor="leave-paid">Paid Leave?</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-color">Color / Badge (optional)</Label>
            <Input
              id="leave-color"
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              required
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !form?.name}>
            {loading ? (isEditMode ? 'Updating...' : 'Saving...') : isEditMode ? 'Update Leave Type' : 'Create Leave Type'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveTypeDialog;
