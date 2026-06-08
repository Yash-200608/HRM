import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Search,
  Mail,
  Phone,
  Filter,
  ArrowUpDown,
  Trash2,
  Eye,
  Download,
  CreditCard,
  Calendar,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { getAllLead, deleteLead, updateLeadPaymentStatus } from "@/services/Service";
import { formatDate } from "@/services/allFunctions";
import { useToast } from "@/hooks/use-toast";
import DeleteCard from "@/components/cards/DeleteCard";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getLeadList } from "@/redux-toolkit/slice/lead-portal/leadSlice";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger, } from "@/components/ui/sheet";
import PaymentForm from "@/lead-management/forms/PaymentForm";
import { getCurrentMonthAndYear, formatDateFromInput } from "@/services/allFunctions";

export type PaymentStatus = "paid" | "pending" | "failed" | "partial";

export type Order = {
  id: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  course: string;
  amount: number;
  paymentStatus: PaymentStatus;
  orderDate: string;
};


const paymentStatusColors: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  partial: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusOrder = ["pending", "partial", "paid", "failed"];

const OrderList: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>();
  // const [orderList, setOrderList] = useState([]);
  const [orderListRefresh, setOrderListRefresh] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusData, setStatusData] = useState({ id: "", paymentId: "", status: "pending" });
  const currentStatusIndex = statusOrder.indexOf(statusData?.status);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailDialogOpen, setIsOrderDetailDialogOpen] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthAndYear());
  const [status, setStatus] = useState("all");
  const dateRef = useRef(null);

  const dispatch = useAppDispatch();
  const orderList = useAppSelector((state) => state?.lead?.leadList);

  const [search, setSearch] = useState("");
