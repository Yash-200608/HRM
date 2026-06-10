import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiDataCard } from "@/ai/services/aiService";
import { getToolDisplayLabel } from "@/ai/lib/aiDisplayLabels";
import { AlertTriangle, TrendingDown, Users } from "lucide-react";

interface AIDataCardViewProps {
  card: AiDataCard;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${value}%`;
}

function formatMonthLabel(period?: {
  monthName?: string;
  monthKey?: string;
  year?: number;
}) {
  if (!period) {
    return "This period";
  }
  if (period.monthName && period.year) {
    return `${period.monthName.charAt(0).toUpperCase()}${period.monthName.slice(1)} ${period.year}`;
  }
  return period.monthKey || "This period";
}

function formatDateRange(from?: string, to?: string) {
  if (!from && !to) {
    return "—";
  }
  if (from && to && from !== to) {
    return `${from} to ${to}`;
  }
  return from || to || "—";
}

function riskBadgeVariant(level?: string): "destructive" | "secondary" | "outline" {
  const normalized = (level || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "destructive";
  }
  if (normalized === "medium") {
    return "secondary";
  }
  return "outline";
}

function AttendanceCard({ payload }: { payload: Record<string, unknown> }) {
  const period = payload.period as {
    monthName?: string;
    monthKey?: string;
    year?: number;
  } | undefined;
  const threshold = Number(payload.threshold ?? 80);
  const summary = payload.organizationSummary as {
    totalEmployees?: number;
    averageAttendancePercentage?: number;
    employeesBelowThreshold?: number;
  } | undefined;
  const employees = (payload.employeesBelowThreshold as Array<{
    employeeName?: string;
    department?: string;
    attendancePercentage?: number;
  }>) || [];
  const departments = (payload.departmentBreakdown as Array<{
    department?: string;
    employeeCount?: number;
    averageAttendancePercentage?: number;
  }>) || [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {formatMonthLabel(period)} · employees below {threshold}% attendance
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <StatBox label="Total employees" value={summary?.totalEmployees ?? 0} />
        <StatBox
          label="Average attendance"
          value={formatPercent(summary?.averageAttendancePercentage)}
        />
        <StatBox
          label={`Below ${threshold}%`}
          value={summary?.employeesBelowThreshold ?? employees.length}
        />
      </div>

      {employees.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={`${employee.employeeName}-${employee.department}`}>
                  <TableCell className="font-medium">{employee.employeeName || "—"}</TableCell>
                  <TableCell>{employee.department || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(employee.attendancePercentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No employees are below the threshold.</p>
      )}

      {departments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            By department
          </p>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => (
              <Badge key={dept.department} variant="secondary">
                {dept.department}: {formatPercent(dept.averageAttendancePercentage)} avg (
                {dept.employeeCount} people)
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PendingLeavesCard({ payload }: { payload: Record<string, unknown> }) {
  const requests = (payload.requests as Array<{
    employeeName?: string;
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
    totalDays?: number;
  }>) || [];
  const total = Number(payload.totalPending ?? requests.length);

  if (!requests.length) {
    return <p className="text-sm text-muted-foreground">No pending leave requests right now.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{total} request(s) waiting for approval</p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request, index) => (
              <TableRow key={`${request.employeeName}-${index}`}>
                <TableCell className="font-medium">{request.employeeName || "—"}</TableCell>
                <TableCell>{request.leaveType || "—"}</TableCell>
                <TableCell>{formatDateRange(request.fromDate, request.toDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{request.totalDays ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AttritionRiskCard({ payload }: { payload: Record<string, unknown> }) {
  const summary = payload.summary as {
    atRiskCount?: number;
    criticalCount?: number;
  } | undefined;
  const employees = (payload.atRiskEmployees as Array<{
    employeeName?: string;
    riskScore?: number;
    riskLevel?: string;
    indicators?: string[];
  }>) || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          <Users className="mr-1 h-3 w-3" />
          {summary?.atRiskCount ?? employees.length} at risk
        </Badge>
        {(summary?.criticalCount ?? 0) > 0 ? (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {summary?.criticalCount} critical
          </Badge>
        ) : null}
      </div>

      {employees.length ? (
        <div className="space-y-2">
          {employees.slice(0, 8).map((employee) => (
            <div key={employee.employeeName} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{employee.employeeName}</p>
                <Badge variant={riskBadgeVariant(employee.riskLevel)}>
                  {employee.riskLevel || "At risk"} · score {employee.riskScore ?? "—"}
                </Badge>
              </div>
              {employee.indicators?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {employee.indicators.map((indicator) => (
                    <li key={indicator}>{indicator}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No elevated attrition risk detected.</p>
      )}
    </div>
  );
}

function EmployeeListCard({
  title,
  employees,
  nameKey = "employeeName",
  extraKey,
}: {
  title: string;
  employees: Array<Record<string, unknown>>;
  nameKey?: string;
  extraKey?: string;
}) {
  if (!employees.length) {
    return <p className="text-sm text-muted-foreground">No {title.toLowerCase()} to show.</p>;
  }

  return (
    <div className="space-y-2">
      {employees.slice(0, 10).map((employee, index) => (
        <div key={`${String(employee[nameKey])}-${index}`} className="rounded-md border p-3 text-sm">
          <p className="font-medium">{String(employee[nameKey] || "—")}</p>
          {extraKey && employee[extraKey] != null ? (
            <p className="text-muted-foreground">{String(employee[extraKey])}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function GenericInsightCard({ payload }: { payload: Record<string, unknown> }) {
  const message = typeof payload.message === "string" ? payload.message : null;
  const summary = payload.summary as Record<string, unknown> | undefined;

  if (message && !summary) {
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  const entries = summary
    ? Object.entries(summary).filter(([, value]) => value != null && value !== "")
    : [];

  if (entries.length) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <StatBox
            key={key}
            label={key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
            value={String(value)}
          />
        ))}
      </div>
    );
  }

  const listKeys = ["employees", "requests", "anomalies", "recommendations", "departments"];
  for (const key of listKeys) {
    const list = payload[key];
    if (Array.isArray(list) && list.length && typeof list[0] === "object") {
      return (
        <EmployeeListCard
          title={key}
          employees={list as Array<Record<string, unknown>>}
          nameKey={
            "employeeName" in list[0]
              ? "employeeName"
              : "name" in list[0]
                ? "name"
                : "title" in list[0]
                  ? "title"
                  : Object.keys(list[0])[0]
          }
        />
      );
    }
  }

  return (
    <p className="text-sm text-muted-foreground">
      <TrendingDown className="mr-1 inline h-4 w-4" />
      Results are included in the summary above.
    </p>
  );
}

function renderCardBody(type: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return <p className="text-sm text-muted-foreground">No additional details available.</p>;
  }

  const data = payload as Record<string, unknown>;

  switch (type) {
    case "getAttendanceSummary":
      return <AttendanceCard payload={data} />;
    case "getPendingLeaves":
      return <PendingLeavesCard payload={data} />;
    case "getAttritionRisk":
      return <AttritionRiskCard payload={data} />;
    case "getBurnoutRisk":
      return <AttritionRiskCard payload={{ ...data, atRiskEmployees: data.atRiskEmployees || data.employees }} />;
    case "getTeamPerformanceSummary":
    case "getDepartmentPayrollCost":
    case "getPayrollAnomalies":
    case "getSeatUtilization":
    case "getEmployeeProfileSummary":
      return <GenericInsightCard payload={data} />;
    default:
      if ("employeesBelowThreshold" in data) {
        return <AttendanceCard payload={data} />;
      }
      if ("requests" in data && "totalPending" in data) {
        return <PendingLeavesCard payload={data} />;
      }
      if ("atRiskEmployees" in data) {
        return <AttritionRiskCard payload={data} />;
      }
      return <GenericInsightCard payload={data} />;
  }
}

export default function AIDataCardView({ card }: AIDataCardViewProps) {
  const title =
    card.title && card.title !== card.type
      ? card.title
      : getToolDisplayLabel(card.type);

  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {renderCardBody(card.type, card.payload)}
    </div>
  );
}