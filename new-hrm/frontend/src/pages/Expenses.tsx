
import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Trash2, Download, Filter, Edit, Eye, X,ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import CategoryDialog from "@/Forms/CategoryDialog";
import ExpenseDialog from "@/Forms/ExpenseDialog";
import DeleteCard from "@/components/cards/DeleteCard";
import { getExpenseCategories, getExpenses, generatePDF } from "@/services/Service";
import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getExpense, getExpenseCategory } from '@/redux-toolkit/slice/allPage/expenseSlice';


const months = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(0, i);
  return {
    value: String(i + 1).padStart(2, "0"),
    label: date.toLocaleString("default", { month: "long" }),
  };
});

const generateYears = (numPastYears = 5) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i <= numPastYears; i++) {
    years.push((currentYear - i).toString());
  }
  return years;
};

const years = generateYears(5);
const currentYear = new Date().getFullYear().toString();

export default function Expenses() {
    const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const[initialCategoryData, setInitialCategoryData] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const[initialData, setInitialData] = useState(null);
    // const [categoriesList, setCategoriesList] = useState([]);
    const [categoryListRefresh, setCategoryListRefersh] = useState(false);
  const [expenseListRefresh, setExpenseListRefresh] = useState(false);
  // const [expenseList, setExpenseList] = useState([]);
  const dispatch = useAppDispatch();
  const expenseList = useAppSelector((state) => state.expense.expenses);  
  const categoriesList = useAppSelector((state) => state.expense.expenseCategory); 
    const [pageLoading, setPageLoading] = useState(false);
   
  const { toast } = useToast();

  const handleGetCategory = async() => {
    setPageLoading(true);
    try {
    const res = await getExpenseCategories(user?.companyId?._id);
    if(res)
    {
      dispatch(getExpenseCategory(res));
        setCategoryListRefersh(false);
    }
  } catch (err) {
    console.log("Error fetching categories:", err);
    toast({ title: "Error", description: "Failed to fetch categories", variant: "destructive"});
  }
  finally{
    setPageLoading(false);
  }
  };

  const handleGetExpenses = async() => {
    setPageLoading(true);
    try {
    const res = await getExpenses(user?.companyId?._id);
    if(res)
    {
      dispatch(getExpense(res));
      setExpenseListRefresh(false);
    }
  } catch (err) {
    console.log("Error fetching expenses:", err);
    toast({ title: "Error", description: "Failed to fetch expenses", variant: "destructive"});
  }
  finally{
    setPageLoading(false);
  }
  };

 useEffect(() => {

  const canViewExpenses =
    user?.role === "admin" ||
    (user as any )?.assignedRole?.permissions?.expenses?.view;

  if (
    canViewExpenses &&
    (categoryListRefresh || categoriesList.length === 0)
  ) {
    handleGetCategory();
  }

}, [categoryListRefresh, categoriesList.length, user]);

 useEffect(() => {

  const canViewExpenses =
    user?.role === "admin" ||
    (user as any)?.assignedRole?.permissions?.expenses?.view;

  if (
    canViewExpenses &&
    (expenseListRefresh || expenseList.length === 0)
  ) {
    handleGetExpenses();
  }

}, [expenseListRefresh, expenseList.length, user]);

  
  const handleDeleteClick = (expenseId) => {
    setSelectedExpenseId(expenseId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if(!selectedExpenseId) {toast({ title: "Error", description: "Expense ID not found.", variant: "destructive" }); return; }
    setIsDeleting(true);
    try {
        const res = await axios.delete( `${import.meta.env.VITE_API_URL}/api/expenses/deleteExpense/${selectedExpenseId}`,{data : {companyId : user?.companyId?._id}});
        if(res?.status === 200){
          toast({ title: "Expense Deleted.", description: res?.data?.message });
          setExpenseListRefresh(true);
        } else {
          toast({ title: "Error", description: res?.data?.message || "Failed to delete expense", variant: "destructive" });
        }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to delete expense", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenseList?.filter(exp => {
      const expDate = new Date(exp.date);

      const matchMonth =
        selectedMonth === 'all'
          ? true
          : expDate.getMonth() + 1 === Number(selectedMonth);

      const matchYear =
        selectedYear === 'all'
          ? true
          : expDate.getFullYear() === Number(selectedYear);

      const matchCategory =
        selectedCategory === 'all' ||
        exp.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchMonth && matchYear && matchCategory;
    });
  }, [expenseList, expenseListRefresh, selectedMonth, selectedYear, selectedCategory]);

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleExportPDF = () => {
  try {
    generatePDF(filteredExpenses);
    toast({ title: "Expense PDF Exported", description: "Expense record successfully exported as PDF." });
  } catch (err) {
    console.error("PDF Export Error:", err);
    toast({ title: "Export Failed", description: "Failed to export expense record. Please try again.", variant: "destructive", });
  }
};

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedYear("all");
    setSelectedCategory('all');
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Office Supplies': 'bg-blue-100 text-blue-800',
      'Utilities': 'bg-purple-100 text-purple-800',
      'Travel': 'bg-green-100 text-green-800',
      'Food & Beverages': 'bg-orange-100 text-orange-800',
      'Equipment': 'bg-cyan-100 text-cyan-800',
      'Maintenance': 'bg-pink-100 text-pink-800',
      'Miscellaneous': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };



   if (pageLoading && (expenseList.length === 0 || categoriesList.length === 0)) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
    </div>
  );
}

 return (
  <>
    <Helmet>
      <title>Expense Management</title>
      <meta
        name="description"
        content="Manage company expenses and financial records"
      />
    </Helmet>

    <div className="space-y-8 pb-10">

      {/* HEADER */}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Expense Management
          </h1>

          <p className="mt-2 text-base text-slate-500">
            Monitor operational spending, expense analytics and financial records.
          </p>

        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

          <div className="rounded-2xl bg-emerald-100 p-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>

          <div>

            <p className="text-xs uppercase tracking-widest text-slate-400">
              Finance Status
            </p>

            <p className="font-semibold text-slate-900">
              Expense Tracking Active
            </p>

          </div>

        </div>

      </div>

      {/* DIALOGS */}

      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        initialData={initialCategoryData}
        setCategoryListRefersh={setCategoryListRefersh}
        mode={isEditMode}
      />

      <ExpenseDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={initialData}
        setExpenseListRefresh={setExpenseListRefresh}
        isEditMode={isEditMode}
      />

      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Delete Expense?"
        message="This action will permanently delete this expense."
      />

      {/* FILTER SECTION */}

      <Card className="rounded-[32px] border border-slate-200 bg-white shadow-sm">

        <CardHeader className="pb-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">

              <Filter className="h-6 w-6 text-slate-600" />

              Expense Filters

            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">

              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="
                h-11
                rounded-2xl
                border-slate-200
                bg-white
                px-5
                font-medium
                hover:bg-slate-100
                "
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>

              <Button
                onClick={() => {
                  setInitialCategoryData(null);
                  setIsEditMode(false);
                  setIsCategoryDialogOpen(true);
                }}
                className="
                h-11
                rounded-2xl
                bg-slate-900
                px-5
                text-white
                hover:bg-slate-800
                "
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>

              <Button
                onClick={() => {
                  setInitialData(null);
                  setIsEditMode(false);
                  setIsDialogOpen(true);
                }}
                className="
                h-11
                rounded-2xl
                bg-blue-600
                px-5
                text-white
                hover:bg-blue-700
                "
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>

            </div>

          </div>

        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>

              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">

                <SelectValue placeholder="Month" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All Months</SelectItem>

                {months.map((month) => (

                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>

              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">

                <SelectValue placeholder="Year" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All Years</SelectItem>

                {years.map((year) => (

                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >

              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">

                <SelectValue placeholder="Category" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All Categories</SelectItem>

                {categoriesList?.map((cat) => (

                  <SelectItem key={cat._id} value={cat.name}>
                    {cat.name}
                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            <Button
              variant="outline"
              onClick={clearFilters}
              className="
              h-12
              rounded-2xl
              border-slate-200
              font-medium
              hover:bg-slate-100
              "
            >
              Clear Filters
            </Button>

          </div>

        </CardContent>

      </Card>

      {/* STATS */}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* TOTAL */}

        <Card className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm">

          <CardContent className="p-8">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-slate-300">
                  Total Expenses
                </p>

                <h2 className="mt-4 text-3xl font-black tracking-tight">
                  ₹{totalAmount.toLocaleString()}
                </h2>

              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <Download className="h-7 w-7" />
              </div>

            </div>

          </CardContent>

        </Card>

        {/* RECORDS */}

        <Card className="rounded-[32px] border border-slate-200 bg-white shadow-sm">

          <CardContent className="p-8">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Total Records
                </p>

                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
                  {filteredExpenses.length}
                </h2>

              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <Filter className="h-7 w-7 text-blue-600" />
              </div>

            </div>

          </CardContent>

        </Card>

        {/* AVG */}

        <Card className="rounded-[32px] border border-slate-200 bg-white shadow-sm">

          <CardContent className="p-8">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Average Expense
                </p>

                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">

                  ₹
                  {filteredExpenses.length
                    ? Math.round(
                        totalAmount / filteredExpenses.length
                      ).toLocaleString()
                    : 0}

                </h2>

              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <Plus className="h-7 w-7 text-emerald-600" />
              </div>

            </div>

          </CardContent>

        </Card>

      </div>

      {/* TABLE */}

      <Card className="hidden rounded-[32px] border border-slate-200 bg-white shadow-sm lg:block">

        <CardHeader>

          <div className="flex items-center justify-between">

            <CardTitle className="text-2xl font-bold text-slate-900">
              Expense Records
            </CardTitle>

            <Badge className="rounded-full bg-slate-100 px-4 py-1 text-slate-700">
              {filteredExpenses.length} Records
            </Badge>

          </div>

        </CardHeader>

        <CardContent>

          <div className="overflow-x-auto">

            <Table>

              <TableHeader>

                <TableRow className="border-slate-100">

                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Date
                  </TableHead>

                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Category
                  </TableHead>

                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Amount
                  </TableHead>

                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Paid By
                  </TableHead>

                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Notes
                  </TableHead>

                  <TableHead className="text-right text-xs font-bold uppercase tracking-widest text-slate-500">
                    Actions
                  </TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {filteredExpenses.length > 0 ? (

                  filteredExpenses.map((expense) => (

                    <TableRow
                      key={expense._id}
                      className="border-slate-100 hover:bg-slate-50 transition-all"
                    >

                      <TableCell className="font-medium text-slate-700">

                        {new Date(expense.date).toLocaleDateString(
                          "en-IN",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}

                      </TableCell>

                      <TableCell>

                        <span
                          className={`
                          inline-flex
                          rounded-full
                          px-3
                          py-1
                          text-xs
                          font-semibold
                          tracking-wide
                          ${getCategoryColor(expense.category)}
                          `}
                        >
                          {expense.category}
                        </span>

                      </TableCell>

                      <TableCell className="font-bold text-slate-900">

                        ₹{expense.amount.toLocaleString()}

                      </TableCell>

                      <TableCell className="text-slate-700">

                        {expense.paidBy}

                      </TableCell>

                      <TableCell className="max-w-xs truncate text-slate-500">

                        {expense.notes || "-"}

                      </TableCell>

                      <TableCell>

                        <div className="flex items-center justify-end gap-2">

                          {expense?.expenseImage && (
  <Button
    variant="outline"
    size="icon"
    onClick={() =>
      window.open(
        `${import.meta.env.VITE_API_URL}/${expense.expenseImage}`,
        "_blank"
      )
    }
    className="
      h-10
      w-10
      rounded-xl
      border-slate-200
      hover:bg-blue-500
      hover:text-white
    "
  >
    <Eye className="h-4 w-4" />
  </Button>
)}

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setInitialData(expense);
                              setIsEditMode(true);
                              setIsDialogOpen(true);
                            }}
                            className="
                            h-10
                            w-10
                            rounded-xl
                            border-slate-200
                            hover:bg-slate-900
                            hover:text-white
                            "
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              handleDeleteClick(expense?._id);
                            }}
                            className="
                            h-10
                            w-10
                            rounded-xl
                            border-slate-200
                            hover:bg-red-500
                            hover:text-white
                            "
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                        </div>

                      </TableCell>

                    </TableRow>

                  ))

                ) : (

                  <TableRow>

                    <TableCell
                      colSpan={6}
                      className="py-14 text-center text-slate-400"
                    >
                      No expenses found.
                    </TableCell>

                  </TableRow>

                )}

              </TableBody>

            </Table>

          </div>

        </CardContent>

      </Card>

      {/* MOBILE VIEW */}

      <div className="space-y-4 lg:hidden">

        {filteredExpenses.map((expense) => (

          <Card
            key={expense._id}
            className="
            rounded-[28px]
            border
            border-slate-200
            bg-white
            shadow-sm
            "
          >

            <CardContent className="p-5">

              <div className="flex items-start justify-between gap-4">

                <div className="space-y-3">

                  <span
                    className={`
                    inline-flex
                    rounded-full
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    ${getCategoryColor(expense.category)}
                    `}
                  >
                    {expense.category}
                  </span>

                  <h3 className="text-xl font-bold text-slate-900">
                    ₹{expense.amount.toLocaleString()}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {expense.notes || "No notes"}
                  </p>

                  <p className="text-xs text-slate-400">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>

                </div>

                <div className="flex flex-col gap-2">

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setInitialData(expense);
                      setIsEditMode(true);
                      setIsDialogOpen(true);
                    }}
                    className="rounded-xl border-slate-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      handleDeleteClick(expense?._id);
                    }}
                    className="rounded-xl border-slate-200"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>

                </div>

              </div>

            </CardContent>

          </Card>

        ))}

      </div>

    </div>
  </>
);
}