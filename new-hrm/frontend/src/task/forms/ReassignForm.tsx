import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getTaskManager, getEmployeebyDepartment } from "@/services/Service";
import { useAuth } from '@/contexts/AuthContext';
import { formatForDateTimeInput } from "@/services/allFunctions";


interface ReassignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  reassignName: string;
  onSave: (value: any) => void;
}

const ReassignForm: React.FC<ReassignFormModalProps> = ({ isOpen, onClose, data, reassignName, onSave }) => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([])
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const { toast } = useToast();
  

  const normalizedManagers = managers?.flatMap(item => {
  if (item.fullName) return [item];

  if (item.managers) return item.managers;

  return [];
});


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) {
      toast({ title: 'Error', description: 'All fields are required' });
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: 'Error', description: 'End date cannot be before start date' });
      return;
    }
    setLoading(true);
    let obj = { employeeId, startDate, endDate, taskId: data?._id }
    try {
      const res = await onSave(obj);
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message, variant: "destructive" })
      setLoading(false);
    }
    finally {
      setLoading(false);
    }
  }
  const handleGetManager = async () => {
  if (!reassignName || !user?._id) return;

  const companyId = user?.companyId?._id || user?.createdBy?._id;
  
  // Sub-task ke liye department nikalne ka safe tareeka
  const dept = data?.employeeId?.department?._id|| data?.managerId?.department?._id;

  const obj = {
    taskId: data?._id,
    department: dept,
    companyId,
    adminId: user._id,
  };
     if(!obj?.adminId || !obj?.companyId || !obj?.department || !obj?.taskId) return;
  try {
    let res;
    if (reassignName === "Manager") {
      res = await getTaskManager(user._id, companyId);
      console.log(res)
    } else {
      res = await getEmployeebyDepartment(obj);
    }
    console.log(res);
    if (res?.status === 200) {
      const managerList = reassignName === "Manager" ? (res?.data?.data || res?.data?.managers) : (res.data?.data || []);

      setManagers(managerList);
    }
  } catch (err) {
    console.error(err);
  }
};

 useEffect(() => {
  if (!isOpen && !reassignName) return;
  handleGetManager();
}, [isOpen, reassignName, data, user]);


 useEffect(() => {
  if (data && reassignName) {
    setStartDate(data?.startDate ? formatForDateTimeInput(data.startDate) : "");
    setEndDate(data?.endDate ? formatForDateTimeInput(data.endDate) : "");
  } else {
    setEmployeeId("");
    setStartDate("");
    setEndDate("");
  }
}, [data, reassignName]); 

useEffect(() => {
  if (managers && managers.length > 0 && data) {
    const currentId = data?.managerId?._id || data?.employeeId?._id;
    if (currentId) {
      setEmployeeId(currentId);
    }
  }
}, [managers, data]); 


  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);


  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:px-6">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm sm:max-w-md p-6 relative transition-all transform scale-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center">Reassign {reassignName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Dropdown */}
          <div className="space-y-1">
            <Label htmlFor="employee">Select Employee</Label>
            <Select key={normalizedManagers?.length} value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="employee" className="w-full">
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent className="w-full max-h-48 overflow-auto">
                {normalizedManagers?.map(emp => (
                  <SelectItem key={emp._id} value={emp._id} 
                  disabled={emp._id === employeeId || (reassignName === "Employee" && emp?.department?.managers?.includes(emp?._id))}
                  >
                    {emp?.fullName} ({emp?.department?.name}) {reassignName==="Employee" && (emp?.department?.managers?.includes(emp?._id)? "(Manager)" : "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
            ref={startDateRef}
              id="startDate"
              type="datetime-local"
               min={formatForDateTimeInput(data?.projectId?.startDate || data?.taskId?.startDate)}
              max={formatForDateTimeInput(data?.projectId?.endDate || data?.taskId?.endDate)}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              onClick={()=>{if(startDateRef.current?.showPicker){startDateRef.current?.showPicker()}}}
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <Label htmlFor="endDate">End Date</Label>
            <Input
            ref={endDateRef}
              id="endDate"
              type="datetime-local"
              value={endDate}
               min={startDate}
              max={formatForDateTimeInput(data?.projectId?.endDate || data?.taskId?.endDate)}
              onChange={e => setEndDate(e.target.value)}
              onClick={()=>{if(endDateRef.current?.showPicker){endDateRef.current?.showPicker()}}}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Reassigning...' : 'Reassign'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ReassignForm;
