import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Building2, Eye, EyeOff, ArrowRight, Loader2, Shield, BarChart3, Users, Zap } from "lucide-react";
import { formatError } from "../utils/errorFormatter";
import { validators, getPasswordStrength } from "../utils/formValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();

  const passwordStrength = isSignUp ? getPasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailError = validators.email(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (isSignUp) {
      const passwordError = validators.password(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    } else {
      if (password.length < 1) {
        setError("Password is required");
        return;
      }
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(formatError(error));
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(formatError(error));
      }
    }

    setLoading(false);
  };

  const strengthColor = passwordStrength
    ? passwordStrength.score <= 2
      ? "text-destructive"
      : passwordStrength.score <= 4
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-green-600 dark:text-green-400"
    : "";

  const strengthProgress = passwordStrength
    ? (passwordStrength.score / 6) * 100
    : 0;

  const features = [
    { icon: BarChart3, title: "Real-time Analytics", desc: "Track performance with live dashboards" },
    { icon: Users, title: "Team Management", desc: "Manage workloads and assignments" },
    { icon: Shield, title: "Client Health Scoring", desc: "Monitor satisfaction automatically" },
    { icon: Zap, title: "Automated Reports", desc: "Generate weekly reports instantly" },
  ];

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/10">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">ClientFlow</span>
          </div>

          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white leading-tight">
                Manage your clients with clarity
              </h1>
              <p className="text-blue-100 text-lg leading-relaxed">
                The all-in-one platform for agencies to track projects, manage teams, and deliver exceptional results.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-2"
                  >
                    <Icon className="h-5 w-5 text-blue-200" />
                    <p className="text-sm font-medium text-white">{feature.title}</p>
                    <p className="text-xs text-blue-200/80">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-blue-200/60">
            Trusted by 500+ marketing agencies worldwide
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">ClientFlow</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-auth-title">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground">
              {isSignUp
                ? "Get started with your free account"
                : "Sign in to your workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-start gap-2"
                data-testid="text-auth-error"
              >
                <div className="h-4 w-4 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold">!</span>
                </div>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
                className="h-11"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="pr-10 h-11"
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isSignUp && password && passwordStrength && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Password strength</span>
                    <span className={`text-xs font-medium ${strengthColor}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress value={strengthProgress} className="h-1.5" />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-medium"
              data-testid="button-submit"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create account" : "Sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
              data-testid="link-toggle-auth"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
