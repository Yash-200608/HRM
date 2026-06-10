export type HeadingKeys = {
  titleKey: string;
  descriptionKey: string;
  icon: string;
};

export function resolveHeadingKeys(
  path: string,
  role?: string,
): HeadingKeys {
  if (path.startsWith("/tasks")) {
    if (path === "/tasks") {
      return {
        titleKey: "headings.tasksDashboard.title",
        descriptionKey: "headings.tasksDashboard.description",
        icon: "LayoutDashboard",
      };
    }
    if (path === "/tasks/projects") {
      return {
        titleKey: "headings.tasksProjects.title",
        descriptionKey: "headings.tasksProjects.description",
        icon: "Folder",
      };
    }
    if (path === "/tasks/task") {
      return {
        titleKey: "headings.tasksTask.title",
        descriptionKey: "headings.tasksTask.description",
        icon: "CheckSquare",
      };
    }
    if (path === "/tasks/sub-task") {
      return {
        titleKey: "headings.tasksSubTask.title",
        descriptionKey: "headings.tasksSubTask.description",
        icon: "Layers",
      };
    }
    if (path === "/tasks/overdue") {
      return {
        titleKey: "headings.tasksOverdue.title",
        descriptionKey: "headings.tasksOverdue.description",
        icon: "AlertCircle",
      };
    }
    if (path === "/tasks/manager") {
      return {
        titleKey: "headings.tasksManager.title",
        descriptionKey: "headings.tasksManager.description",
        icon: "Users",
      };
    }
    return {
      titleKey: "headings.tasks.title",
      descriptionKey: "headings.tasks.description",
      icon: "LayoutDashboard",
    };
  }

  if (path.startsWith("/jobs")) {
    if (path === "/jobs") {
      return {
        titleKey: "headings.jobsDashboard.title",
        descriptionKey: "headings.jobsDashboard.description",
        icon: "LayoutDashboard",
      };
    }
    if (path === "/jobs/candidates") {
      return {
        titleKey: "headings.jobsCandidates.title",
        descriptionKey: "headings.jobsCandidates.description",
        icon: "Users",
      };
    }
    if (path === "/jobs/application") {
      return {
        titleKey: "headings.jobsApplications.title",
        descriptionKey: "headings.jobsApplications.description",
        icon: "FileCheck",
      };
    }
    if (path === "/jobs/companys") {
      return {
        titleKey: "headings.jobsCompanies.title",
        descriptionKey: "headings.jobsCompanies.description",
        icon: "Building2",
      };
    }
    if (path === "/jobs/jobs") {
      return {
        titleKey: "headings.jobsJobs.title",
        descriptionKey: "headings.jobsJobs.description",
        icon: "Briefcase",
      };
    }
    if (path === "/jobs/revenues") {
      return {
        titleKey: "headings.jobsRevenue.title",
        descriptionKey: "headings.jobsRevenue.description",
        icon: "TrendingUp",
      };
    }
    if (path === "/jobs/setting") {
      return {
        titleKey: "headings.jobsSetting.title",
        descriptionKey: "headings.jobsSetting.description",
        icon: "Settings",
      };
    }
    if (path === "/jobs/roles") {
      return {
        titleKey: "headings.jobsRoles.title",
        descriptionKey: "headings.jobsRoles.description",
        icon: "User",
      };
    }
    return {
      titleKey: "headings.jobsPortal.title",
      descriptionKey: "headings.jobsPortal.description",
      icon: "LayoutDashboard",
    };
  }

  if (path.startsWith("/leads")) {
    if (path === "/leads") {
      return {
        titleKey: "headings.leadsList.title",
        descriptionKey: "headings.leadsList.description",
        icon: "UserPlus",
      };
    }
    if (path === "/leads/orders") {
      return {
        titleKey: "headings.leadsOrders.title",
        descriptionKey: "headings.leadsOrders.description",
        icon: "ShoppingCart",
      };
    }
    if (path === "/leads/products") {
      return {
        titleKey: "headings.leadsProducts.title",
        descriptionKey: "headings.leadsProducts.description",
        icon: "Package",
      };
    }
    return {
      titleKey: "headings.leadsPortal.title",
      descriptionKey: "headings.leadsPortal.description",
      icon: "User",
    };
  }

  switch (path) {
    case "/dashboard":
      return {
        titleKey:
          role === "super_admin"
            ? "headings.superAdminDashboard.title"
            : "headings.dashboard.title",
        descriptionKey:
          role === "super_admin"
            ? "headings.superAdminDashboard.description"
            : "headings.dashboard.description",
        icon: "LayoutDashboard",
      };
    case "/attendances":
      return {
        titleKey: "headings.attendance.title",
        descriptionKey:
          role === "admin"
            ? "headings.attendance.descriptionAdmin"
            : "headings.attendance.descriptionEmployee",
        icon: "Clock",
      };
    case "/leaves":
      return {
        titleKey: "headings.leave.title",
        descriptionKey:
          role === "admin"
            ? "headings.leave.descriptionAdmin"
            : "headings.leave.descriptionEmployee",
        icon: "CalendarDays",
      };
    case "/departments":
      return {
        titleKey: "headings.departments.title",
        descriptionKey: "headings.departments.description",
        icon: "Briefcase",
      };
    case "/users":
      return {
        titleKey:
          role === "super_admin"
            ? "headings.usersAdmin.title"
            : "headings.usersEmployee.title",
        descriptionKey:
          role === "super_admin"
            ? "headings.usersAdmin.description"
            : "headings.usersEmployee.description",
        icon: "UsersIcon",
      };
    case "/expenses":
      return {
        titleKey: "headings.expenses.title",
        descriptionKey: "headings.expenses.description",
        icon: "LayoutDashboard",
      };
    case "/payrolls":
      return {
        titleKey: "headings.payroll.title",
        descriptionKey: "headings.payroll.description",
        icon: "Wallet",
      };
    case "/notifications":
      return {
        titleKey: "headings.notifications.title",
        descriptionKey: "headings.notifications.description",
        icon: "Bell",
      };
    case "/reports":
      return {
        titleKey: "headings.reports.title",
        descriptionKey: "headings.reports.description",
        icon: "BarChart3",
      };
    case "/setting":
      return {
        titleKey: "headings.setting.title",
        descriptionKey: "headings.setting.description",
        icon: "SettingsIcon",
      };
    case "/companies":
      return {
        titleKey: "headings.companies.title",
        descriptionKey: "headings.companies.description",
        icon: "Building2",
      };
    default:
      return {
        titleKey: "headings.dashboard.title",
        descriptionKey: "headings.dashboard.description",
        icon: "LayoutDashboard",
      };
  }
}