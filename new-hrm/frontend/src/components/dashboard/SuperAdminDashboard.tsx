import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  FolderKanban,
  Globe,
  History,
  MapPin,
  Phone,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCompanysByDashboard } from "@/services/Service";
import { formatDate } from "@/services/allFunctions";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import {
  getCompany,
  getRecentActivities,
} from "@/redux-toolkit/slice/allPage/companySlice";
import { Company } from "@/types";

const SuperAdminCompanyCard: React.FC<{
  company: Company;
  onOpen: () => void;
}> = ({ company, onOpen }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
              {company.name?.charAt(0)}
            </div>
          )}

          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">
              {company.name}
            </h3>
            <p className="truncate text-sm text-slate-500">
              {t("superAdminDashboard.adminLabel")}:{" "}
              {Array.isArray(company.adminNames)
                ? company.adminNames[0]
                : company.adminNames || t("superAdminDashboard.noAdmin")}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            company.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {company.isActive
            ? t("superAdminDashboard.active")
            : t("superAdminDashboard.inactive")}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <Users className="h-4 w-4 text-violet-600" />
          <span>{company.totalEmployees || 0}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <FolderKanban className="h-4 w-4 text-orange-600" />
          <span>{company.totalProjects || 0}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 truncate rounded-2xl bg-slate-50 px-3 py-2">
          <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="truncate">{company.address || "—"}</span>
        </div>
        {company.contactNumber && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
            <Phone className="h-4 w-4 text-slate-500" />
            <span className="truncate">{company.contactNumber}</span>
          </div>
        )}
        {company.website && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
            <Globe className="h-4 w-4 text-slate-500" />
            <span className="truncate">{company.website}</span>
          </div>
        )}
      </div>
    </button>
  );
};

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const companyList = useAppSelector((state) => state.company.company);
  const recentActivities = useAppSelector(
    (state) => state.company.recentActivities,
  );

  const stats = useMemo(() => {
    const companies = companyList || [];
    const activeCompanies = companies.filter((c) => c.isActive !== false).length;
    const totalEmployees = companies.reduce(
      (sum, c) => sum + (Number(c.totalEmployees) || 0),
      0,
    );
    const totalProjects = companies.reduce(
      (sum, c) => sum + (Number(c.totalProjects) || 0),
      0,
    );
    const totalAdmins = companies.reduce(
      (sum, c) => sum + (c.admins?.length || (c.adminNames ? 1 : 0)),
      0,
    );

    return {
      totalCompanies: companies.length,
      activeCompanies,
      totalEmployees,
      totalProjects,
      totalAdmins,
    };
  }, [companyList]);

  const loadDashboard = async () => {
    if (!user?._id || user.role !== "super_admin") return;

    try {
      const res = await getCompanysByDashboard(user._id);
      if (res.status === 200) {
        dispatch(getCompany(res.data?.companies || []));
        dispatch(getRecentActivities(res.data?.recentActivities || []));
      }
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err?.message || err?.response?.data?.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (
      user?.role === "super_admin" &&
      (companyList.length === 0 || recentActivities.length === 0)
    ) {
      loadDashboard();
    }
  }, [user?._id, user?.role]);

  const quickActions = [
    {
      label: t("superAdminDashboard.manageCompanies"),
      icon: Building2,
      color: "text-blue-600",
      path: "/companies",
    },
    {
      label: t("superAdminDashboard.manageAdmins"),
      icon: Users,
      color: "text-violet-600",
      path: "/users",
    },
    {
      label: t("superAdminDashboard.platformRevenue"),
      icon: Wallet,
      color: "text-emerald-600",
      path: "/platform-revenue",
    },
    {
      label: t("superAdminDashboard.platformOps"),
      icon: Wrench,
      color: "text-orange-600",
      path: "/platform-ops",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-indigo-50 opacity-70 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <Activity className="h-4 w-4 text-indigo-600" />
              {t("superAdminDashboard.badge")}
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
              {t("superAdminDashboard.welcome")}
            </h1>

            <h2 className="mt-2 text-3xl font-bold text-slate-700 md:text-4xl">
              {user?.username || user?.fullName}
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-slate-500">
              {t("superAdminDashboard.subtitle")}
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {t("superAdminDashboard.today")}
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                {new Date().toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                })}
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                {t("superAdminDashboard.platformStatus")}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-600">
                  {t("superAdminDashboard.operational")}
                </span>
              </div>
            </div>

            <div className="col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <TrendingUp className="h-4 w-4" />
                {t("superAdminDashboard.growth")}
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {t("superAdminDashboard.growthDesc", {
                  count: stats.activeCompanies,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("superAdminDashboard.totalCompanies"),
            value: stats.totalCompanies,
            icon: Building2,
            tone: "bg-blue-50 text-blue-600",
          },
          {
            label: t("superAdminDashboard.activeTenants"),
            value: stats.activeCompanies,
            icon: ShieldCheck,
            tone: "bg-emerald-50 text-emerald-600",
          },
          {
            label: t("superAdminDashboard.totalEmployees"),
            value: stats.totalEmployees,
            icon: Users,
            tone: "bg-violet-50 text-violet-600",
          },
          {
            label: t("superAdminDashboard.totalProjects"),
            value: stats.totalProjects,
            icon: FolderKanban,
            tone: "bg-orange-50 text-orange-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <h2 className="mt-3 text-4xl font-black text-slate-900">
                  {item.value}
                </h2>
              </div>
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.tone}`}
              >
                <item.icon className="h-7 w-7" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
          <h3 className="text-xl font-bold text-slate-900">
            {t("superAdminDashboard.quickActions")}
          </h3>

          <div className="mt-6 space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 transition-all hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="font-medium text-slate-800">
                    {action.label}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-3">
          <Card className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900">
                {t("superAdminDashboard.companiesOverview")}
              </CardTitle>
              <button
                type="button"
                onClick={() => navigate("/companies")}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t("superAdminDashboard.viewAll")}
              </button>
            </CardHeader>

            <CardContent>
              {companyList.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {companyList.slice(0, 4).map((company) => (
                    <SuperAdminCompanyCard
                      key={company._id}
                      company={company}
                      onOpen={() => navigate("/companies")}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  {t("superAdminDashboard.noCompanies")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <History className="h-5 w-5 text-indigo-600" />
                {t("superAdminDashboard.recentActivity")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.slice(0, 8).map((item) => (
                    <div
                      key={item._id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.companyId?.name} · {item.createdBy?.username}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatDate(item.date || item.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center text-slate-400">
                  {t("superAdminDashboard.noActivity")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;