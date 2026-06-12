import React, { useState, useEffect, useRef } from "react";
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
import axios from "axios";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/contexts/AuthContext";
import { resolveCompanyIdFromUser } from "@/lib/tenant";

const CategoryDialog = ({
  isOpen,
  onOpenChange,
setCategoryListRefersh,
  initialData = {id : "", name: "", description: "" }, // for edit mode
  mode = false, // "add" or "edit"
}) => {
    const { user } = useAuth();
  const companyId = resolveCompanyIdFromUser(user);
  const [category, setCategory] = useState(initialData);
  const[isLoading,setIsLoading] = useState(false);
      const { toast } = useToast();

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCategory(initialData);
    }
  }, [isOpen, initialData]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
  try {
    let res;

    if (mode === true) {
      // ===== UPDATE (PUT) =====
      res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/expense-categories/updateExpenseCategory/${category.id}`,
        {...category, companyId}
      );
    } else {
      // ===== CREATE (POST) =====
      res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/expense-categories/add`,
         {...category, companyId}
      );
    }
     if(res?.status === 201){
    toast({
      title: mode ? "Department Updated." : "Department Added.",
      description: res?.data?.message || "Success",
    });
    setCategoryListRefersh(true);
    onOpenChange(false);
  } else {
    toast({
      title: "Error",
      description: res?.data?.message || "Something went wrong",
      variant: "destructive",
    });
  }

  } catch (err: any) {
    console.error(err);
    toast({
      title: "Error",
      description: err?.response?.data?.message || "Something went wrong",
      variant: "destructive",
    });
  }
};


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSave}>
        <DialogHeader>
          <DialogTitle>
            {mode === false ? "Add New Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === false
              ? "Create a new category for expenses."
              : "Update the category details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              placeholder="e.g. Travel, Food"
              value={category?.name}
              onChange={(e) =>
                setCategory({ ...category, name: e.target.value })
              }
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="category-desc">Description (optional)</Label>
            <Input
              id="category-desc"
              placeholder="Short description of this category(Optional)"
              value={category?.description}
              onChange={(e) =>
                setCategory({ ...category, description: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
          type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            // onClick={handleSave}
            disabled={isLoading || !category?.name }
          >
            {isLoading
              ? mode === false
                ? "Adding..."
                : "Saving..."
              : mode === false
              ? "Add Category"
              : "Save Changes"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
