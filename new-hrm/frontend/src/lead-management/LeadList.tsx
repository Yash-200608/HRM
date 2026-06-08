import React, { useState, useMemo, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Plus, Search, UserPlus, Mail, Phone, Filter, ArrowUpDown, Trash2, Edit, CheckCircle, Loader2, MessageCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import LeadForm from "./forms/LeadForm";
import { Helmet } from "react-helmet-async";
import { getAllLead, deleteLead, updateLeadStatus, getAllProduct } from "@/services/Service";
import { formatDate } from "@/services/allFunctions";
import DeleteCard from "@/components/cards/DeleteCard";
import { useToast } from "@/hooks/use-toast";
import PaymentForm from "@/lead-management/forms/PaymentForm";
import {getLeadList} from "@/redux-toolkit/slice/lead-portal/leadSlice"
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import {getCurrentMonthAndYear, formatDateFromInput} from "@/services/allFunctions";
import MessageCard from "@/lead-management/MessageCard";
import { socket } from "@/socket/socket";
import MultipleSend from "./MultipleSend";
import { getProductList } from "@/redux-toolkit/slice/lead-portal/productSlice";

export type LeadStatus = "new" | "contacted" | "interested" | "enrolled" | "lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  status: LeadStatus;
  source?: string;
  createdAt: string;
};

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-purple-100 text-purple-700 border-purple-200",
  interested: "bg-yellow-100 text-yellow-700 border-yellow-200",
  enrolled: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-red-100 text-red-700 border-red-200",
};
const statusOrder = ["new", "interested", "contacted"]; // lost remove
const extraStatuses = ["lost", "demo", "inDemo"]; // hover/click par show


const LeadList: React.FC = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [leadListRefresh, setLeadListRefresh] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
    const [paymentData, setPaymentData] = useState<any>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState("all");
  const [courseStatus, setCourseStatus] = useState("all");
  // const [leadList, setLeadList] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusData, setStatusData] = useState({ id: "", status: "new" });
  const currentStatusIndex = statusOrder.indexOf(statusData?.status);
const [showExtra, setShowExtra] = useState(false); 
const [showMultipleForm, setShowMultipleForm] = useState(false); 
const [currentMonth, setCurrentMonth] = useState(getCurrentMonthAndYear());
const [selectedUsers, setSelectedUsers] = useState([]);
const dateRef = useRef(null);
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);

    useEffect(() => {
        socket.on("leadListRefresh", () => {
          setLeadListRefresh(true);
        });
    
        return () => {
          socket.off("leadListRefresh")
        }
    
      }, []);

      const handleCheckboxChange = (id, checked) => {
  if (checked) {
    setSelectedUsers((prev) => [...prev, id]); // add id
  } else {
    setSelectedUsers((prev) => prev.filter((item) => item !== id)); // remove id
  }
};

  const dispatch = useAppDispatch();
  const courseList = useAppSelector((state)=> state?.product?.productList);
  const leadList = useAppSelector((state)=> state?.lead?.leadList);

  const filteredLeads = useMemo(() => {
    if (!leadList) return [];

    // 🔍 Search Filter
    const searchFiltered = leadList.filter((v)=> v?.status!=="enrolled").filter((lead) =>
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.source?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.includes(search) ||
      lead.product?.name?.toLowerCase().includes(search.toLowerCase())
    );

    // 🎯 Status Filter (separate variable)
   let statusFiltered = searchFiltered;

if (status && status !== "all") {
  statusFiltered = statusFiltered.filter( (lead) => lead.status?.toLowerCase() === status.toLowerCase()
  );
}

if (courseStatus && courseStatus !== "all") {
  statusFiltered = statusFiltered.filter( (lead) => lead?.product?.name?.toLowerCase().includes(courseStatus.toLowerCase())
  );
}

    return statusFiltered;
  }, [leadList, search, status, courseStatus]);

  const handleDeleteLead = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteLead(selectedLeadId);
      if (res.status === 200) {
        toast({ title: "Delete Lead", description: res?.data?.message });
        setLeadListRefresh(true);
      }
    } catch (error) {
      console.log(error);
      toast({ title: "Delete Lead", description: error?.response?.data?.message, variant: "destructive" });
    }
    finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  const handleUpdateLeadStatus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsStatusLoading(true);
    let obj = {
      id: statusData?.id,
      status: statusData?.status
    }
    try {
      const res = await updateLeadStatus(obj);
      if (res.status === 200) {
        toast({ title: "Update Lead Status", description: res?.data?.message });
        setLeadListRefresh(true);
      }
    } catch (error) {
      console.log(error);
      toast({ title: "Update Lead Status", description: error?.response?.data?.message, variant: "destructive" });
    }
    finally {
      setIsStatusLoading(false);
      setIsStatusDialogOpen(false);
    }
  }

  const handleGetLeadList = async () => {
    try {
      const res = await getAllLead(currentMonth);
      if (res.status === 200) {
        // setLeadList(res?.data?.data);
        dispatch(getLeadList(res?.data?.data))
        setLeadListRefresh(false);
      }
    }
    catch (err) {
      console.log(err);
    }
  };

  
  const handleGetCourseList = async () => {
    try {
      const res = await getAllProduct();
      if (res.status === 200) {
        // setLeadList(res?.data?.data);
        dispatch(getProductList(res?.data?.data))
      }
    }
    catch (err) {
      console.log(err);
    }
  };


  useEffect(() => {
    if (leadListRefresh || courseList?.length === 0) {
      handleGetCourseList();
    }
  }, [leadListRefresh, courseList?.length]);

  
  useEffect(() => {
    if (leadListRefresh || leadList?.length === 0|| currentMonth) {
      handleGetLeadList();
      setLeadListRefresh(false);
    }
  }, [leadListRefresh, leadList?.length, currentMonth]);


  return (
    <>
    <MultipleSend isOpen={showMultipleForm} onOpenChange={setShowMultipleForm} selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers} />
     <MessageCard isOpen={messageDialogOpen} onOpenChange={setMessageDialogOpen} userData={initialData} />
    <PaymentForm
    isOpen={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        initialData={paymentData}
        setLeadListRefresh={setLeadListRefresh}
    />
      <LeadForm
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        initialData={initialData}
        setLeadListRefresh={setLeadListRefresh}
      />
      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteLead}
        isDeleting={isDeleting}
        title="Delete Lead?"
        message="This Action Will Permanently Delete This Lead."
      />
      <Helmet title="Lead List" />
      <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
        <div className="flex flex-row justify-end gap-4 mt-[-45px] mb-[-10px]">
          <Button
            onClick={() => { setInitialData(null); setIsAddDialogOpen(true) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Lead
          </Button>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b pb-4 px-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
  {/* Search */}
  <div className="relative w-full md:w-96">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    <Input
      placeholder="Search leads by name, email, or course..."
      className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  {/* Status Dropdown */}
  <div className={`grid ${selectedUsers.length !== 0 ? "grid-cols-4" : "grid-cols-3"} gap-3`}>
   
    { selectedUsers.length !== 0 && <Button className="item" onClick={()=>{setShowMultipleForm(true)}}>Send Message</Button>}
    <Select value={courseStatus} onValueChange={setCourseStatus}>
      <SelectTrigger>
        <SelectValue placeholder="Select Status" />
      </SelectTrigger>
      <SelectContent className="w-[80px] item">
        <SelectItem value="all" className="cursor-pointer">All</SelectItem>
        {courseList?.map((v)=>(
          <SelectItem value={v?.name}>{v?.name}</SelectItem>
        ))}
         
      </SelectContent>
    </Select>

     <Select value={status} onValueChange={setStatus}>
      <SelectTrigger>
        <SelectValue placeholder="Select Status" />
      </SelectTrigger>
      <SelectContent className="w-[80px] item">
        <SelectItem value="all" className="cursor-pointer">All</SelectItem>
        <SelectItem value="new" className="cursor-pointer">New</SelectItem>
        <SelectItem value="interested" className="cursor-pointer">Interested</SelectItem>
        <SelectItem value="contacted" className="cursor-pointer">Contacted</SelectItem>
        <SelectItem value="demo" className="cursor-pointer">demo</SelectItem>
        <SelectItem value="inDemo" className="cursor-pointer">InDemo</SelectItem>
        <SelectItem value="lost" className="cursor-pointer">Lost</SelectItem>
      </SelectContent>
    </Select>
  

    {/* Date Picker */}
    <div>
      <input
        type="month" // or "date" if you want exact date
        className="item border border-slate-200 cursor-pointer rounded pl-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
        value={currentMonth} // state for selected month
        onChange={(e) => setCurrentMonth(e.target.value)}
        ref={dateRef}
        onClick={()=>{if(dateRef.current?.showPicker){dateRef.current.showPicker()}}}
      />
    </div>
  </div>



</div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700"></TableHead>
                    <TableHead className="font-semibold text-slate-700">Lead Details</TableHead>
                    <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="font-semibold text-slate-700">Course</TableHead>
                    <TableHead className="font-semibold text-slate-700">Source</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead, i) => (
                      <TableRow key={lead._id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <Input type="checkbox" className="w-3 h-3 " checked={selectedUsers.includes(lead._id)} onChange={(e) => handleCheckboxChange(lead._id, e.target.checked)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                              {lead?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{lead?.name?.charAt(0).toUpperCase() + lead?.name?.slice(1)}</p>
                              <p className="text-xs text-slate-500">ID: LAD-{i + 1}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-600">
                              <Mail className="mr-2 h-3 w-3" /> {lead?.email}
                            </div>
                            <div className="flex items-center text-sm text-slate-600">
                              <Phone className="mr-2 h-3 w-3" /> {lead?.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-800">{lead?.product?.name?.charAt(0).toUpperCase() + lead?.product?.name?.slice(1)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal py-0 px-2 bg-slate-50 border-slate-200">
                            {lead?.source?.charAt(0).toUpperCase() + lead?.source?.slice(1) || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[lead.status]} border cursor-pointer hover:opacity-80 transition-opacity`}>
                            {lead.status?.charAt(0).toUpperCase() + lead.status?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {(lead?.status !== "lost") &&<><DropdownMenuItem className="cursor-pointer" onClick={() => { setStatusData({ id: lead._id, status: lead.status }); setIsStatusDialogOpen(true) }}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Update Status
                              </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => { setPaymentData(lead); setIsAddPaymentDialogOpen(true) }}>
                                <Edit className="mr-2 h-4 w-4" /> Convert To Order
                              </DropdownMenuItem></>}
                              <DropdownMenuItem className="cursor-pointer" onClick={() => { setInitialData(lead); setIsAddDialogOpen(true) }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => {setInitialData(lead);setMessageDialogOpen(true) }}>
                                <MessageCircle className="mr-2 h-4 w-4" /> Message
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => { setSelectedLeadId(lead._id); setIsDeleteDialogOpen(true) }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <UserPlus className="h-10 w-10 mb-2 opacity-20" />
                          <p>No leads found matching your search.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
  <DialogContent className="sm:max-w-md w-full">
    <DialogHeader>
      <DialogTitle>Update Lead Status</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleUpdateLeadStatus}>
      <Label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
        Status
      </Label>

      <Select
        value={statusData?.status}
        onValueChange={(value) => setStatusData({ ...statusData, status: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a status" />
        </SelectTrigger>

        <SelectContent>
          {statusOrder.map((statusValue) => {
            const optionIndex = statusOrder.indexOf(statusValue);
            const isDisabled = optionIndex < currentStatusIndex;

            return (
              <div
                key={statusValue}
                onMouseEnter={() => {
                  if (statusValue === "contacted") setShowExtra(true);
                }}
                onMouseLeave={() => {
                  if (statusValue === "contacted") setShowExtra(false);
                }}
              >
                <SelectItem
                  value={statusValue}
                  disabled={isDisabled}
                  className="cursor-pointer"
                >
                  {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                </SelectItem>

                {/* Extra options on hover/click */}
                {statusValue === "contacted" && showExtra && (
                  <div className="ml-4 flex flex-col">
                    {extraStatuses.map((extra) => (
                      <SelectItem
                        key={extra}
                        value={extra}
                        className="text-sm cursor-pointer text-gray-700 dark:text-gray-200"
                      >
                        {extra.charAt(0).toUpperCase() + extra.slice(1)}
                      </SelectItem>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </SelectContent>
      </Select>

      <div className="flex justify-end mt-6">
        <Button type="submit" disabled={isStatusLoading}>
          {isStatusLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Update Status"
          )}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

      </div>
    </>
  );
};

export default LeadList;