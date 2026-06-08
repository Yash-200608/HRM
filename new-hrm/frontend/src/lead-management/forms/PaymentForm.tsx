// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
// import { Loader2 } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { useState } from "react";
// import { updateLeadPayment } from "@/services/Service";

// const PaymentForm = ({ isOpen, onOpenChange, initialData, setLeadListRefresh }) => {
//     const { toast } = useToast();
//     const [loading, setLoading] = useState(false);

//     const [formData, setFormData] = useState({
//         amountPaid: "",
//         paymentMode: ""
//     });

//     const resetForm = () => {
//         setFormData({ amountPaid: "", paymentMode: "" });
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             setLoading(true);

//             const payload = {
//                 leadId: initialData?._id,
//                 amountPaid: Number(formData.amountPaid),
//                 paymentMode: formData.paymentMode
//             };

//             const res = await updateLeadPayment(payload);

//             if (res.status === 200 || res.status === 201) {
//                 toast({
//                     title: "Payment Added",
//                     description: res?.data?.message
//                 });
//                 setLeadListRefresh(true);
//                 resetForm();
//                 onOpenChange(false);
//             }
//         } catch (err) {
//             toast({
//                 title: "Payment Error",
//                 description: err?.response?.data?.message || err?.message,
//                 variant: "destructive"
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//    return (
//     <Dialog
//         open={isOpen}
//         onOpenChange={(open) => {
//             resetForm();
//             onOpenChange(open);
//         }}
//     >
//         <DialogContent className="max-w-2xl">
//             <DialogHeader>
//                 <DialogTitle>Add Payment</DialogTitle>
//                 <DialogDescription>
//                     Add payment details for enrolled lead.
//                 </DialogDescription>
//             </DialogHeader>

//             <form onSubmit={handleSubmit} className="space-y-4">

//                 {/* Row 1 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     <div>
//                         <Label className="text-xs">Name</Label>
//                         <Input value={initialData?.name} disabled />
//                     </div>

//                     <div>
//                         <Label className="text-xs">Email</Label>
//                         <Input value={initialData?.email} disabled />
//                     </div>
//                 </div>

//                 {/* Row 2 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     <div>
//                         <Label className="text-xs">Phone</Label>
//                         <Input value={initialData?.phone} disabled />
//                     </div>

//                     <div>
//                         <Label className="text-xs">Course</Label>
//                         <Input value={initialData?.product?.name} disabled />
//                     </div>
//                 </div>

//                 {/* Row 3 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     <div>
//                         <Label className="text-xs">Total Price (₹)</Label>
//                         <Input value={initialData?.price} disabled />
//                     </div>

//                     <div>
//                         <Label className="text-xs">Amount Paid (₹)</Label>
//                         <Input
//                             type="number"
//                             value={formData.amountPaid}
//                             onChange={(e) =>
//                                 setFormData({
//                                     ...formData,
//                                     amountPaid: e.target.value,
//                                 })
//                             }
//                             placeholder="Enter Amount Paid"
//                         />
//                     </div>
//                 </div>

//                 {/* Row 4 - Full Width */}
//                 <div>
//                     <Label className="text-xs">Payment Mode</Label>
//                     <Select
//                         value={formData.paymentMode}
//                         onValueChange={(value) =>
//                             setFormData({
//                                 ...formData,
//                                 paymentMode: value,
//                             })
//                         }
//                     >
//                         <SelectTrigger>
//                             <SelectValue placeholder="Select Payment Mode" />
//                         </SelectTrigger>
//                         <SelectContent>
//                             <SelectItem value="cash">Cash</SelectItem>
//                             <SelectItem value="upi">UPI</SelectItem>
//                             <SelectItem value="card">Card</SelectItem>
//                             <SelectItem value="bank_transfer">
//                                 Bank Transfer
//                             </SelectItem>
//                         </SelectContent>
//                     </Select>
//                 </div>

//                 {/* Buttons */}
//                 <div className="flex justify-end gap-2 pt-4">
//                     <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => onOpenChange(false)}
//                     >
//                         Cancel
//                     </Button>

//                     <Button
//                         type="submit"
//                         disabled={
//                             loading ||
//                             !formData.amountPaid ||
//                             !formData.paymentMode
//                         }
//                     >
//                         {loading && (
//                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         )}
//                         {loading ? "Adding..." : "Add Payment"}
//                     </Button>
//                 </div>
//             </form>
//         </DialogContent>
//     </Dialog>
// );
// };

