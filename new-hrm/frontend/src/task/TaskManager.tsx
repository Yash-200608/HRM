
import React, { useEffect, useState } from "react";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddManagerForm from "./forms/AddManagerForm";
import DeleteCard from "@/components/cards/DeleteCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getTaskManager, deleteTaskManager } from "@/services/Service";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getManagers } from "@/redux-toolkit/slice/task/taskManagerSlice";

import { socket } from "@/socket/socket";

interface ManagerItem {
    _id: string;
    fullName: string;
    email: string;
    taskRoleStatus: string;
    department: any;
    profileImage: string;
}

const TaskManager = () => {

    const { toast } = useToast();
    const { user } = useAuth();
    const dispatch = useAppDispatch();

    const managers = useAppSelector((state) => state.manager.managers);

    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [initialData, setInitialData] = useState<ManagerItem | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedManager, setSelectedManager] = useState(null);

    const [managerRefresh, setManagerRefresh] = useState(false);

    // ================= FLATTEN DATA =================
    const managerList = managers?.flatMap((dept) =>
        (dept?.managers || []).map((mgr) => ({
            ...mgr,
            departmentName: dept?.name,
            departmentId: dept?._id,
        }))
    );

    // ================= SEARCH =================
    const filteredManagers = managerList?.filter((m) =>
        m?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        m?.email?.toLowerCase().includes(search.toLowerCase()) ||
        m?.departmentName?.toLowerCase().includes(search.toLowerCase())
    );

    // ================= SOCKET =================
    useEffect(() => {
        socket.on("getEmployeeRefresh", () => {
            setManagerRefresh(true);
        });
        socket.on("managerListRefresh", () => {
            console.log("hiii.....")
            setManagerRefresh(true);
        })

        return () => {
            socket.off("getEmployeeRefresh");
            socket.off("managerListRefresh");
        };
    }, []);

    // ================= DELETE =================
    const handleDeleteClick = (manager) => {
        setSelectedManager(manager);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteTaskManager(user?._id, user?.companyId?._id, selectedManager?._id, selectedManager?.department?._id);

            if (res.status === 200) {
                setManagerRefresh(true);
                toast({ title: "Manager Deleted", description: res?.data?.message });
            }
        } catch (error) {
            toast({ title: "Error", description: error?.response?.data?.message || "Something went wrong" });
        } finally { setIsDeleting(false); setIsDeleteDialogOpen(false); }
    };

    // ================= GET DATA =================
    const handleGetManager = async () => {
        try {
            const res = await getTaskManager(user?._id, user?.companyId?._id);
            console.log(res);

            if (res.status === 200) {
                dispatch(getManagers(res?.data?.managers));
                setManagerRefresh(false);
            }
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (user?._id && (managers?.length === 0 || managerRefresh)) {
            handleGetManager();
        }
    }, [managerRefresh, user?._id, managers?.length]);

    // ================= UI =================
    return (
        <>
            <AddManagerForm
                isOpen={isFormOpen}
                onIsOpenChange={setIsFormOpen}
                initialData={initialData}
                setManagerRefresh={setManagerRefresh}
                managerData={null}
            />

            <DeleteCard
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                title="Remove Manager"
                message="Are you sure you want to remove this manager?"
            />

            <div className="flex flex-col min-h-screen bg-gray-50/50 p-3 sm:p-6 space-y-6">

                {/* Header */}
                <Card>
                    <CardHeader>

                        <CardTitle className="flex items-center justify-between gap-2">

                            {/* Title */}
                            <span className="text-[16px] sm:text-xl font-semibold">
                                Manager List
                            </span>

                            {/* Button */}
                            <Button
                                onClick={() => {
                                    setInitialData(null);
                                    setIsFormOpen(true);
                                }}
                                className="px-2 py-1 text-[12px] md:w-[150px] sm:text-sm h-7 sm:h-9 whitespace-nowrap"
                            >
                                <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                                Add Manager
                            </Button>

                        </CardTitle>

                        <CardDescription className="text-[11px] sm:text-sm mt-1">
                            All managers grouped by department
                        </CardDescription>

                    </CardHeader>

                    <CardContent>

                        {/* Search */}
                        <Input
                            placeholder="Search managers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="mb-4"
                        />

                        {/* Table */}
                        <div className="border rounded-md overflow-x-auto">
                            <Table>

                                <TableHeader>
                                    <TableRow className="text-[11px] md:text-sm">
                                        <TableHead className="px-1 md:px-4">Profile</TableHead>
                                        <TableHead className="px-1 md:px-4">Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Email</TableHead>
                                        <TableHead className="px-1 md:px-4">Department</TableHead>
                                        <TableHead className="text-right px-1 md:px-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredManagers?.length ? (
                                        filteredManagers.map((manager) => (
                                            <TableRow
                                                key={manager._id}
                                                className="text-[11px] md:text-sm"
                                            >

                                                {/* Profile */}
                                                <TableCell className="px-1 md:px-4">
                                                    <img
                                                        src={manager.profileImage}
                                                        className="h-6 w-6 md:h-8 md:w-8 rounded-full object-cover"
                                                    />
                                                </TableCell>

                                                {/* Name */}
                                                <TableCell className="px-1 md:px-4 font-medium truncate max-w-[90px]">
                                                    {manager.fullName}
                                                </TableCell>

                                                {/* Email */}
                                                <TableCell className="hidden md:table-cell">
                                                    {manager.email}
                                                </TableCell>

                                                {/* Department */}
                                                <TableCell className="px-1 md:px-4 truncate max-w-[90px]">
                                                    {manager.department?.name}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right px-1 md:px-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 md:h-8 md:w-8"
                                                            >
                                                                <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>

                                                        <DropdownMenuContent align="end">

                                                            <DropdownMenuItem
                                                                className="cursor-pointer flex items-center gap-2"
                                                                onClick={() => {
                                                                    setInitialData(manager);
                                                                    setIsFormOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Edit
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            <DropdownMenuItem
                                                                className="text-red-600 cursor-pointer flex items-center gap-2"
                                                                onClick={() => handleDeleteClick(manager)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </DropdownMenuItem>

                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>

                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-20 text-sm">
                                                No managers found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>

                            </Table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </>
    );
};

export default TaskManager;