import React, { FC, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {CalendarDays, Users, CheckCircle2, AlertCircle, Briefcase, Clock, User} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {getProjectById} from "@/services/Service";
import {formatDate, getStatusColor, getPriorityColor} from "@/services/allFunctions";
 
interface ProjectDetailCardProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
}

const ProjectDetailCard: FC<ProjectDetailCardProps> = ({
    isOpen,
    onClose,
    projectId,
}) => {

     const {user} = useAuth();
   const {toast} = useToast();
   const [projectData,setProjectData] = useState(null);

 
   const handleGetSingleProject = async () => {
     if (!user?._id || !user?.companyId?._id || !projectId) { return }
     try {
       const res = await getProjectById(projectId, user?.companyId?._id, user?._id);
       if (res.status === 200) {
         setProjectData(res.data.data);
       }
     }
     catch (err) {
       console.log(err);
      return toast({ title: "Error", description: err.response.data.message ,variant:"destructive" });
     }
   };

   useEffect(() => {
     if(!isOpen && !projectId) return;
     handleGetSingleProject();
   }, [isOpen, projectId])


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className=" w-[95vw]  max-w-[95vw] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] max-h-[90vh] p-0 overflow-hidden flex flex-col " >
                <DialogHeader className="p-6 pb-2">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {projectData?.name}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {projectData?.description}
                            </DialogDescription>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                            <Badge variant="outline" className={getStatusColor(projectData?.status)}>
                                {projectData?.status}
                            </Badge>
                            <Badge variant="outline" className={getPriorityColor(projectData?.priority)}>
                                {projectData?.priority} Priority
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="team">Team</TabsTrigger>
                            <TabsTrigger value="tasks">Tasks & Progress</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea
                        className=" flex-1 p-6 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto">
                        <TabsContent value="overview" className="mt-0 space-y-6">
                            {/* Key Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Start Date</CardTitle>
                                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatDate(projectData?.startDate)}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">End Date</CardTitle>
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatDate(projectData?.endDate)}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{projectData?.tasks?.length}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Major milestones
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{Number(projectData?.tasks?.length + projectData?.subTasks?.length)}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Active members
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="team" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" /> Managers
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {projectData?.tasks?.map((m) => (
                                        <div key={m?._id} className="flex items-center space-x-3 p-3 bg-muted/40 rounded-lg border">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {m?.managerId?.fullName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{m?.managerId?.fullName}</p>
                                                <p className="text-xs text-muted-foreground">{m?.managerId?.department?.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Team Members
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {projectData?.subTasks?.map((e) => (
                                        <div key={e._id} className="flex items-center space-x-3 p-3 text-sm border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{e?.employeeId?.fullName}</p>
                                                <p className="text-xs text-muted-foreground">{e?.employeeId?.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="tasks" className="mt-0 space-y-4">
                            {projectData?.tasks?.map((task) => (
                                <Card key={task._id} className="overflow-hidden">
                                    <CardHeader className="bg-muted/30 p-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base">{task?.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{task?.description}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {task?.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        {task?.subTasks?.length > 0 ? (
                                            <div className="mt-3 space-y-2">
                                                {task?.subTasks?.map((sub) => (
                                                    <div key={sub?._id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/20">
                                                        <span className="flex items-center gap-2">
                                                            {sub?.status === "completed" ? (
                                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                            ) : (
                                                                <div className="h-3 w-3 rounded-full border border-gray-400" />
                                                            )}
                                                            {sub?.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{sub?.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mt-2 italic">No subtasks found.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default ProjectDetailCard;
