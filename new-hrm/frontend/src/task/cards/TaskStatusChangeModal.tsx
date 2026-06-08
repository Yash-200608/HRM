import React, { useEffect } from "react";
import { SubTask, Status } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TaskStatusChangeModalProps {
  task: SubTask;
  onClose: () => void;
  onConfirm: () => void;
  newStatus: Status;
  setNewStatus: (value : string) => void;
  isOpen?: boolean;
  name : String;
}

const TaskStatusChangeModal: React.FC<TaskStatusChangeModalProps> = ({
  name,
  task,
  onClose,
  onConfirm,
  newStatus,
  setNewStatus,
  isOpen = true,
}) => {
  useEffect(()=>{
    if(task?.status){
      setNewStatus(task?.status)
    }
  },[task, setNewStatus])
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className=" w-[95vw] max-w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Update {name} Status</DialogTitle>
          <DialogDescription>
            Change the status of <span className="font-medium text-foreground">{task?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="status" className="text-right sr-only">
              New Status
            </Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as Status)}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" className="cursor-pointer">Pending</SelectItem>
                <SelectItem value="active" className="cursor-pointer">In Progress</SelectItem>
                <SelectItem value="completed" className="cursor-pointer">Completed</SelectItem>
                <SelectItem value="cancelled" className="cursor-pointer">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm()}>Confirm Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskStatusChangeModal;
