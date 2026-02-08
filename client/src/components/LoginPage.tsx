import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Building2, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { formatError } from "../utils/errorFormatter";
import { validators, getPasswordStrength } from "../utils/formValidation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="min-h-screen bg-background flex" data-testid="login-page">
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">ClientFlow</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Manage your clients with confidence
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Weekly reporting, health monitoring, budget tracking, and team workload management — all in one place.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "Real-time client health scoring",
              "Automated weekly report workflows",
              "Team capacity and workload insights",
              "Budget tracking and forecasting",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-xl font-semibold tracking-tight">ClientFlow</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-auth-title">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Enter your details to get started"
                : "Sign in to your account to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                data-testid="text-auth-error"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
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
                  placeholder={isSignUp ? "Create a password" : "Enter your password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="pr-10"
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
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Strength</span>
                    <span className={`text-xs font-medium ${strengthColor}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress value={strengthProgress} className="h-1" />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
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
            <Separator />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-medium text-primary hover:underline"
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
