
import React, { useEffect, useState } from "react";
import { Bell, FolderKanban, CalendarDays, Receipt, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteNotifications, deleteAllNotifications } from "@/services/Service";
import DeleteCard from "@/components/cards/DeleteCard";
import { Trash } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notifications, markAsRead, deleteNotification, markAllAsRead, refreshNotifications } = useNotifications();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);

  useEffect(() => {
    // Mark all as read when visiting the page
    markAllAsRead();
    // Also ensure we have latest data
    refreshNotifications();
  }, [markAllAsRead, refreshNotifications]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task":
      case "subtask":
        return <FolderKanban className="w-5 h-5 text-primary" />;
      case "leave":
        return <CalendarDays className="w-5 h-5 text-green-500" />;
      case "expense":
        return <Receipt className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification._id);
    switch (notification.type) {
      case "task":
      case "subtask":
        navigate("/tasks/task");
        break;
      case "leave":
        navigate("/leaves");
        break;
      case "attendance":
        navigate("/attendances");
        break;
      case "expense":
        navigate("/expenses");
        break;
      case "project":
        navigate("/tasks/projects");
        break;
      default:
        // No specific route
        break;
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const companyId = user?.companyId?._id ?? user?.createdBy?._id;
      if (user && user?.role !== "super_admin") {
        if (!user?._id) {
          throw new Error("User not found");
        }
        if (!companyId) {
          throw new Error("Company not found");
        }
      }

      let res;
      if (!selectedNotificationId) {
        // delete all notifications
        res = await deleteAllNotifications(user._id, companyId);
      } else {
        // delete single notification
        res = await deleteNotifications(
          selectedNotificationId,
          user._id,
          companyId
        );
      }

      if (res?.status === 200) {
        refreshNotifications();
        toast({
          title: "Notification Deleted",
          description: res?.data?.message,
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSelectedNotificationId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Notification Page</title>
        <meta name="description" content="View and manage your notifications" />
      </Helmet>

      <DeleteCard
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title={selectedNotificationId ? "Delete Notification Message?" : "Delete All Notification Messages?"}
        message={selectedNotificationId ? `This Action Will Permanently Delete This Notification Message.` : `This Action Will Permanently Delete All Notification Messages.`}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-row items-end sm:justify-end gap-4 md:mt-[-20px]">
          <Button
            variant="outline"
            onClick={() => { setSelectedNotificationId(null); setIsDeleteDialogOpen(true) }}
          >
            <Trash size={18} className="text-red-500 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {notifications?.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notifications yet.</p>
                </div>
              )}

              {notifications?.map((notification) => (
                <div
                  key={notification?._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex gap-4 p-4 rounded-lg transition-colors cursor-pointer",
                    !notification.read
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="p-2 rounded-lg bg-card border self-start">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className={cn(
                            "font-medium",
                            !notification.read && "text-primary"
                          )}
                        >
                          {notification?.createdBy
                            ? `${notification?.createdBy.fullName || notification?.createdBy.username} : ${notification.message}`
                            : notification.message}
                        </h3>
                      </div>

                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNotificationId(notification?._id);
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash size={18} className="text-red-500" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Notifications;
