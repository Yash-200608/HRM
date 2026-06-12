export type UserRole = 'super_admin' | 'admin' | 'employee';

interface CompanyDetail {
  _id: string;
  name: string;
  logo: string;
}

export interface department {
  _id?: string;
  name:string;
  managers: any[];
}

export interface User {
  _id: string;
  username: string;
  fullName: string;
  profileImage: string;
  name: string;
  email: string;
  phone: string;
  department: department;
  role: UserRole;
  joiningDate: string;
  avatar?: string;
  companyId?: string | CompanyDetail;
  createdBy?: string | CompanyDetail;
  taskRole?: string;
  taskRoleStatus?: string;
  taskRoleDescription?: string;
  entitlements?: string[];
  subscriptionPlan?: string | null;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  createdAt: string;
}


export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deadline: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  totalHours?: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: 'sick' | 'casual' | 'annual' | 'emergency';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedBy?: string;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
}

export interface SalarySlip {
  id: string;
  userId: string;
  month: string;
  year: number;
  basic: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  generatedAt: string;
}



export interface SubTask {
  id: number;
  title: string;
  name: string;
  description: string;
  parentTask: string;
  startDate: string;
  endDate: string;
  assignedTo: string;
  priority: "Low" | "Medium" | "High";
  status: Status;
  notes: string;
}

export type Status = "Pending" | "In-Progress" | "Completed" | "Blocked" | "Overdue" |"Overtime";

export type ModalType = "view" | "edit" | "statusChange" | null;


export interface SubTaskFormData {
  _id?: string;
  taskId?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  employee?: string;
  priority?: Priority;
  remarks?: string;
}

export interface SubTaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  setSubTaskListRefresh: (value: boolean) => void;
  taskId: string;
}

interface createdBy {
  _id: string;
  username: string;
  fullName: string;
}

// types/notification.d.ts
export interface Notification {
  _id: string;
  userId: string;
  message: string;
  type: string;
  referenceId?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: createdBy
}




export interface AttendanceItem {
  _id: string;
  attendanceDate: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  hoursWorked: number;
  overtime: number;
  status: string;
  isLate?: boolean;
  userId: {
    _id: string;
    fullName: string;
    profileImage: string;
  };
}

export interface Props {
  attendanceRefresh: boolean; // trigger refresh from parent
  setAttendanceRefresh: (value: boolean) => void; // function to update refresh state
}
export const months = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];






export interface TaskFormData {
  _id?: string;
  projectId?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  manager?: string;
  priority?: Priority;
  status?: Status;
  remarks?: string;
}

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  setTaskListRefresh: (value: boolean) => void;
  projectId: string;
}


export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectFormData {
  _id?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: Priority;
  remarks?: string;
  status?: string;
}

export interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ProjectFormData | null;
  setProjectListRefresh: (value: boolean) => void;
}






export interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  isEditMode?: boolean;
  initialData: any;
  setEmployeeListRefresh: (refresh: boolean) => void;
  selectedDepartmentId: string;
}


export interface Department {
  id: string;
  name: string;
  description: string;
  managerId?: string;
  companyId: string;
  employeeCount: number;
}

export interface EmployeeDepartment {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Admins {
  _id: string;
  username: string;
  email: string;
  profileImage: string;
}

export interface Company {
  _id?: string;
  name: string;
  logo?: string;
  contactNumber?: string;
  address: string;
  email: string;
  isActive?: boolean;
  admins?: Admins[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  website?: string;
  totalEmployees?: number;
  location?: string;
  industry?: string;
  totalProjects?: string;
  adminNames?: string;
}

export interface recentActivity {
  _id?: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  date?: string;
  createdBy: {
    _id: string;
    username: string;
    profileImage: string;
  };
  createdByRole: string;
  companyId: {
    _id: string;
    name: string;
  };
}

export interface Admin {
  _id?: string;
  username: string;
  email: string;
  profileImage: string;
  role?: string;
  mobile?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  companyId?: {
    _id?: string;
    name: string;
  };
};


export interface Setting {
  _id?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  department?: department;
  contact?: string;
  fullName?: string;
  role?: string;
  mobile?: string;
  address?: string;
  createdAt?: string;
  joinDate?: string;
  updatedAt?: string;
  companyId?: {
    _id?: string;
    name: string;
  };
}


export interface Attendances {
  _id: string;

  userId?: {
    _id?: string;
    fullName: string;
    profileImage: string;
  };
  createdBy?: {
    _id: string;
    name?: string;
    logo?: string;
  };
  attendanceDate: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  date?: string;
clockIn?: string;
clockOut?: string;
  hoursWorked: number;
  overtime: number;
  status:
    | "Clocked In"
    | "Working"
    | "Absent"
    | "Half Day"
    | "Present"
    | "Overtime"
    | "Holiday";
  isLate: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}


export interface Employees {
  _id?: string;
  fullName: string;
  email: string;
  profileImage: string;
  role?: string;
  contact?: string;
  department?: department;
  createdAt?: string;
  updatedAt?: string;
  status?: "ACTIVE" | "RELIEVED" | "ON_HOLD";
  roleResponsibility?: string;
  taskRoleDescription?: string;
  taskRoleStatus?: string;
  taskRole?: string;
  monthSalary?: string;
  relievingDate?: string;
  joinDate?: string;
  employeeType?: string;
  lpa?: string;
  createdBy?: string;
  designation?: string;
  documents?: {
    aadhaar?: string;
    panCard?: string;
    bankPassbook?: string;
    salarySlips?: string;
  };
  remarks?: string;
}



export interface leaveType {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  maxDaysAllowed: number;
  paid: boolean;
  color: string;
}


export interface leaveRequest {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    profileImage: string;
  };
  leaveType: {
    _id: string;
    name: string;
    color: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  description: string;
  appliedDate: string;
  reviewedBy: string;
}