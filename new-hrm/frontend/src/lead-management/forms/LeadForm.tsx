import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { getAllProduct, addLead, updateLead } from "@/services/Service";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getProductList } from "@/redux-toolkit/slice/lead-portal/productSlice";
import {getCurrentDate, formatDateFromInput} from "@/services/allFunctions";


const LeadForm = ({ isOpen, onOpenChange, initialData, setLeadListRefresh }) => {
    const { toast } = useToast();
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        product: "",
        source: "",
        price: "",
        durationValue: "",
        durationUnit: "Months",
    });
    const [productListRefresh, setProductListRefresh] = useState(false);
    // const [productList, setProductList] = useState([]);
    const dispatch = useAppDispatch();
    const productList = useAppSelector((state) => state?.product?.productList)

    useEffect(() => {

        if (initialData) {
            setFormData({
                name: initialData?.name,
                email: initialData?.email,
                phone: initialData?.phone,
                product: initialData?.product?._id,
                source: initialData?.source,
                price: initialData?.price,
                durationValue: initialData?.duration?.value?.toString() || "",
                durationUnit: initialData?.duration?.unit || "Months",
            });
        }
    }, [initialData]);

    const resetForm = () => {
        setFormData({ name: "", email: "", phone: "", product: "", durationValue: "", durationUnit: "Months", source: "", price: ""})
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await (isEdit ? updateLead(initialData._id, formData) : addLead(formData));
            if (res.status === 200 || res.status === 201) {
                setLeadListRefresh(true);
                onOpenChange(false);
                resetForm();
                toast({ title: isEdit ? "Lead Updated" : "Lead Added", description: res?.data?.message })
            }
        }
        catch (err) {
            console.log(err);
            toast({ title: "Error Lead", description: err?.response?.data?.message || err?.message, variant: "destructive" })
        }
        finally {
            setLoading(false);
        }
    }

    const handleSelectProduct = async (value) => {
        const product = productList?.find((product) => product._id === value);
        setFormData({ ...formData, product: value, price: product?.price, durationValue:product?.duration?.value, durationUnit:product?.duration?.unit });
    }

    const handleGetProductList = async () => {
        const res = await getAllProduct();
        // setProductList(res?.data?.data);
        dispatch(getProductList(res?.data?.data))
    };

    useEffect(() => {
        if (productList?.length === 0 || productListRefresh) {
            handleGetProductList();
        }
    }, [productListRefresh]);
    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { resetForm(); onOpenChange(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Update Lead" : "Add New Lead"}</DialogTitle>
                        <DialogDescription>
                            Fill in the details below to {isEdit ? "update" : "create"} a lead.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <Label className="text-xs">Name</Label>
                        <Input type="text" value={formData?.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter Full Name" className="placeholder:text-xs" />
                        <Label className="text-xs">Email</Label>
                        <Input type="email" value={formData?.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter Email Address" className="placeholder:text-xs" />
                        <div className="flex my-1">
                            <div className="flex-1">
                                <Label className="text-xs">Phone</Label>
                                <Input type="text" value={formData?.phone} maxLength={10} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter Phone Number" className="placeholder:text-xs" />
                            </div>
                        </div>
                        <div className="flex">
                            <div className="flex-1">
                                <Label className="text-xs">Course</Label>
                                <Select value={formData?.product} onValueChange={(value) => { handleSelectProduct(value) }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[250px] overflow-y-auto">
                                        {productList?.map((product) => (
                                            <SelectItem key={product._id} value={product._id} className="cursor-pointer">
                                                {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 gap-1 ml-3">
                                <Label className="text-xs">
                                    Course Duration*
                                </Label>

                                <div className="flex gap-2">
                                    <Input
                                        disabled
                                        type="number"
                                        placeholder="Duration"
                                        value={formData.durationValue}
                                        onChange={(e) => setFormData({ ...formData, durationValue: e.target.value, })}
                                        required
                                        min="1"
                                        className="placeholder:text-xs"
                                    />

                                    <select
                                        disabled
                                        value={formData.durationUnit}
                                        onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value, })
                                        }
                                        className="border rounded-md px-2 text-sm" >
                                        <option value="Days">Days</option>
                                        <option value="Weeks">Weeks</option>
                                        <option value="Months">Months</option>
                                        <option value="Years">Years</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex">
                            <div className="flex-1">
                                <Label className="text-xs">Course Price(₹)</Label>
                                <Input type="number" value={formData?.price} placeholder="Enter Price" className="placeholder:text-xs" disabled />
                                {!formData?.product && <p className="text-xs text-muted-foreground">Please select a course to auto-fill the price</p>}
                            </div>
                              <div className="flex-1 ml-2">
                                <Label className="text-xs">Source(Optional)</Label>
                                <Input type="text" value={formData?.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="Enter Source" className="placeholder:text-xs" />
                            </div>
                        </div>

                        {/* <Label>Status</Label>
                        <Input /> */}
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>Cancel</Button>
                            <Button type="submit" disabled={loading || !formData?.name || !formData?.email || !formData?.phone || !formData?.product || !formData?.price}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? isEdit ? "Updating" : "Submitting" : isEdit ? "Update" : "Submit"}

                            </Button>
                        </div>

                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default LeadForm;