const filteredOrders = useMemo(() => {
  return orderList
    ?.filter((order) => order?.status === "enrolled") // only enrolled students
    .filter((order) => {
      // If status filter is 'all', include all enrolled orders
      if (status === "all") return true;

      // If status filter is 'enrolled', only include orders with status 'enrolled'
      if (status === "enrolled") return order.status === "enrolled";

      // Otherwise, filter by payment status
      return order.payment?.paymentStatus === status;
    })
    .filter((order) =>
      order.name.toLowerCase().includes(search.toLowerCase()) ||
      order.email.toLowerCase().includes(search.toLowerCase()) ||
      order.phone.toLowerCase().includes(search.toLowerCase()) ||
      order.product?.name.toLowerCase().includes(search.toLowerCase())
    );
}, [orderList, search, status]);

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteLead(selectedOrderId);
      if (res.status === 200) {
        toast({ title: "Delete Lead", description: res?.data?.message });
        setOrderListRefresh(true);
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
      leadId: statusData?.id, paymentId: statusData?.paymentId, status: statusData?.status
    }
    try {
      const res = await updateLeadPaymentStatus(obj);
      if (res.status === 200) {
        toast({ title: "Update Lead Status", description: res?.data?.message });
        setOrderListRefresh(true);
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


  const handleGetOrderList = async () => {
    try {
      const res = await getAllLead(currentMonth);
      if (res.status === 200) {
        // setOrderList(res?.data?.data);
        dispatch(getLeadList(res?.data?.data))
        setOrderListRefresh(false);
      }
    }
    catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (orderListRefresh || orderList?.length === 0 || currentMonth) {
      handleGetOrderList();
    }
  }, [orderListRefresh, orderList?.length, currentMonth]);


  return (
    <>
      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteOrder}
        isDeleting={isDeleting}
        title="Delete Lead?"
        message="This Action Will Permanently Delete This Lead."
      />

      <PaymentForm
        isOpen={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        initialData={paymentData}
        setLeadListRefresh={setOrderListRefresh}
      />

      <Helmet title="OrderList" />
      <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
        <div className="flex justify-end gap-3 mt-[-48px]">
          <Button variant="outline" className="bg-white">
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white cursor-pointer" onClick={()=>{setStatus("paid")}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                ₹{orderList?.filter(o => o?.payment?.paymentStatus === "paid").reduce((acc, curr) => acc + curr?.payment?.amountPaid, 0).toLocaleString()}
              </div>
              <p className="text-xs text-green-600 mt-1 font-medium">From successful enrollments</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white cursor-pointer" onClick={()=>{setStatus("enrolled")}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Active Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {orderList?.filter(o => o?.status === "enrolled").length}
              </div>
              <p className="text-xs text-indigo-600 mt-1 font-medium">Students currently enrolled</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white cursor-pointer" onClick={()=>{setStatus("pending")}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {orderList?.filter(o => o?.payment?.paymentStatus === "pending" ).length}
              </div>
              <p className="text-xs text-yellow-600 mt-1 font-medium">Awaiting payment verification</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white cursor-pointer" onClick={()=>{setStatus("partial")}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Pending Amounts</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Pending Payments */}
              <div className="text-2xl font-bold text-slate-900">
                ₹
                {orderList
                  ?.filter(o => o?.payment?.paymentStatus === "pending" || o?.payment?.paymentStatus === "partial")
                  .reduce((acc, curr) => {
                    const finalPrice = curr?.payment?.finalPrice || 0;
                    const amountPaid = curr?.payment?.amountPaid || 0;
                    return acc + (finalPrice - amountPaid);
                  }, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-yellow-600 mt-1 font-medium">Awaiting payment amounts</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b pb-4 px-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, order ID, or course..."
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 cursor-pointer">
                <Input type="month" ref={dateRef} value={currentMonth} onChange={(e) => { setCurrentMonth(e.target.value) }} onClick={() => { if (dateRef.current?.showPicker) { dateRef.current.showPicker() } }} className="cursor-pointer" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Order ID</TableHead>
                    <TableHead className="font-semibold text-slate-700">Student</TableHead>
                    <TableHead className="font-semibold text-slate-700">Course & Price</TableHead>
                    <TableHead className="font-semibold text-slate-700">Amount Paid</TableHead>
                    <TableHead className="font-semibold text-slate-700">Payment Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Join Date</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow key={order._id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => { setSelectedOrder(order); setIsOrderDetailDialogOpen(true) }}>
                        <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                          ORD-{new Date()?.getFullYear()}-{order?._id?.slice(-4)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                              {order?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{order?.name}</p>
                              <p className="text-xs text-slate-500">{order?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-800">{order?.product?.name}</p>
                            <p className="text-xs font-semibold text-slate-600">₹{order?.payment?.finalPrice.toLocaleString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order?.payment?.amountPaid || 0}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="focus:outline-none">
                                <Badge className={`${paymentStatusColors[order?.payment?.paymentStatus]} border cursor-pointer hover:opacity-80 transition-opacity`}>
                                  {order?.payment?.paymentStatus}
                                </Badge>
                              </button>
                            </DropdownMenuTrigger>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-3 w-3 opacity-50" />
                            {formatDate(order?.payment?.joinDate)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Order Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setIsOrderDetailDialogOpen(true) }} className="cursor-pointer">
                                <CreditCard className="mr-2 h-4 w-4" /> View Student
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPaymentData(order); setIsAddPaymentDialogOpen(true) }} className="cursor-pointer">
                                <CreditCard className="mr-2 h-4 w-4" /> Update Payment
                              </DropdownMenuItem>
                              {order?.payment?.paymentStatus !== "paid" && order?.payment?.paymentStatus !== "failed" && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStatusData({ id: order?._id, paymentId: order?.payment?._id, status: order?.payment?.paymentStatus }); setIsStatusDialogOpen(true) }} className="cursor-pointer">
                                <CreditCard className="mr-2 h-4 w-4" /> Update Payment Status
                              </DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order?._id); setIsDeleteDialogOpen(true) }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Order
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
                          <Search className="h-10 w-10 mb-2 opacity-20" />
                          <p>No orders found matching your search.</p>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Lead Status</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateLeadStatus}>
              <Label htmlFor="status">Status</Label>
              <Select value={statusData?.status} onValueChange={(value) => { setStatusData({ ...statusData, status: value }) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOrder.map((statusValue) => {
                    const optionIndex = statusOrder.indexOf(statusValue);
                    const isDisabled = optionIndex < currentStatusIndex;

                    return (
                      <SelectItem
                        key={statusValue}
                        value={statusValue}
                        disabled={isDisabled}
                        className="cursor-pointer"
                      >
                        {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex justify-end mt-6">
                <Button type="submit">
                  {isStatusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Status"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Sheet open={isOrderDetailDialogOpen} onOpenChange={setIsOrderDetailDialogOpen}>
        <SheetContent className="sm:max-w-md w-full p-6">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">Student Detail</SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Detailed information about the selected student
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable container for all content */}
          <div className="flex flex-col gap-4 mt-6 h-[70vh] overflow-y-auto pr-2">

            {/* Student Name & Email */}
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-400">Student Name</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder?.name || "-"}</p>

              <p className="text-xs text-gray-400 mt-2">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder?.email || "-"}</p>
            </div>

            {/* Order ID & Description */}
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-400">Order ID</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ORD-{new Date().getFullYear()}-{selectedOrder?._id?.slice(-4) || "-"}
              </p>

              <p className="text-xs text-gray-400 mt-2">Description</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder?.description || "-"}</p>
            </div>

            {/* Course & Duration */}
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-400">Course</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder?.product?.name || "-"}</p>

              <p className="text-xs text-gray-400 mt-2">Duration</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedOrder?.product?.duration ? `${selectedOrder.product.duration.value} ${selectedOrder.product.duration.unit}` : "-"}
              </p>
            </div>

            {/* Price & Amount Paid */}
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-400">Final Price</p>
              <div className="flex gap-4 mt-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white line-through">
                  {selectedOrder?.price !== undefined ? `₹${selectedOrder.price}` : "-"}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedOrder?.payment?.finalPrice !== undefined ? `₹${selectedOrder.payment.finalPrice}` : "-"}
                </p>
              </div>

              <>
                <p className="text-xs text-gray-400 mt-2">Amount Paid</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ₹{selectedOrder?.payment?.amountPaid || 0}
                </p>
              </>
              <>
                <p className="text-xs text-gray-400 mt-2">Payment Mode</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedOrder?.payment?.paymentMode || "none"}
                </p>
              </>

            </div>

            {/* Payment Status & Join Date */}
            {(selectedOrder?.payment?.paymentStatus || selectedOrder?.payment?.joinDate) && (
              <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                {selectedOrder?.payment?.paymentStatus && (
                  <>
                    <p className="text-xs text-gray-400">Payment Status</p>
                    <Badge className={`${paymentStatusColors[selectedOrder.payment.paymentStatus]} border cursor-pointer hover:opacity-80 transition-opacity w-[70px]`}>
                      {selectedOrder.payment.paymentStatus}
                    </Badge>
                  </>
                )}

                {selectedOrder?.payment?.joinDate && (
                  <>
                    <p className="text-xs text-gray-400 mt-2">Join Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedOrder.payment.joinDate)}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Modules */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-400">Modules</p>
              {selectedOrder?.product?.modules?.length > 0 ? (
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  {selectedOrder.product.modules.map((mod: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-900 dark:text-white">{mod}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">-</p>
              )}
            </div>

          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default OrderList;