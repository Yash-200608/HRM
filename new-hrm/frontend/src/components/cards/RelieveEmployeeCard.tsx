import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios"
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { socket } from "@/socket/socket";


const RelieveEmployeeCard = ({ onClose, employeeId, setRelieveEmployeeId, setEmployeeListRefresh }) => {
    const today = new Date().toISOString().split("T")[0];
    const [relievingDate, setRelievingDate] = useState(today);
    const [isLoading, setIsloading] = useState(false)
    const [remarks, setRemarks] = useState("");

    const apiUrl = import.meta.env.VITE_API_URL;
    const { toast } = useToast();
    // const user = JSON.parse(localStorage.getItem("user"))
     const {user} = useAuth();

    //-----------------------------------Delete Single Employee--------------------------------
    const handleSubmit = async () => {
        
        if (!employeeId) {
             toast({
                title: "Error",
                description: "Employee Id is Required",
                variant: "destructive",
            });
            return
        };

        let obj = {
            relievingDate : relievingDate,
            remarks : remarks,
            companyId : user?.companyId?._id

        }

        setIsloading(true);

        try {
            const res = await axios.put(`${apiUrl}/api/employees/relieveEmployee/${employeeId}`,obj, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });


            if (res?.data?.message === "Employee relieved successfully") {
                socket.emit("addEmployeeRefresh");
                socket.emit("addRelieveRefresh", employeeId);
                toast({
                    title: "Employee Relieved",
                    description: "Employee has been permanently Relieved",
                });
                setEmployeeListRefresh(true);
                onClose();
            }


        } catch (err: any) {
            console.log(err)
            toast({
                title: "Error",
                description: err.response?.data?.message || "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsloading(false);
            setRelieveEmployeeId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            {/* Card */}
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6 space-y-5">

                {/* Header */}
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Relieve Employee
                    </h2>
                    <p className="text-sm text-gray-500">
                        You are about to mark this employee as relieved.
                        Please confirm the relieving date and remarks before proceeding.
                    </p>
                </div>

                {/* Relieving Date */}
                <div className="space-y-1">
                    <Label>Relieving Date *</Label>
                    <Input
                        type="date"
                        value={relievingDate}
                        onChange={(e) => setRelievingDate(e.target.value)}
                    />
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                    <Label>Remarks</Label>
                    <Textarea
                        placeholder="Reason for relieving"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full"
                    />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                  <Button
                  type="submit"
  variant="destructive"
  disabled={isLoading || !relievingDate || !remarks}
  onClick={handleSubmit}
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : (
    "Confirm Relieve"
  )}
</Button>

                </div>
            </div>
        </div>
    );
};

export default RelieveEmployeeCard;
