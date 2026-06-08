import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { getleaveTypes } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getLeaveTypes } from "@/redux-toolkit/slice/allPage/leaveSlice";
import { socket } from "@/socket/socket";

const ApplyLeaveDialog = ({ open, onOpenChange, mode, initialData, setLeaveTypeRefresh}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // const [leaveTypes, setLeaveTypes] = useState([]);
  const [obj, setObj] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    description: "",
    userId: user?._id,
    companyId: user?.createdBy?._id
  });
  const today = new Date().toISOString().split("T")[0];
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const dispatch = useAppDispatch();
  const leaveTypes = useAppSelector((state) => state.leave.leaveTypes);

  const resetForm = () => {
    setObj({
      leaveType: "",
      fromDate: "",
      toDate: "",
      description: "",
      userId: user?._id,
      companyId: user?.createdBy?._id
    });
  };

  /* =======================
     Prefill in Edit Mode
  ======================= */
  useEffect(() => {
    if (mode && initialData) {
      setObj({
        leaveType: initialData.leaveType || "",
        fromDate: initialData.startDate || "",
        toDate: initialData.endDate || "",
        description: initialData.description || "",
        userId: initialData.userId || "",
        companyId: user?.createdBy?._id
      });
    }
  }, [mode, initialData]);

  const handleChange = (key, value) => {
    setObj((prev) => ({ ...prev, [key]: value }));
  };
  const handleGetLeaveType = async () => {
    try {
      const res = await getleaveTypes(user?.createdBy?._id);
      dispatch(getLeaveTypes(Array.isArray(res?.data?.leaves) ? res?.data?.leaves : []));
      // setLeaveTypes(Array.isArray(res?.data?.leaves) ? res?.data?.leaves : []);
    }
    catch (err) {
      console.log(err)
    }
  }
  useEffect(() => {
    if(user?.createdBy?._id && leaveTypes?.length === 0){
    handleGetLeaveType();
    }
  }, [user?.createdBy?._id, leaveTypes?.length]);

  useEffect(() => {
              socket.on("getLeaveRefresh", () => {
                  handleGetLeaveType();
              });
      
              return () => {
                  socket.off("getLeaveRefresh");
              };
          }, []);
  

  /* =======================
        Submit Handler
  ======================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;

      if (mode) {
        // ===== UPDATE =====
        // res = await axios.put(
        //   `${import.meta.env.VITE_API_URL}/api/leave-requests/update/${initialData._id}`,
        //   obj
        // );
      } else {
        // ===== CREATE =====
        res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/leave-requests/apply`,
          obj
        );
      }
     socket.emit("addLeaveRefresh");
      toast({
        title: mode ? "Leave Updated" : "Leave Applied",
        description: res?.data?.message,
      });

      setLeaveTypeRefresh(true);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open)=>{resetForm(); onOpenChange(open)}}>
      {/* Trigger Button (only in create mode usually) */}

      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Apply Leave
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode ? "Update Leave" : "Apply for Leave"}
          </DialogTitle>
          <DialogDescription>
            {mode
              ? "Update the leave request details."
              : "Fill in the details to submit a leave request."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label>Leave Type</Label>

            <Select
              value={obj.leaveType || ""}
              onValueChange={(value) => handleChange("leaveType", value)}
              disabled={leaveTypes?.length === 0} // optional: disable select if no leave types
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes?.map((type) => (
                  <SelectItem key={type._id} value={type._id}>
                    {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 🔴 Conditional message if no leave types */}
            {leaveTypes?.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Add leave type first, please contact the admin
              </p>
            )}
          </div>


          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                ref={startDateRef}
                value={obj.fromDate}
                min={today}   // 🔴 past disable
                onChange={(e) => handleChange("fromDate", e.target.value)}
                required
                onClick={()=> {if(startDateRef.current?.showPicker){startDateRef.current?.showPicker()}}}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                ref={endDateRef}
                value={obj.toDate}
                min={obj?.fromDate || today}   // 🔴 past disable
                onChange={(e) => handleChange("toDate", e.target.value)}
                required
                 onClick={()=> {if(endDateRef.current?.showPicker){endDateRef.current?.showPicker()}}}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={obj.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Enter reason for leave"
              rows={3}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {resetForm(); onOpenChange(false);}}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !obj?.leaveType || !obj?.fromDate || !obj?.toDate || !obj?.description} className="min-w-[120px]">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode ? "Updating..." : "Submitting..."}
                </>
              ) : mode ? (
                "Update"
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyLeaveDialog;
