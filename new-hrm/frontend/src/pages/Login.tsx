import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Briefcase, User, Shield, Users, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import axios from "axios";
import { Helmet } from "react-helmet-async";

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roles: { role: UserRole; label: string; icon: React.ElementType; color: string }[] = [
    { role: 'super_admin', label: 'Super Admin', icon: Shield, color: 'bg-primary' },
    { role: 'admin', label: 'Admin', icon: Users, color: 'bg-info' },
    { role: 'employee', label: 'Employee', icon: User, color: 'bg-success' },
  ];
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email || !password || !selectedRole) {
    toast({
      title: "Error",
      description: "Please fill all the fields",
    });
    return;
  }

  try {
    // ✅ FIX 1: type issue solve
    const res: any = await login(email, password, selectedRole);

    if (res?.accessToken) {

      // ✅ token ensure (safety)
      localStorage.setItem("accessToken", res.accessToken);

        axios.defaults.headers.common["Authorization"] = `Bearer ${res.accessToken}`;

      // ✅ FIX 2: wait for interceptor + context
      await new Promise((resolve) => setTimeout(resolve, 150));

      // ✅ redirect AFTER token ready
      navigate("/dashboard");

      // cleanup
      setEmail("");
      setPassword("");

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    }

  } catch (error: any) {
    toast({
      title: "Login Failed",
      description:
        error?.response?.data?.message ||
        error.message ||
        "Something went wrong",
      variant: "destructive",
    });
  }
};

  return (
  <>
    <Helmet>
      <title>Employee Login</title>
      <meta
        name="description"
        content="Employee login page for Xntrova HRMS"
      />
    </Helmet>

    <div className="min-h-screen bg-[#0a0f1c] flex overflow-hidden">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#111827]">

        {/* BACKGROUND EFFECT */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%)]" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-14">

          {/* TOP */}
          <div>

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl">
                <Briefcase className="h-7 w-7 text-blue-400" />
              </div>

              <div>

                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Xntrova HRMS
                </h1>

                <p className="text-sm text-slate-400">
                  Enterprise Workforce Platform
                </p>

              </div>

            </div>

            {/* HERO */}
            <div className="mt-24 max-w-2xl">

              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-xl">
                Workforce Management Intelligence
              </div>

              <h2 className="mt-8 text-6xl font-bold leading-[1.05] tracking-tight text-white">
                Work smarter with centralized HR operations.
              </h2>

              <p className="mt-8 text-lg leading-8 text-slate-400">
                Attendance, payroll, leaves, employees, analytics and
                operational workflows — unified in one intelligent workspace.
              </p>

            </div>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-5">

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm text-slate-400">
                Companies
              </p>

              <h3 className="mt-3 text-3xl font-bold text-white">
                120+
              </h3>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm text-slate-400">
                Employees
              </p>

              <h3 className="mt-3 text-3xl font-bold text-white">
                25K+
              </h3>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm text-slate-400">
                Productivity
              </p>

              <h3 className="mt-3 text-3xl font-bold text-white">
                +92%
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
                Enterprise Workforce Platform
              </p>

            </div>

          </div>

          {/* LOGIN CARD */}
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">

            <div className="mb-8">

              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Welcome Back
              </h2>

              <p className="mt-3 text-base text-slate-500">
                Login to access your HRMS workspace and daily operations.
              </p>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

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
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
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


              {/* LOGIN BUTTON */}
              <Button
                type="submit"
                disabled={
                  loading ||
                  !email ||
                  !password ||
                  !selectedRole
                }
                className="h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white transition-all hover:bg-slate-800"
              >

                {loading ? (
                  <>
                    <Loader className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Access Workspace"
                )}

              </Button>

            </form>

            {/* FOOTER */}
            <div className="mt-8 border-t border-slate-100 pt-6">

              <div className="flex items-center justify-between text-sm text-slate-500">

                <span>
                  Secure enterprise authentication
                </span>

                <span>
                  HRMS v2.0
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

export default Login;
