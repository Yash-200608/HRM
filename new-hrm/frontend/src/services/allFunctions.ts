
import { LayoutDashboard, Users, Building2, User, IndianRupee, FolderKanban, Clock, CalendarDays, Receipt, Wallet, Bell, BarChart3, Settings, LogOut, Briefcase } from 'lucide-react';
import { FileText } from "lucide-react";

//  strong password check k liye hai y 
export const isStrongPassword = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
};


export const getPasswordErrors = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push("One special character (@$!%*?&)");
  }

  return errors;
};


export const formatDateTime = (date: string | Date) => {
  if (!date) return "-";

  const d = new Date(date);

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatForDateTimeInput = (date: string | Date) => {
  if (!date) return "";

  const d = new Date(date);

  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
};

//   date ko frontend m normal show karne k liye
export function formatDate(isoDate, format = 'short', locale = 'en-US') {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  let options;
  switch (format) {
    case 'short':   // 31/01/2026
      options = { day: '2-digit', month: '2-digit', year: 'numeric' };
      break;
    case 'medium':  // 31 Jan 2026
      options = { day: '2-digit', month: 'short', year: 'numeric' };
      break;
    case 'long':    // 31 January 2026
      options = { day: '2-digit', month: 'long', year: 'numeric' };
      break;
    default:
      options = { day: '2-digit', month: 'short', year: 'numeric' };
  }

  return date.toLocaleDateString(locale, options);
}

//  date ko date input m convert karne k liye taki input samajhkar ise input  m show kar sake
export const formatDateFromInput = (date: string | Date | undefined) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};
export const getDaysBetween = (
  startDate: string | Date,
  endDate: string | Date
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime(); // ✅ FIX
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays + 1; // inclusive
};
// Convert "HH:mm" to AM/PM format safely
export const formatClock = (time) => {
  if (!time) return "—"; // missing data case
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";

  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12; // midnight
  else if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${period}`;
};

export const getCurrentMonthAndYear = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = today.getFullYear();
  return `${year}-${month}`;
};
export const getCurrentHourAndMinute = (date: Date | string) => {
  const today = new Date(date);
  const hour = today.getHours();
  const minute = today.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12; // 12-hour format
  const formattedMinute = minute < 10 ? `0${minute}` : minute;

  return `${formattedHour}:${formattedMinute} ${ampm}`;
}

// Get current week in YYYY-Www format
export const getCurrentWeek = (): string => {
  const now = new Date();
  const year = now.getFullYear();

  const firstDayOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor(
    (now.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000) + 1
  );

  const weekNumber = Math.ceil((dayOfYear - now.getDay() + 1) / 7);
  const weekStr = String(weekNumber).padStart(2, "0");

  return `${year}-W${weekStr}`;
};


export const getCurrentDate = () => {
  const today = new Date();

// Local date in YYYY-MM-DD format
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, "0"); // month 0 se start hota hai
const day = String(today.getDate()).padStart(2, "0");

const currentDate = `${year}-${month}-${day}`;
return currentDate
}

export const allDaysCount = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let totalSunday = 0;
  let totalSpecialSaturdays = 0; // 1st & 3rd Saturday
  let saturdayCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) {
      totalSunday++;
    } else if (dayOfWeek === 6) {
      saturdayCount++;
      if (saturdayCount === 1 || saturdayCount === 3) {
        totalSpecialSaturdays++;
      }
    }
  }

  return { totalSunday, totalSpecialSaturdays, total: totalSunday + totalSpecialSaturdays };
};


export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "active":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "low": return "bg-yellow-100 text-yellow-800";
    case "high": return "bg-blue-100 text-blue-800";
    case "medium": return "bg-green-100 text-green-800";
    case "urgent": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}


export const getStatusColorfromEmployee = (status: string) => {

  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-500';
    case 'RELIEVED': return 'bg-red-100 text-red-800 border-red-500';
    case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
    default: return 'bg-gray-100 text-gray-800 border-gray-500';
  }
};

export const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'Salary Change': return 'bg-purple-100 text-purple-800';
    case 'Profile Update': return 'bg-teal-100 text-teal-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};


export const getStatusBadgeClassAndText = (status: string) => {
  switch (status) {
    case "selected":
      return { className: "bg-green-200 text-green-800", text: "Hired" };
    case "rejected":
      return { className: "bg-red-200 text-red-800", text: "Rejected" };
    case "interview":
      return { className: "bg-purple-200 text-purple-800", text: "Interview" };
    case "shortlisted":
      return { className: "bg-blue-200 text-blue-800", text: "Shortlisted" };
    case "screening":
      return { className: "bg-yellow-100 text-yellow-800", text: "In Review" };
    case "applied":
      return { className: "bg-amber-200 text-amber-900", text: "Applied" };
    default:
      return { className: "bg-gray-200 text-gray-800", text: status };
  }
};


export const statusActions = {
  applied: ["screening", "rejected"],
  screening: ["shortlisted", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["selected", "rejected"],
  selected: [],
  rejected: []
};


// utils/tasks.ts
export const getOverdueTasks = (projects: any[], role: string) => {
  const today = new Date();
  let overdueTasks: any[] = [];

  if (role === "admin") {
    // Admin: go through all projects and their tasks
    projects?.forEach(project => {
      project?.tasks?.forEach(task => {
        const taskEndDate = new Date(task.endDate);
        if (
          (task.status === "pending" || task.status === "active") &&
          taskEndDate < today
        ) {
          overdueTasks.push(task);
        }
      });
    });
  } else {
    // Manager / Employee: only check their own tasks
    projects?.forEach(task => {
      const taskEndDate = new Date(task.endDate);
      if (
        (task.status === "pending" || task.status === "active") &&
        taskEndDate < today
      ) {
        overdueTasks.push(task);
      }
    });
  }

  return overdueTasks;
};

export const getTaskCountByStatus = (
  projects: any[] = [],
  status?: string,
  role: "admin" | "employee" | "super_admin" = "employee"
) => {
  if (role === "admin") {
    // Admin: iterate through projects
    return projects.reduce((total, project) => {
      if (!Array.isArray(project.tasks)) return total;

      if (!status) {
        return total + project.tasks.length;
      }

      const filteredTasks = project.tasks.filter(task => task.status === status);
      return total + filteredTasks.length;
    }, 0);
  } else {
    // Manager / Employee: iterate through own tasks
    if (!Array.isArray(projects)) return 0;

    if (!status) {
      return projects.length;
    }

    const filteredTasks = projects.filter(task => task.status === status);
    return filteredTasks.length;
  }
};


export const months = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];



export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  setActiveSidebar: React.Dispatch<React.SetStateAction<string>>;
  setTaskSubPage: React.Dispatch<React.SetStateAction<string>>;
  setTaskName: React.Dispatch<React.SetStateAction<string>>;
  setJobSubPage: React.Dispatch<React.SetStateAction<string>>;
  setJobName: React.Dispatch<React.SetStateAction<string>>;
  setLeadSubPage: React.Dispatch<React.SetStateAction<string>>;
  setLeadName: React.Dispatch<React.SetStateAction<string>>;

}
export interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
   module: string;
}
export const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    module: 'dashboard'
  },

  {
    icon: Building2,
    label: 'Companies',
    path: '/companies',
    module: 'companies'
  },

  {
    icon: Users,
    label: 'Admins',
    path: '/users',
    module: 'admins'
  },

  {
    icon: FolderKanban,
    label: 'Tasks',
    path: '/tasks',
    module: 'tasks'
  },

  {
    icon: Clock,
    label: 'Attendance',
    path: '/attendances',
    module: 'attendance'
  },
  {
  icon: CalendarDays,
  label: "Monthly Attendance",
  path: "/reports-monthly-attendance",
  module: 'attendancereport'

},
 
  {
    icon: CalendarDays,
    label: 'Leave',
    path: '/leaves',
    module: 'leave'
  },

  {
    icon: Briefcase,
    label: 'Departments',
    path: '/departments',
    module: 'departments'
  },

  {
    icon: Users,
    label: 'Employees',
    path: '/users',
    module: 'employees'
  },

  {
    icon: FileText,
    label: 'Resignation',
    path: '/resignation',
    module: 'Resignation'
  },

  {
    icon: CalendarDays,
    label: 'Holidays',
    path: '/holidays',
    module: 'holiday'
  },

  {
    icon: IndianRupee,
    label: 'Expenses',
    path: '/expenses',
    module: 'expenses'
  },

  {
    icon: Wallet,
    label: 'Payroll',
    path: '/payrolls',
    module: 'payroll'
  },

  {
    icon: Bell,
    label: 'Job-Portal',
    path: '/jobs',
    module: 'jobportal'
  },

  {
    icon: User,
    label: 'Lead-Portal',
    path: '/leads',
    module: 'leadportal'
  },

  {
    icon: BarChart3,
    label: 'Reports',
    path: '/reports',
    module: 'reports'
  },

  {
    icon: User,
    label: 'Roles',
    path: '/assignroles',
    module: 'roles'
  },

  {
    icon: Settings,
    label: 'Setting',
    path: '/setting',
    module: 'setting'
  },
];

/** Task Submenu (Admin/Super Admin Only) */
export const taskSubMenu = [
  {
    label: 'Dashboard',
    path: '/tasks',
    module: 'tasks_dashboard'
  },
  {
    label: 'Projects',
    path: '/tasks/projects',
    module: 'projects'
  },
  {
    label: 'Tasks',
    path: '/tasks/task',
    module: 'tasks'
  },
  {
    label: 'Sub Tasks',
    path: '/tasks/sub-task',
    module: 'subtasks'
  },
  {
    label: 'Overdue Tasks',
    path: '/tasks/overdue',
    module: 'overdue_tasks'
  },
  {
    label: 'Task Manager',
    path: '/tasks/manager',
    module: 'task_manager'
  }
];

export const JobSubMenu = [
  {
    label: 'Dashboard',
    path: '/jobs',
    module: 'job_dashboard'
  },

  {
    label: 'Companies',
    path: '/jobs/companys',
    module: 'job_companies'
  },

  {
    label: 'Jobs',
    path: '/jobs/jobs',
    module: 'jobs'
  },

  {
    label: 'Applications',
    path: '/jobs/application',
    module: 'job_applications'
  },

  {
    label: 'Candidates',
    path: '/jobs/candidates',
    module: 'job_candidates'
  },

  {
    label: 'Revenue',
    path: '/jobs/revenues',
    module: 'job_revenue'
  },

  {
    label: 'Settings',
    path: '/jobs/setting',
    module: 'job_settings'
  },

  {
    label: 'Roles',
    path: '/jobs/roles',
    module: 'job_roles'
  }
];


export const LeadSubMenu = [
  {
    label: 'Lead List',
    path: '/leads',
    module: 'lead_list'
  },

  {
    label: 'Join List',
    path: '/leads/orders',
    module: 'lead_orders'
  },

  {
    label: 'Course List',
    path: '/leads/products',
    module: 'lead_products'
  },
];





export const getStatusStyle = (status: string) => {
  switch (status) {
    case "Present": return { bg: "bg-green-100 text-green-800", text: "Present" };
    case "Absent": return { bg: "bg-red-100 text-red-800", text: "Absent" };
    case "Half Day": return { bg: "bg-yellow-100 text-yellow-800", text: "Half Day" };
    case "Late": return { bg: "bg-orange-100 text-orange-800", text: "Late" };
    case "No Data": return { bg: "bg-blue-50 text-blue-400", text: "-" };
    case "Sunday": return { bg: "bg-red-100 text-red-800", text: "Sunday" };
    case "1st Saturday": return { bg: "bg-red-100 text-red-800", text: "1st Saturday" };
    case "3rd Saturday": return { bg: "bg-red-100 text-red-800", text: "3rd Saturday" };
    default: return { bg: "bg-gray-100 text-gray-500", text: "-" };
  }
};

export const getMonthlySummary = (userId: string, attendanceMap) => {
  const userData = attendanceMap[userId];
  const summary = { present: 0, absent: 0, halfDay: 0, late: 0 };
  if (!userData) return summary;

  Object.values(userData.attendanceByDate).forEach((att: any) => {
    switch (att.status) {
      case "Present": summary.present++; break;
      case "Absent": summary.absent++; break;
      case "Half Day": summary.halfDay++; break;
      case "Late": summary.late++; break;
    }
  });

  return summary;
};

export const headingManage = (path: string, role: string) => {
  // ----------------------------
  // Tasks Section
  // ----------------------------
  if (path.startsWith("/tasks")) {
    if (path === "/tasks") {
      return {
        title: "Dashboard",
        description: "Overview of your Projects and Tasks.",
        icon: "LayoutDashboard",
      };
    }
    if (path === "/tasks/projects") {
      return {
        title: "Projects",
        description: "Manage and track your ongoing projects.",
        icon: "Folder",
      };
    }
    if (path === "/tasks/task") {
      return {
        title: "Tasks",
        description: "Manage and track your ongoing Tasks.",
        icon: "CheckSquare",
      };
    }
    if (path === "/tasks/sub-task") {
      return {
        title: "Sub Tasks",
        description: "Manage and track your ongoing SubTasks.",
        icon: "Layers",
      };
    }
    if (path === "/tasks/overdue") {
      return {
        title: "Overdue Tasks",
        description: "Manage and track your ongoing Overdue Tasks.",
        icon: "AlertCircle",
      };
    }
    if (path === "/tasks/manager") {
      return {
        title: "Task Manager",
        description: "Manage and track your Department Managers.",
        icon: "Users",
      };
    }
    return {
      title: "Tasks",
      description: "Overview of your Projects and Tasks.",
      icon: "LayoutDashboard",
    };
  }

  // ----------------------------
  // Job Portal Section
  // ----------------------------
  if (path.startsWith("/jobs")) {
    if (path === "/jobs") {
      return {
        title: "Dashboard",
        description:
          "Get a complete overview of recruitment performance, recent activity, and key hiring metrics.",
        icon: "LayoutDashboard",
      };
    }
    if (path === "/jobs/candidates") {
      return {
        title: "Candidates",
        description:
          "View, manage, and organize candidate profiles throughout the hiring process.",
        icon: "Users",
      };
    }
    if (path === "/jobs/application") {
      return {
        title: "Applications",
        description:
          "Track and manage job applications across all stages.",
        icon: "FileCheck",
      };
    }
    if (path === "/jobs/companys") {
      return {
        title: "Companies",
        description:
          "Manage registered companies and their job postings.",
        icon: "Building2",
      };
    }
    if (path === "/jobs/jobs") {
      return {
        title: "Jobs",
        description:
          "Create and manage job posts, track candidates, and view metrics.",
        icon: "Briefcase",
      };
    }
    if (path === "/jobs/revenues") {
      return {
        title: "Revenue",
        description:
          "Analyze earnings, recruitment revenue streams, and financial performance insights.",
        icon: "TrendingUp",
      };
    }
    if (path === "/jobs/setting") {
      return {
        title: "Settings",
        description:
          "Configure portal preferences, permissions, and system-level configurations.",
        icon: "Settings",
      };
    }

    if (path === "/jobs/roles") {
      return {
        title: "Roles",
        description:
          "Manage roles.",
        icon: "User",
      };
    }
    return {
      title: "Job-Portal",
      description:
        "Get a complete overview of recruitment performance, recent activity, and key hiring metrics.",
      icon: "LayoutDashboard",
    };
  }

  // ----------------------------
  // Lead Portal Section
  // ----------------------------
  if (path.startsWith("/leads")) {
    if (path === "/leads") {
      return {
        title: "Student Lead Management",
        description: "Manage and track your potential students efficiently.",
        icon: "UserPlus",
      };
    }
    if (path === "/leads/orders") {
      return {
        title: "Enrolled JoinList",
        description: "Manage enrollments, payments, and student Joins.",
        icon: "ShoppingCart",
      };
    }
    if (path === "/leads/products") {
      return {
        title: "Course Management",
        description: "Manage and track your Course efficiently.",
        icon: "Package",
      };
    }
    return {
      title: "Lead-Portal",
      description: "Manage and track your leads and products.",
      icon: "User",
    };
  }

  // ----------------------------
  // Other Pages (Admin / Common)
  // ----------------------------
  switch (path) {
    case "/dashboard":
      return {
        title: "Admin Dashboard",
        description: "Welcome back! Here's what's happening today.",
        icon: "LayoutDashboard",
      };
    case "/attendances":
      return {
        title: "Attendance",
        description:
          role === "admin"
            ? "Overview of all employees' attendance."
            : "Your daily attendance record.",
        icon: "Clock",
      };
    case "/leaves":
      return {
        title: "Leave Management",
        description:
          role === "admin"
            ? "Manage employee leave requests & types."
            : "Apply for leave and track your requests",
        icon: "CalendarDays",
      };
    case "/departments":
      return {
        title: "Departments",
        description: "Manage company departments and team structure.",
        icon: "Briefcase",
      };
    case "/users":
      return {
        title: role === "super_admin" ? "Manage Admins" : "Manage Employees",
        description:
          role === "super_admin"
            ? "Create and manage admin accounts."
            : "Create and manage employee accounts.",
        icon: "UsersIcon",
      };
    case "/expenses":
      return {
        title: "Expense",
        description: "View and manage your own expenses.",
        icon: "LayoutDashboard",
      };
    case "/payrolls":
      return {
        title: "Payroll Management",
        description: "Manage employee salaries and generate payslips.",
        icon: "Wallet",
      };
    case "/notifications":
      return {
        title: "Notifications",
        description: "View recent alerts, updates, and system messages.",
        icon: "Bell",
      };
    case "/reports":
      return {
        title: "Reports & Analytics",
        description:
          "Comprehensive insights into your organization's performance.",
        icon: "BarChart3",
      };
    case "/setting":
      return {
        title: "Setting",
        description: "Manage your account settings and preferences.",
        icon: "SettingsIcon",
      };
    case "/companies":
      return {
        title: "Company",
        description: "Manage your company's profile, settings, and overall structure.",
        icon: "Building2",
      };
    default:
      return {
        title: "Admin Dashboard",
        description: "Welcome back! Here's what's happening today.",
        icon: "LayoutDashboard",
      };
  }
};
