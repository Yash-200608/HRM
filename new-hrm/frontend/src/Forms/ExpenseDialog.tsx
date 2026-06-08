import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { getExpenseCategories } from "@/services/Service";
import { useToast } from '@/hooks/use-toast';
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateFromInput } from "@/services/allFunctions";
import CategoryDialog from "@/Forms/CategoryDialog";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getExpenseCategory } from "@/redux-toolkit/slice/allPage/expenseSlice";

const ExpenseDialog = ({
  isOpen,
  onOpenChange,
  isEditMode,
  initialData,
  setExpenseListRefresh
}) => {
  // Reset form when dialog closes (optional)
  const { user } = useAuth();
  const { toast } = useToast();
  // const [categoriesList, setCategoriesList] = useState([]);
  const [expense, setExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [categoryListRefresh, setCategoryListRefersh] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [expenseImage, setExpenseImage] = useState(null);
    const dateRef = useRef(null);
  const dispatch = useAppDispatch();
   const categoriesList = useAppSelector((state) => state.expense.expenseCategory);  
 

  useEffect(() => {
    if (initialData) {
      setExpense(initialData);
    }
    else {
      setExpense({})
    }
  }, [isOpen, initialData, isEditMode, setExpense]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!expense?.date || !expense?.amount || !expense?.category) {
      toast({ title: "Validation Error", description: "Please fill Date, amount and catgegory required fields.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      let res;

      const formData = new FormData();

formData.append("date", expense.date);
formData.append("amount", expense.amount);
formData.append("category", expense.category);
formData.append("paidBy", expense.paidBy);
formData.append("notes", expense.notes || "");
formData.append("companyId", user?.companyId?._id);
formData.append("userId", user?._id);

if (expenseImage) {
  formData.append(
    "expenseImage",
    expenseImage
  );
}

      if (isEditMode) {

  res = await axios.put(
    `${import.meta.env.VITE_API_URL}/api/expenses/updateExpense/${initialData._id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

} else {

  res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/expenses/add`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

}
      if (res?.status === 201) {

        toast({ title: "Expense Added.", description: res?.data?.message });
        onOpenChange(false);
        setExpenseListRefresh(true);
      }
      else if (res?.status === 200) {
        toast({ title: "Expense Updated.", description: res?.data?.message });
        onOpenChange(false);
        setExpenseListRefresh(true);
      }
      else {
        toast({ title: "Error", description: res?.data?.message || "Something went wrong", variant: "destructive" });
      }

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: err?.response?.data?.message || "Something went wrong", variant: "destructive", });
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleGetCategory = async () => {
    try {
      const res = await getExpenseCategories(user?.companyId?._id);
      if (res) { dispatch(getExpenseCategory(res)); }
    } catch (err) {
      console.log("Error fetching categories:", err);
      toast({ title: "Error", description: "Failed to fetch categories", variant: "destructive" });
    }
  };

  useEffect(() => {
    if(user?.role === "admin" && (categoryListRefresh || categoriesList.length === 0)) {
    handleGetCategory();
    }
  }, [categoryListRefresh, categoriesList.length, user,  ]);

  return (
    <>
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        initialData={null}
        setCategoryListRefersh={setCategoryListRefersh}
        mode={false}
      /> 

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Expense" : "Record New Expense"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update the expense details below."
                  : "Enter the expense details."}
              </DialogDescription>
            </DialogHeader>

            {/* FORM */}
            <div className="grid gap-4 py-4">
              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    ref={dateRef}
                    min={today}   // 🔴 past disable
                    value={formatDateFromInput(expense?.date)}
                    onChange={(e) =>
                      setExpense({ ...expense, date: e.target.value })
                    }
                    onClick={()=>{if(dateRef.current?.showPicker){dateRef?.current?.showPicker()}}}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount in ₹"
                    value={expense?.amount ?? ""}
                    onChange={(e) =>
                      setExpense({
                        ...expense,
                        amount: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Category & Paid By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>

                  <div className="flex items-center gap-2">
                    <Select
                      value={expense?.category || ""}
                      onValueChange={(value) =>
                        setExpense({ ...expense, category: value })
                      }
                      disabled={categoriesList?.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {categoriesList?.map((cat) => (
                          <SelectItem key={cat._id} value={cat.name}>
                            {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                          </SelectItem>
                        ))}

                        {/* Conditional last item: Add More */}
                        {categoriesList?.length > 0 && (
                          <>
                            <div className="border-t my-1" />

                            <button
                              type="button"
                              onClick={() => { setIsCategoryDialogOpen(true) }}
                              className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                            >
                              + Add New Category
                            </button>
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    {/* 🔴 Small Add Button if no data */}
                    {categoriesList?.length === 0 && (
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => setIsCategoryDialogOpen(true)}
                      >
                        Add Category
                      </Button>
                    )}
                  </div>

                  {/* 🔴 Conditional message */}
                  {categoriesList?.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Please add a category first
                    </p>
                  )}
                </div>


                <div className="space-y-2">
                  <Label>Paid By</Label>
                  <Input
                    placeholder="Enter payer's full name"
                    value={expense?.paidBy || ""}
                    onChange={(e) =>
                      setExpense({ ...expense, paidBy: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={expense?.notes || ""}
                  onChange={(e) =>
                    setExpense({ ...expense, notes: e.target.value })
                  }
                  placeholder="Optional: Add any extra details or comments about this expense"
                />
              </div>
              <div className="space-y-2">
  <Label>Receipt / Bill</Label>

  <Input
    type="file"
    accept="image/*"
    onChange={(e) =>
      setExpenseImage(e.target.files[0])
    }
  />
</div>
            </div>

            {/* FOOTER */}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
              type="submit"
                // onClick={handleSave}
                disabled={isLoading || !expense?.date || !expense?.amount || !expense?.category || !expense?.paidBy}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  isEditMode ? "Update Expense" : "Add Expense"
                )}
              </Button>

              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseDialog;
