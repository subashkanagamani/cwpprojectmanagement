import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { formatError } from "../utils/errorFormatter";
import { validators } from "../utils/formValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailError = validators.email(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(formatError(resetError));
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="forgot-password-success">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a reset link to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <Button onClick={() => setLocation("/")} className="w-full" data-testid="button-back-login">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="forgot-password-page">
      <div className="w-full max-w-sm space-y-6">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-back-login"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </button>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" data-testid="text-error">
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

          <Button type="submit" disabled={loading} className="w-full" data-testid="button-submit">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send reset link
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
