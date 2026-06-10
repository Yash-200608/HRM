import { useEffect } from "react";
import axios from "axios";
import { Loader } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/redux-toolkit/hooks/hook";
import { getLoginUser } from "@/redux-toolkit/slice/allPage/loginUserSlice";

const oauthErrorMessages: Record<string, string> = {
  account_inactive: "Your account is inactive. Please contact your administrator.",
  account_not_found: "No HRMS account exists for this email address.",
  google_oauth_not_configured: "Google login is not configured.",
  invalid_oauth_state: "The sign-in session expired. Please try again.",
  microsoft_oauth_not_configured: "Microsoft login is not configured.",
  oauth_cancelled: "Sign-in was cancelled.",
  oauth_link_failed: "OAuth account linking failed. Please try again.",
  oauth_login_failed: "OAuth sign-in failed. Please try again.",
};

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast({
        title: "Login Failed",
        description: oauthErrorMessages[error] || "OAuth sign-in failed. Please try again.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }

    const linked = searchParams.get("linked");
    if (linked) {
      toast({
        title: "Account Linked",
        description: `${linked.charAt(0).toUpperCase()}${linked.slice(1)} account linked successfully.`,
      });
      navigate("/dashboard", { replace: true });
      return;
    }

    const completeLogin = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/oauth/session`, {
          withCredentials: true,
        });

        const user = res?.data?.user;

        if (!user) {
          throw new Error("Invalid OAuth session");
        }

        localStorage.removeItem("accessToken");
        localStorage.setItem("user", JSON.stringify(user));
        delete axios.defaults.headers.common["Authorization"];
        dispatch(getLoginUser(user));

        toast({
          title: "Login Successfully.",
          description: res?.data?.message || "Welcome back.",
        });
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        toast({
          title: "Login Failed",
          description: err?.response?.data?.message || err?.message || "OAuth sign-in failed.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    };

    completeLogin();
  }, [dispatch, navigate, searchParams, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-700 shadow-sm">
        <Loader className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Completing sign-in...</span>
      </div>
    </div>
  );
};

export default OAuthCallback;
