import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Briefcase, Users, Loader, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';
import { useAppDispatch } from '@/redux-toolkit/hooks/hook';
import {loginSuperAdmin} from "@/services/Service";
import {getLoginUser} from "@/redux-toolkit/slice/allPage/loginUserSlice";

 
const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill all the fields",
      });
      return;
    }
       setIsLoading(true);
    try {
      const res = await loginSuperAdmin(email, password); // Admin role hardcoded
      if (res.status === 200) {
              toast({
                title: "Login Successfully.",
                description: `${res?.data?.message}`,
              });
              localStorage.setItem('accessToken', res?.data?.accessToken);
              localStorage.setItem('user', JSON.stringify(res?.data?.user));
              // setUser(res?.data?.user);
              dispatch(getLoginUser(res?.data?.user))
            }
            else {
              toast({
                title: "Error",
                description: res?.data?.message || "Something went wrong",
                variant: "destructive",
              });
            }
    } catch (error: any) {
      console.log(error);
      toast({
        title: "Login Failed",
        description: error?.response?.data?.message || error.message || "Something went wrong",
        variant:"destructive"
      });
    }finally{
        setIsLoading(false);
    }
  };

  return (
  <>
    <Helmet>
      <title>Super Admin Login</title>
      <meta
        name="description"
        content="Super Admin login page for Xntrova Technologies"
      />
    </Helmet>

    <div className="min-h-screen bg-[#0a0a0a] text-white flex overflow-hidden">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative border-r border-white/10 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_40%)]" />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">

          {/* TOP */}
          <div>

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl">
                <Briefcase className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Xntrova HRMS
                </h1>

                <p className="text-sm text-slate-400">
                  Enterprise Workforce Platform
                </p>
              </div>

            </div>

            <div className="mt-24 max-w-xl">

              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-xl">
                Workforce Intelligence Platform
              </div>

              <h2 className="mt-8 text-6xl font-bold leading-[1.05] tracking-tight">
                Manage your workforce intelligently.
              </h2>

              <p className="mt-8 text-lg leading-8 text-slate-400">
                Unified HRMS platform for attendance, employee management,
                payroll, leaves, analytics and operational productivity.
              </p>

            </div>

          </div>

          {/* BOTTOM STATS */}
          <div className="grid grid-cols-3 gap-5">

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm text-slate-400">
                Active Companies
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                120+
              </h3>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm text-slate-400">
                Employees Managed
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                25K+
              </h3>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm text-slate-400">
                Uptime
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                99.9%
              </h3>
            </div>

          </div>

        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="flex w-full items-center justify-center bg-[#f8fafc] p-6 lg:w-1/2">

        <div className="w-full max-w-md">

          {/* MOBILE LOGO */}
          <div className="mb-10 flex items-center gap-4 lg:hidden">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Briefcase className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Xntrova HRMS
              </h1>

              <p className="text-sm text-slate-500">
                Enterprise HR Platform
              </p>
            </div>

          </div>

          {/* LOGIN CARD */}
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">

            <div className="mb-8">

              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Super Admin Login
              </h2>

              <p className="mt-3 text-base text-slate-500">
                Access centralized operational controls and enterprise analytics.
              </p>

            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* EMAIL */}
              <div className="space-y-3">

                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email Address
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50 px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500"
                />

              </div>

              {/* PASSWORD */}
              <div className="space-y-3">

                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </Label>

                <div className="relative">

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>

                </div>

              </div>

              {/* BUTTON */}
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !email ||
                  !password
                }
                className="h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white transition-all hover:bg-slate-800"
              >

                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Access Dashboard"
                )}

              </Button>

            </form>

            {/* FOOTER */}
            <div className="mt-8 border-t border-slate-100 pt-6">

              <div className="flex items-center justify-between text-sm text-slate-500">

                <span>
                  Enterprise secured authentication
                </span>

                <span>
                  v2.0 HRMS
                </span>

              </div>

            </div>

          </div>

          {/* COPYRIGHT */}
          <p className="mt-8 text-center text-sm text-slate-500">
            © 2026 Xntrova Technologies. All rights reserved.
          </p>

        </div>

      </div>

    </div>
  </>
);
};

export default SuperAdminLogin;