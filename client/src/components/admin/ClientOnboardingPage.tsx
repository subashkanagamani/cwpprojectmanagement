import { useState, useEffect, useCallback } from "react";
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  ChevronRight,
} from "lucide-react";

const ONBOARDING_STEPS = [
  { key: "initial_meeting", label: "Initial meeting completed" },
  { key: "contract_signed", label: "Contract signed" },
  { key: "services_configured", label: "Services configured" },
  { key: "team_assigned", label: "Team assigned" },
  { key: "access_credentials", label: "Access credentials shared" },
  { key: "report_template", label: "First report template created" },
  { key: "kickoff_call", label: "Kickoff call scheduled" },
  { key: "portal_access", label: "Portal access set up" },
] as const;

type StepKey = (typeof ONBOARDING_STEPS)[number]["key"];

interface OnboardingData {
  steps: Record<StepKey, boolean>;
  started_at: string | null;
  completed_at: string | null;
}

interface ClientRow {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  created_at: string;
  custom_fields: Record<string, unknown> | null;
}

function getDefaultSteps(): Record<StepKey, boolean> {
  return ONBOARDING_STEPS.reduce(
    (acc, step) => ({ ...acc, [step.key]: false }),
    {} as Record<StepKey, boolean>
  );
}

function getOnboarding(client: ClientRow): OnboardingData {
  const cf = client.custom_fields as Record<string, unknown> | null;
  const ob = cf?.onboarding as Partial<OnboardingData> | undefined;
  return {
    steps: { ...getDefaultSteps(), ...(ob?.steps || {}) },
    started_at: ob?.started_at || null,
    completed_at: ob?.completed_at || null,
  };
}

function getCompletionPercent(onboarding: OnboardingData): number {
  const total = ONBOARDING_STEPS.length;
  const done = ONBOARDING_STEPS.filter((s) => onboarding.steps[s.key]).length;
  return Math.round((done / total) * 100);
}

type FilterType = "all" | "in_progress" | "completed";

export function ClientOnboardingPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [saving, setSaving] = useState<string | null>(null);
  const toast = useToast();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, industry, status, created_at, custom_fields")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const filtered = (data || []).filter((c: ClientRow) => {
        const createdRecently = new Date(c.created_at) >= ninetyDaysAgo;
        const onboarding = getOnboarding(c);
        const isIncomplete = getCompletionPercent(onboarding) < 100;
        return createdRecently || isIncomplete;
      });

      setClients(filtered);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load clients";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const toggleStep = async (client: ClientRow, stepKey: StepKey) => {
    setSaving(client.id);
    try {
      const onboarding = getOnboarding(client);
      const newSteps = { ...onboarding.steps, [stepKey]: !onboarding.steps[stepKey] };
      const anyChecked = Object.values(newSteps).some(Boolean);
      const allChecked = Object.values(newSteps).every(Boolean);

      const newOnboarding: OnboardingData = {
        steps: newSteps,
        started_at: anyChecked ? onboarding.started_at || new Date().toISOString().split("T")[0] : onboarding.started_at,
        completed_at: allChecked ? new Date().toISOString().split("T")[0] : null,
      };

      const existingCf = (client.custom_fields || {}) as Record<string, unknown>;
      const newCustomFields = { ...existingCf, onboarding: newOnboarding };

      const { error } = await (supabase
        .from("clients") as any)
        .update({ custom_fields: newCustomFields })
        .eq("id", client.id);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id ? { ...c, custom_fields: newCustomFields } : c
        )
      );

      if (allChecked) {
        toast.success(`${client.name} onboarding completed!`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update step";
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const onboarding = getOnboarding(c);
    const percent = getCompletionPercent(onboarding);

    if (filter === "completed") return percent === 100;
    if (filter === "in_progress") return percent > 0 && percent < 100;
    return true;
  });

  const stats = {
    total: clients.length,
    inProgress: clients.filter((c) => {
      const p = getCompletionPercent(getOnboarding(c));
      return p > 0 && p < 100;
    }).length,
    completed: clients.filter(
      (c) => getCompletionPercent(getOnboarding(c)) === 100
    ).length,
    avgPercent:
      clients.length > 0
        ? Math.round(
            clients.reduce(
              (sum, c) => sum + getCompletionPercent(getOnboarding(c)),
              0
            ) / clients.length
          )
        : 0,
  };

  const statCards = [
    {
      label: "Total Onboarding",
      value: stats.total,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      label: "Avg Completion %",
      value: `${stats.avgPercent}%`,
      icon: ClipboardCheck,
      gradient: "from-violet-500 to-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Onboarding</h1>
            <p className="text-sm text-muted-foreground">Track onboarding progress for new clients</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 animate-fade-up">
        <ClipboardCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Onboarding</h1>
          <p className="text-sm text-muted-foreground">Track onboarding progress for new clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="stat-card-gradient animate-fade-up overflow-hidden"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "in_progress", "completed"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "in_progress" ? "In Progress" : "Completed"}
            </Button>
          ))}
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <Card className="animate-fade-up" style={{ animationDelay: "400ms" }}>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No clients found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search ? "Try adjusting your search" : "No clients match the current filter"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClients.map((client, i) => {
            const onboarding = getOnboarding(client);
            const percent = getCompletionPercent(onboarding);
            const isComplete = percent === 100;
            const isSaving = saving === client.id;

            return (
              <Card
                key={client.id}
                className="hover-elevate animate-fade-up transition-all"
                style={{ animationDelay: `${400 + i * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{client.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {client.industry || "No industry"} · Added{" "}
                          {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                      {isComplete ? "Complete" : `${percent}%`}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Progress</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {ONBOARDING_STEPS.map((step) => {
                      const checked = onboarding.steps[step.key];
                      return (
                        <label
                          key={step.key}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            checked
                              ? "bg-emerald-50 dark:bg-emerald-950/20"
                              : "hover:bg-muted/50"
                          } ${isSaving ? "opacity-60 pointer-events-none" : ""}`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleStep(client, step.key)}
                            disabled={isSaving}
                          />
                          <span
                            className={`text-sm flex-1 ${
                              checked
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {step.label}
                          </span>
                          {checked && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {onboarding.started_at && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Started {new Date(onboarding.started_at).toLocaleDateString()}</span>
                      {onboarding.completed_at && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Completed {new Date(onboarding.completed_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
