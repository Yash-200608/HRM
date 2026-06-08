
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Laptop2, Users, CheckSquare, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {getTaskById} from "@/services/Service";
import {getStatusColor, getPriorityColor} from "@/services/allFunctions";

interface TaskDetailCardProps {
  isOpen: boolean;
  onClose: () => void;
  taskId:string;
}

const TaskDetailCard: React.FC<TaskDetailCardProps> = ({ isOpen, onClose, taskId }) => {
   const {user} = useAuth();
     const {toast} = useToast();
     const [taskData,setTaskData] = useState(null);
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);


   const handleGetSingleTask = async () => {
       if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id) || !taskId) { return }
       try {
         const res = await getTaskById(taskId, user?.companyId?._id || user?.createdBy?._id, user?._id);
         if (res.status === 200) {
           setTaskData(res?.data?.data);
         }
       }
       catch (err) {
         console.log(err);
        return toast({ title: "Error", description: err.response.data.message ,variant:"destructive" });
       }
     };
  
     useEffect(() => {
       if(!isOpen && !taskId) return;
       handleGetSingleTask();
     }, [isOpen, taskId])


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:px-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-lg w-full max-w-5xl p-6 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ❌ Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Task Overview
          </h2>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {taskData?.length} Active Tasks
          </Badge>
        </div>

        <div className="grid gap-6">
            <Card
              className="group hover:shadow-lg transition-all duration-300 border-gray-200/60 overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 w-full" />
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={getPriorityColor(taskData?.priority)}
                      >
                        {taskData?.priority} Priority
                      </Badge>
                      <Badge className={getStatusColor(taskData?.status)}>{taskData?.status}</Badge>
                    </div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Laptop2 className="w-6 h-6 text-gray-400" />
                      {taskData?.name}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={taskData?.managerId?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${taskData?.managerId?.profileImage}`}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {taskData?.managerId?.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="leading-tight">
                      <p className="text-xs text-gray-500">Task Manager</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {taskData?.managerId?.fullName}
                      </p>
                    </div>
                  </div>

                </div>
              </CardHeader>

              <CardContent className="grid gap-6">
                {/* Team */}
                <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white rounded-md shadow-sm text-gray-500">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Assigned Team
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {taskData?.subTasks?.slice(0, 4).map((emp, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center text-center"
                      >
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage
                            src={emp?.employeeId?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp?.employeeId?.profileImage}`}
                          />
                          <AvatarFallback className="text-xs bg-gray-100">
                            {emp?.employeeId?.fullName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <p className="mt-1 text-xs font-medium text-gray-700 truncate max-w-[80px]">
                          {emp?.employeeId?.fullName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>


                <Separator />

                {/* Subtasks */}
                {taskData?.subTasks?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <CheckSquare className="w-4 h-4 text-purple-500" />
                      Sub-tasks ({taskData?.subTasks?.length})
                    </h4>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {taskData?.subTasks?.map((sub) => (
                        <div
                          key={sub._id}
                          className="flex justify-between p-3 border rounded-lg"
                        >
                          <span>{sub.name}</span>
                          <div className="flex -space-x-1">
                              <Avatar  className="h-6 w-6">
                                <AvatarImage src={sub?.employeeId?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub?.employeeId?.profileImage}`} />
                                <AvatarFallback>{sub?.employeeId?.fullName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailCard;