// export default PaymentForm;


























import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { updateLeadPayment } from "@/services/Service";
import { getCurrentDate, formatDateFromInput } from "@/services/allFunctions";


const PaymentForm = ({ isOpen, onOpenChange, initialData, setLeadListRefresh }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        amountPaid: "0",
        paymentMode: "",
        finalPrice: "",
        joinDate: getCurrentDate()

    });

    const resetForm = () => {
        setFormData({ amountPaid: "0", paymentMode: "", finalPrice: "", joinDate: getCurrentDate() });
    };

    useEffect(() => {
        if (initialData) {
            setFormData({ ...formData, amountPaid:initialData?.payment?.amountPaid, paymentMode: initialData?.payment?.paymentMode, finalPrice: initialData?.payment?.finalPrice, joinDate: formatDateFromInput(initialData?.joinDate) || getCurrentDate() })
        }
    }, [initialData])

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const payload = {
                leadId: initialData?._id,
                amountPaid: Number(formData.amountPaid),
                paymentMode: formData?.paymentMode,
                finalPrice: formData?.finalPrice,
                joinDate: formData?.joinDate
            };

            const res = await updateLeadPayment(payload);

            if (res.status === 200 || res.status === 201) {
                toast({
                    title: "Payment Added",
                    description: res?.data?.message
                });
                setLeadListRefresh(true);
                resetForm();
                onOpenChange(false);
            }
        } catch (err) {
            toast({
                title: "Payment Error",
                description: err?.response?.data?.message || err?.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                resetForm();
                onOpenChange(open);
            }}
        >
            <DialogContent className="max-w-lg p-4">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-sm">Add Payment</DialogTitle>
                    <DialogDescription className="text-xs">
                        Add payment details for enrolled lead.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">

                    {/* Name + Email */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Name</Label>
                            <Input className="h-8 text-xs placeholder:text-xs" value={initialData?.name} disabled />
                        </div>

                        <div>
                            <Label className="text-xs">Email</Label>
                            <Input className="h-8 text-xs" value={initialData?.email} disabled />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <Label className="text-xs">Phone</Label>
                        <Input className="h-8 text-xs" value={initialData?.phone} disabled />
                    </div>

                    {/* Course + Duration */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Course</Label>
                            <Input className="h-8 text-xs" value={initialData?.product?.name} disabled />
                        </div>

                        <div className="flex-1 gap-1 ml-3">
                            <Label className="text-xs">
                                Course Duration*
                            </Label>

                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Duration"
                                    value={initialData?.product?.duration?.value}
                                    required
                                    min="1"
                                    className="placeholder:text-xs"
                                    disabled
                                />

                                <select
                                    value={initialData?.product?.duration?.unit}
                                    disabled
                                    className="border rounded-md px-2 text-sm"
                                >
                                    <option value="Days">Days</option>
                                    <option value="Weeks">Weeks</option>
                                    <option value="Months">Months</option>
                                    <option value="Years">Years</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Total Price + Final Price */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Course Price (₹)</Label>
                            <Input className="h-8 text-xs" value={initialData?.price} disabled />
                        </div>

                        <div>
                            <Label className="text-xs">Final Price (₹)</Label>
                            <Input className="h-8 text-xs" value={formData?.finalPrice} onChange={(e) => { setFormData({ ...formData, finalPrice: e.target.value }) }} />
                        </div>
                    </div>

                    {/* Amount Paid + Join Date */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Amount Paid (₹)</Label>
                            <Input
                                className="h-8 text-xs"
                                type="number"
                                value={formData.amountPaid}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        amountPaid: (e.target.value)
                                    })
                                }
                                placeholder="Enter Amount"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Join Date</Label>
                            <Input
                                type="date"
                                className="h-8 text-xs"
                                onChange={(e) => { setFormData({ ...formData, joinDate: e.target.value }) }}
                                value={formData?.joinDate} />
                        </div>
                    </div>

                    {/* Payment Mode */}
                    <div>
                        <Label className="text-xs">Payment Mode (Optional)</Label>
                        <Select
                            value={formData.paymentMode}
                            onValueChange={(value) =>
                                setFormData({
                                    ...formData,
                                    paymentMode: value
                                })
                            }
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select Payment Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            size="sm"
                            type="submit"
                            disabled={loading || !formData.finalPrice || !formData.joinDate}
                        >
                            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            {loading ? "Adding..." : "Add Payment"}
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentForm;