// import React, { useEffect, useState } from "react";
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
//     DialogDescription,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Loader2 } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";

// // 👉 Replace these with your actual service functions
// import { addProduct, updateProduct } from "@/services/Service";

// interface ProductFormDialogProps {
//     isOpen: boolean;
//     onOpenChange: (open: boolean) => void;
//     initialData?: any;
//     setProductListRefresh?: (val: boolean) => void;
// }

// const ProductForm: React.FC<ProductFormDialogProps> = ({
//     isOpen,
//     onOpenChange,
//     initialData,
//     setProductListRefresh,
// }) => {
//     const { toast } = useToast();
//     const [isLoading, setIsLoading] = useState(false);
//     const isEdit = Boolean(initialData);

//     const [form, setForm] = useState({
//         name: "",
//         description: "",
//         price: "",
//     });

//     // 🔁 Load data for edit mode
//     useEffect(() => {
//         if (initialData) {
//             setForm({
//                 name: initialData.name || "",
//                 description: initialData.description || "",
//                 price: initialData.price?.toString() || "",
//             });
//         } else {
//             resetForm();
//         }
//     }, [initialData, isOpen]);

//     const resetForm = () => {
//         setForm({
//             name: "",
//             description: "",
//             price: "",
//         });
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsLoading(true);

//         try {
//             const payload = {
//                 name: form.name,
//                 description: form.description,
//                 price: Number(form.price),
//             };

//             let res;

//             // 👉 Replace with real API
//             if (isEdit) {
//                 res = await updateProduct(initialData._id, payload);
//             } else {
//                 res = await addProduct(payload);
//             }


//             if (res.status === 200 || res.status === 201) {
//                 toast({
//                     title: isEdit ? "Product updated." : "Product added.",
//                     description: res?.data?.message,
//                 });


//                 setProductListRefresh?.(true);
//                 resetForm();
//                 onOpenChange(false);
//             }
//         } catch (err: any) {
//             toast({
//                 title: "Error",
//                 description: err?.message || "Something went wrong",
//                 variant: "destructive",
//             });
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <Dialog open={isOpen} onOpenChange={onOpenChange}>
//             <DialogContent className="sm:max-w-md w-full">
//                 <DialogHeader>
//                     <DialogTitle>
//                         {isEdit ? "Edit Course" : "Add Course"}
//                     </DialogTitle>
//                     <DialogDescription>
//                         {isEdit
//                             ? "Update Course details"
//                             : "Fill Course information"}
//                     </DialogDescription>
//                 </DialogHeader>

//                 <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit}>

//                     {/* Product Name */}
//                     <div className="flex flex-col gap-1">
//                         <Label className="text-xs">Course Name*</Label>
//                         <Input
//                             type="text"
//                             placeholder="Enter Course name"
//                             value={form.name}
//                             onChange={(e) =>
//                                 setForm({ ...form, name: e.target.value })
//                             }
//                             required
//                             className="placeholder:text-xs"
//                         />
//                     </div>

//                     {/* Description */}
//                     <div className="flex flex-col gap-1">
//                         <Label className="text-xs">Description(Optional)</Label>
//                         <Input
//                             type="text"
//                             placeholder="Enter description"
//                             value={form.description}
//                             onChange={(e) =>
//                                 setForm({ ...form, description: e.target.value })
//                             }
//                             className="placeholder:text-xs"
//                         />
//                     </div>

//                     {/* Price */}
//                     <div className="flex flex-col gap-1">
//                         <Label className="text-xs">Price*</Label>
//                         <Input
//                             type="number"
//                             placeholder="Enter price"
//                             value={form.price}
//                             onChange={(e) =>
//                                 setForm({ ...form, price: e.target.value })
//                             }
//                             required
//                             min="0"
//                             className="placeholder:text-xs"
//                         />
//                     </div>

//                     {/* Buttons */}
//                     <div className="flex justify-end gap-2 mt-4">
//                         <Button
//                             type="button"
//                             variant="outline"
//                             onClick={() => {
//                                 resetForm();
//                                 onOpenChange(false);
//                             }}
//                         >
//                             Cancel
//                         </Button>

//                         <Button
//                             type="submit"
//                             disabled={
//                                 isLoading ||
//                                 !form.name ||
//                                 !form.price
//                             }
//                         >
//                             {isLoading && (
//                                 <Loader2 className="animate-spin mr-2" />
//                             )}
//                             {isLoading
//                                 ? isEdit
//                                     ? "Updating..."
//                                     : "Adding..."
//                                 : isEdit
//                                     ? "Update"
//                                     : "Add"}
//                         </Button>
//                     </div>
//                 </form>
//             </DialogContent>
//         </Dialog>
//     );
// };

// export default ProductForm;





























import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { addProduct, updateProduct } from "@/services/Service";

interface ProductFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any;
    setProductListRefresh?: (val: boolean) => void;
}

const ProductForm: React.FC<ProductFormDialogProps> = ({
    isOpen,
    onOpenChange,
    initialData,
    setProductListRefresh,
}) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const isEdit = Boolean(initialData);

    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        durationValue: "",
        durationUnit: "Months",
        modules: [""],
    });

    // 🔁 Load Edit Data
    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || "",
                description: initialData.description || "",
                price: initialData.price?.toString() || "",
                durationValue: initialData?.duration?.value?.toString() || "",
                durationUnit: initialData?.duration?.unit || "Months",
                modules: initialData?.modules?.length ? initialData.modules : [""],
            });
        } else {
            resetForm();
        }
    }, [initialData, isOpen]);

    const resetForm = () => {
        setForm({
            name: "",
            description: "",
            price: "",
            durationValue: "",
            durationUnit: "Months",
            modules: [""],
        });
    };

    // ➕ Add Module
    const addModule = () => {
        setForm({ ...form, modules: [...form.modules, ""] });
    };

    // ❌ Remove Module
    const removeModule = (index: number) => {
        const updated = [...form.modules];
        updated.splice(index, 1);
        setForm({ ...form, modules: updated });
    };

    // ✏ Update Module
    const updateModule = (value: string, index: number) => {
        const updated = [...form.modules];
        updated[index] = value;
        setForm({ ...form, modules: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                name: form.name,
                description: form.description,
                price: Number(form.price),
                duration: {
                    value: Number(form.durationValue),
                    unit: form.durationUnit,
                },
                modules: form.modules.filter((m) => m.trim() !== ""),
            };

            let res;

            if (isEdit) {
                res = await updateProduct(initialData._id, payload);
            } else {
                res = await addProduct(payload);
            }

            if (res.status === 200 || res.status === 201) {
                toast({
                    title: isEdit ? "Course updated." : "Course added.",
                    description: res?.data?.message,
                });

                setProductListRefresh?.(true);
                resetForm();
                onOpenChange(false);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-full">

                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Edit Course" : "Add Course"}
                    </DialogTitle>

                    <DialogDescription>
                        {isEdit
                            ? "Update Course details"
                            : "Fill Course information"}
                    </DialogDescription>
                </DialogHeader>

                <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit}>

                    {/* Course Name */}
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">Course Name*</Label>

                        <Input
                            type="text"
                            placeholder="Enter Course name"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            required
                            className="placeholder:text-xs"
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">
                            Description (Optional)
                        </Label>

                        <Input
                            type="text"
                            placeholder="Enter description"
                            value={form.description}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    description: e.target.value,
                                })
                            }
                            className="placeholder:text-xs"
                        />
                    </div>

                    {/* Price */}
                    <div className="flex">
                        <div className="flex-1 gap-1">
                            <Label className="text-xs">Price*</Label>

                            <Input
                                type="number"
                                placeholder="Enter price"
                                value={form.price}
                                onChange={(e) =>
                                    setForm({ ...form, price: e.target.value })
                                }
                                required
                                min="0"
                                className="placeholder:text-xs"
                            />
                        </div>

                        {/* Duration */}
                        <div className="flex-1 gap-1 ml-3">
                            <Label className="text-xs">
                                Course Duration*
                            </Label>

                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Duration"
                                    value={form.durationValue}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            durationValue: e.target.value,
                                        })
                                    }
                                    required
                                    min="1"
                                    className="placeholder:text-xs"
                                />

                                <select
                                    value={form.durationUnit}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            durationUnit: e.target.value,
                                        })
                                    }
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

                    {/* Modules */}
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto p-1">
                        <Label className="text-xs">
                            Course Modules
                        </Label>

                        {form.modules.map((module, index) => (
                            <div key={index} className="flex gap-2">

                                <Input
                                    type="text"
                                    placeholder={`Module ${index + 1}`}
                                    value={module}
                                    onChange={(e) =>
                                        updateModule(e.target.value, index)
                                    }
                                    className="placeholder:text-xs"
                                />

                                {form.modules.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="text-xs px-2 py-1 h-7"
                                        onClick={() => removeModule(index)}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={addModule}
                        >
                            + Add Module
                        </Button>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-2 mt-4">

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                isLoading ||
                                !form.name ||
                                !form.price ||
                                !form.durationValue
                            }
                        >
                            {isLoading && (
                                <Loader2 className="animate-spin mr-2" />
                            )}

                            {isLoading
                                ? isEdit
                                    ? "Updating..."
                                    : "Adding..."
                                : isEdit
                                    ? "Update"
                                    : "Add"}
                        </Button>

                    </div>

                </form>

            </DialogContent>
        </Dialog>
    );
};

export default ProductForm;