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
import {loginAdmin} from "@/services/Service";
import {getLoginUser} from "@/redux-toolkit/slice/allPage/loginUserSlice";
import OAuthButtons from "@/components/auth/OAuthButtons";
import MfaLoginChallenge from "@/components/auth/MfaLoginChallenge";
import { Link } from "react-router-dom";


const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<{
    mfaChallengeToken: string;
    email?: string;
  } | null>(null);

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
      const res = await loginAdmin(email, password);
      if (res.status === 200 && res?.data?.mfaRequired) {
        setMfaChallenge({
          mfaChallengeToken: res.data.mfaChallengeToken,
          email: res.data.email,
        });
        return;
      }
      if (res.status === 200) {
              toast({
                title: "Login Successfully.",
                description: `${res?.data?.message}`,
              });
              localStorage.setItem('accessToken', res?.data?.accessToken);
              localStorage.setItem('user', JSON.stringify(res?.data?.user));
              dispatch(getLoginUser(res?.data?.user))
              navigate("/dashboard");
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
      <title>Admin Login</title>
      <meta
        name="description"
        content="Admin login page for Xntrova Technologies"
      />
    </Helmet>

    <div className="min-h-screen flex bg-[#f4f7fb]">
      
      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#172554] to-[#1e3a8a] text-white p-16 flex-col justify-between">
        
        {/* Blur circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Briefcase className="w-7 h-7 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Xntrova HRM
              </h1>
              <p className="text-blue-100 text-sm">
                Workforce Management Platform
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <h2 className="text-5xl font-bold leading-tight mb-6">
              Manage your workforce smarter & faster.
            </h2>

            <p className="text-lg text-blue-100 leading-8">
              Centralized employee management, attendance, payroll,
              leave tracking, performance monitoring and more —
              all in one intelligent HR platform.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-5 mt-14">
            {[
              "Attendance Tracking",
              "Payroll Automation",
              "Employee Management",
              "Leave Management",
            ].map((item) => (
              <div
                key={item}
                className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur-md"
              >
                <Users className="w-5 h-5 mb-3 text-cyan-300" />
                <p className="font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-blue-100">
          © 2026 Xntrova Technologies. All rights reserved.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
              <Briefcase className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Xntrova HRM
            </h1>

            <p className="text-gray-500 mt-2">
              Workforce Management Platform
            </p>
          </div>

          <div className="bg-white border border-gray-200 shadow-xl rounded-3xl p-8">
            
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back 👋
              </h2>

              <p className="text-gray-500">
                Sign in to access your admin dashboard
              </p>
            </div>

            {mfaChallenge ? (
              <MfaLoginChallenge
                mfaChallengeToken={mfaChallenge.mfaChallengeToken}
                email={mfaChallenge.email}
                onCancel={() => setMfaChallenge(null)}
                onSuccess={({ accessToken, user }) => {
                  toast({ title: "Login successful" });
                  localStorage.setItem("accessToken", accessToken);
                  localStorage.setItem("user", JSON.stringify(user));
                  dispatch(getLoginUser(user));
                  navigate("/dashboard");
                }}
              />
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* EMAIL */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email Address
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="admin@xntrova.com"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </Label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    disabled={isLoading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 rounded-xl border border-gray-300 bg-white px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
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
                disabled={isLoading || !email || !password}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <OAuthButtons disabled={isLoading} role="admin" />
            </form>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Secure access to Xntrova HR Management System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
};

export default AdminLogin;
