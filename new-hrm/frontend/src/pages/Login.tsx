import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Briefcase, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import axios from "axios";
import { Helmet } from "react-helmet-async";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { useTranslation } from "react-i18next";

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !selectedRole) {
      toast({
        title: t("common.error"),
        description: t("common.fillAllFields"),
      });
      return;
    }

    try {
      const res: any = await login(email, password, selectedRole);

      if (res?.user) {
        localStorage.removeItem("accessToken");
        delete axios.defaults.headers.common["Authorization"];
        await new Promise((resolve) => setTimeout(resolve, 150));
        navigate("/dashboard");
        setEmail("");
        setPassword("");

        toast({
          title: t("login.loginSuccess"),
          description: t("login.welcomeBackToast"),
        });
      }
    } catch (error: any) {
      toast({
        title: t("login.loginFailed"),
        description:
          error?.response?.data?.message ||
          error.message ||
          t("common.somethingWentWrong"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("login.pageTitle")}</title>
        <meta name="description" content={t("login.metaDescription")} />
      </Helmet>

      <div className="min-h-screen bg-[#0a0f1c] flex overflow-hidden">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#111827]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%)]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-14">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl">
                  <Briefcase className="h-7 w-7 text-blue-400" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {t("login.brandName")}
                  </h1>
                  <p className="text-sm text-slate-400">
                    {t("login.brandTagline")}
                  </p>
                </div>
              </div>

              <div className="mt-24 max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-xl">
                  {t("login.heroBadge")}
                </div>

                <h2 className="mt-8 text-6xl font-bold leading-[1.05] tracking-tight text-white">
                  {t("login.heroTitle")}
                </h2>

                <p className="mt-8 text-lg leading-8 text-slate-400">
                  {t("login.heroDescription")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-400">{t("login.statCompanies")}</p>
                <h3 className="mt-3 text-3xl font-bold text-white">120+</h3>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-400">{t("login.statEmployees")}</p>
                <h3 className="mt-3 text-3xl font-bold text-white">25K+</h3>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-400">{t("login.statProductivity")}</p>
                <h3 className="mt-3 text-3xl font-bold text-white">+92%</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-[#f8fafc] p-6 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-4 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Briefcase className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {t("login.brandName")}
                </h1>
                <p className="text-sm text-slate-500">
                  {t("login.brandTagline")}
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
              <div className="mb-8">
                <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                  {t("login.welcomeBack")}
                </h2>
                <p className="mt-3 text-base text-slate-500">
                  {t("login.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    {t("login.emailAddress")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("login.emailPlaceholder")}
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    {t("login.password")}
                  </Label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("login.passwordPlaceholder")}
                      disabled={loading}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email || !password || !selectedRole}
                  className="h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white transition-all hover:bg-slate-800"
                >
                  {loading ? (
                    <>
                      <Loader className="mr-2 h-5 w-5 animate-spin" />
                      {t("login.signingIn")}
                    </>
                  ) : (
                    t("login.accessWorkspace")
                  )}
                </Button>

                <OAuthButtons disabled={loading} role="employee" />
              </form>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{t("login.secureAuth")}</span>
                  <span>{t("login.version")}</span>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              {t("login.copyright")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;