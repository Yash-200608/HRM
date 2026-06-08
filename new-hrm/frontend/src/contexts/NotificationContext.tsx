import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types/index";
import { getNotificationData, markAsReadNotifications } from "@/services/Service";

interface NotificationContextType {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => void;
  refreshNotifications: () => Promise<void>;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      const companyId = user?.companyId?._id || user?.createdBy?._id;
      const res = await getNotificationData(user._id, companyId);
      if (res.status === 200) {
        // Map status to read boolean for compatibility
        const mappedData = res.data.notification.map((n: any) => ({
          ...n,
          read: n.status === "read"
        }));
        setNotifications(mappedData);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    };

    // Initial fetch
    refreshNotifications();

    const socketClient: Socket = io(import.meta.env.VITE_API_URL);
    setSocket(socketClient);

    // Join user-specific room
    socketClient.emit("joinRoom", user._id);

    // Listen for notifications
    socketClient.on("newNotification", (notification: Notification) => {
      if (notification.userId === user._id) {
        if (notification?.type === "task") {
          toast({ title: notification?.type, description: `${notification?.message} Assigned By ${notification?.createdBy?.username || notification?.createdBy?.fullName || "Admin"}`, className: "bg-yellow-600" });
        }
        else {
          toast({ title: notification?.type, description: notification?.message, className: "bg-yellow-600" });
        }
        // Append new notification and set read: false
        setNotifications((prev) => [{ ...notification, read: false }, ...prev]);
      }
    });

    return () => {
      socketClient.disconnect();
    };
  }, [user, toast, refreshNotifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = useCallback(async () => {
    if (!user?._id) return;
    try {
      const companyId = user?.companyId?._id || user?.createdBy?._id;
      await markAsReadNotifications(user._id, companyId);
      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Mark all as read error:", err);
    }
  }, [user]);

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
