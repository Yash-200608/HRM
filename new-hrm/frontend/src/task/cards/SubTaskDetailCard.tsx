import React, { useEffect, useState } from "react";
import { X, User, Building2, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getSubTaskById } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor, getPriorityColor } from "@/services/allFunctions";


interface SubTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subTaskId: string;
}

const SubTaskDetailCard: React.FC<SubTaskDetailModalProps> = ({
  isOpen,
  onClose,
  subTaskId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subTaskData, setSubTaskData] = useState(null);


  const handleGetSingleSubTask = async () => {
    if (!subTaskId || !user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) { return }
    try {

      const res = await getSubTaskById(subTaskId, user?.companyId?._id || user?.createdBy?._id, user?._id);
      if (res.status === 200) {
        setSubTaskData(res.data.data);
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err.response.data.message });
    }
  };
  useEffect(() => {
    if (!isOpen && !subTaskId) return;
    handleGetSingleSubTask();
  }, [isOpen, subTaskId])

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/40 px-4 py-4"
      onClick={onClose}
    >
      <Card
        className="relative w-full max-w-lg rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ❌ Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
        >
          <X className="w-5 h-5" />
        </button>

        <CardContent className="p-5 space-y-5">
          {/* Sub Task Title */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {subTaskData?.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {subTaskData?.description}
            </p>
          </div>

          {/* Status & Priority */}
          <div className="flex gap-2 flex-wrap">
            <Badge className={getStatusColor(subTaskData?.status)}>{subTaskData?.status}</Badge>
            <Badge className={getPriorityColor(subTaskData?.priority)}>{subTaskData?.priority} Priority</Badge>
          </div>

          {/* Assigned Employee */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="w-4 h-4 text-primary" />
              Assigned Employee
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={subTaskData?.employeeId?.profileImage}
                />
                <AvatarFallback>
                  {subTaskData?.employeeId?.fullName?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="font-medium truncate">
                  {subTaskData?.employeeId?.fullName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {subTaskData?.employeeId?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Department & Manager */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="w-4 h-4 text-primary" />
              Department Details
            </div>

            <div className="space-y-2 text-sm">
              {/* Department Name */}
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {subTaskData?.employeeId?.department?.name}
                </span>
              </div>

              {/* Managers List with Scroll */}
              <div>
                <p className="text-muted-foreground mb-1">Managers:</p>

                <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
                  {subTaskData?.employeeId?.department?.managers?.map((manager: any) => (
                    <div key={manager._id} className="flex items-center gap-2">

                      {/* Profile Image */}
                      <img
                        src={manager.profileImage || "/default-avatar.png"}
                        alt={manager.fullName}
                        className="w-6 h-6 rounded-full object-cover border"
                      />

                      {/* Name */}
                      <span className="font-medium text-gray-800">
                        {manager.fullName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubTaskDetailCard;
