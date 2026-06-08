
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from "@/contexts/NotificationContext";
import { headingManage } from "@/services/allFunctions";
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface HeaderProps {
  activeSidebar: string;
  taskSubPage: string;
  taskName: string;
  jobName: string;
  jobSubPage: string;
  leadName: string;
  leadSubPage: string;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ taskName, activeSidebar, taskSubPage, jobName, jobSubPage, leadName, leadSubPage, onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const { toast } = useToast();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const data = headingManage(location.pathname, user?.role);
  const IconComponent = Icons[data?.icon as keyof typeof Icons] as React.ComponentType<LucideProps>;

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-4 lg:px-6 py-3">

      <div className="flex items-start justify-between">
        <div className="flex items-start justify-start gap-4">
          <button
            onClick={onToggleSidebar}
            className="md:hidden mt-0 p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>

          {/* Back Button */}
          <div className="mt-0">
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
            >
              <Icons.ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
            </button>
          </div>

          {/* Left Side - Titles with Icon */}
          <div className="flex items-stretch gap-2">

            {/* Icon */}
            <div className="flex items-center">
              {IconComponent && (
                <IconComponent className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </div>

            {/* Text Column */}
            <div className="flex flex-col justify-center leading-tight min-w-0">

              <p className="text-sm md:text-base font-semibold truncate">
                {data?.title}
              </p>

              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {data?.description?.length > 25 ? data.description.substring(0, 25) + "..." : data.description}
              </p>

            </div>

          </div>
        </div>



        {/* Right Side */}
        <div className="flex items-center gap-3">

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                onClick={() => navigate("/notifications")}
                variant="ghost"
                size="icon"
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                  rounded-full bg-destructive text-destructive-foreground
                  text-xs flex items-center justify-center px-1"
                  >
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {user?.username?.charAt(0) || user?.fullName?.charAt(0)}
                  </span>
                </div>
                <span className="hidden md:block font-medium">
                  {user?.username || user?.fullName}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
            {user?.role === "employee" && (
  <DropdownMenuItem
    className="cursor-pointer"
    onClick={() => navigate("/profile")}
  >
    Profile
  </DropdownMenuItem>
)}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate("/setting")}
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={logout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );

};

export default Header;

