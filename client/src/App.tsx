import { useState, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppSidebar } from "./components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { LoginPage } from "./components/LoginPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { ClientPortalView } from "./components/ClientPortalView";
import { ThemeToggle } from "./components/ThemeToggle";
import { NotificationCenter } from "./components/NotificationCenter";
import { OfflineBanner } from "./components/OfflineBanner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { GlobalSearch } from "./components/GlobalSearch";

const EnhancedDashboardPage = lazy(() => import("./components/admin/EnhancedDashboardPage").then(m => ({ default: m.EnhancedDashboardPage })));
const ModernProjectsPage = lazy(() => import("./components/admin/ModernProjectsPage").then(m => ({ default: m.ModernProjectsPage })));
const EnhancedAnalyticsPage = lazy(() => import("./components/admin/EnhancedAnalyticsPage").then(m => ({ default: m.EnhancedAnalyticsPage })));
const ClientsPage = lazy(() => import("./components/admin/ClientsPage").then(m => ({ default: m.ClientsPage })));
const ClientDetailPage = lazy(() => import("./components/admin/ClientDetailPage").then(m => ({ default: m.ClientDetailPage })));
const EmployeesPage = lazy(() => import("./components/admin/EmployeesPage").then(m => ({ default: m.EmployeesPage })));
const EnhancedAssignmentsPage = lazy(() => import("./components/admin/EnhancedAssignmentsPage"));
const ReportsPage = lazy(() => import("./components/admin/ReportsPage").then(m => ({ default: m.ReportsPage })));
const ConsolidatedReportsPage = lazy(() => import("./components/admin/ConsolidatedReportsPage"));
const DealsPage = lazy(() => import("./components/admin/DealsPage"));
const BudgetsManagementPage = lazy(() => import("./components/admin/BudgetsManagementPage"));
const BulkOperationsPage = lazy(() => import("./components/admin/BulkOperationsPage").then(m => ({ default: m.BulkOperationsPage })));
const ClientPortalPage = lazy(() => import("./components/admin/ClientPortalPage").then(m => ({ default: m.ClientPortalPage })));
const ActivityLogsPage = lazy(() => import("./components/admin/ActivityLogsPage").then(m => ({ default: m.ActivityLogsPage })));
const CalendarPage = lazy(() => import("./components/admin/CalendarPage").then(m => ({ default: m.CalendarPage })));
const GoalsPage = lazy(() => import("./components/admin/GoalsPage").then(m => ({ default: m.GoalsPage })));
const TimeTrackingPage = lazy(() => import("./components/admin/TimeTrackingPage").then(m => ({ default: m.TimeTrackingPage })));
const CommunicationHubPage = lazy(() => import("./components/admin/CommunicationHubPage").then(m => ({ default: m.CommunicationHubPage })));
const ResourceManagementPage = lazy(() => import("./components/admin/ResourceManagementPage").then(m => ({ default: m.ResourceManagementPage })));
const ReportApprovalsPage = lazy(() => import("./components/admin/ReportApprovalsPage").then(m => ({ default: m.ReportApprovalsPage })));
const EmailTemplatesPage = lazy(() => import("./components/admin/EmailTemplatesPage").then(m => ({ default: m.EmailTemplatesPage })));
const DashboardCustomizationPage = lazy(() => import("./components/admin/DashboardCustomizationPage").then(m => ({ default: m.DashboardCustomizationPage })));
const BulkImportPage = lazy(() => import("./components/admin/BulkImportPage").then(m => ({ default: m.BulkImportPage })));
const PerformanceBenchmarksPage = lazy(() => import("./components/admin/PerformanceBenchmarksPage").then(m => ({ default: m.PerformanceBenchmarksPage })));
const CustomMetricsPage = lazy(() => import("./components/admin/CustomMetricsPage").then(m => ({ default: m.CustomMetricsPage })));
const TasksPage = lazy(() => import("./components/admin/TasksPage").then(m => ({ default: m.TasksPage })));
const SettingsPage = lazy(() => import("./components/admin/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ClientHealthDashboard = lazy(() => import("./components/admin/ClientHealthDashboard").then(m => ({ default: m.ClientHealthDashboard })));
const EmployeeWorkloadDashboard = lazy(() => import("./components/admin/EmployeeWorkloadDashboard").then(m => ({ default: m.EmployeeWorkloadDashboard })));
const AccountManagerDailyView = lazy(() => import("./components/admin/AccountManagerDailyView").then(m => ({ default: m.AccountManagerDailyView })));
const EnhancedDailyViewPage = lazy(() => import("./components/admin/EnhancedDailyViewPage"));
const TeamMonitoringPage = lazy(() => import("./components/admin/TeamMonitoringPage").then(m => ({ default: m.TeamMonitoringPage })));
const ClientCredentialsPage = lazy(() => import("./components/admin/ClientCredentialsPage").then(m => ({ default: m.ClientCredentialsPage })));
const FeedbackPage = lazy(() => import("./components/admin/FeedbackPage").then(m => ({ default: m.FeedbackPage })));
const TimeOffPage = lazy(() => import("./components/admin/TimeOffPage").then(m => ({ default: m.TimeOffPage })));
const TimesheetsManagementPage = lazy(() => import("./components/admin/TimesheetsManagementPage"));
const SharedDocumentsPage = lazy(() => import("./components/admin/SharedDocumentsPage"));
const EmailLogsPage = lazy(() => import("./components/admin/EmailLogsPage"));
const ReportTemplatesPage = lazy(() => import("./components/admin/ReportTemplatesPage"));
const ClientOnboardingPage = lazy(() => import("./components/admin/ClientOnboardingPage").then(m => ({ default: m.ClientOnboardingPage })));
const RevenueDashboardPage = lazy(() => import("./components/admin/RevenueDashboardPage").then(m => ({ default: m.RevenueDashboardPage })));
const PerformanceScoringPage = lazy(() => import("./components/admin/PerformanceScoringPage").then(m => ({ default: m.PerformanceScoringPage })));
const ReportPDFPage = lazy(() => import("./components/admin/ReportPDFPage").then(m => ({ default: m.ReportPDFPage })));

const ModernEmployeeDashboard = lazy(() => import("./components/employee/ModernEmployeeDashboard").then(m => ({ default: m.ModernEmployeeDashboard })));
const EnhancedReportSubmissionPage = lazy(() => import("./components/employee/EnhancedReportSubmissionPage").then(m => ({ default: m.EnhancedReportSubmissionPage })));
const UnifiedTasksPage = lazy(() => import("./components/employee/UnifiedTasksPage"));
const TeamProgressTracker = lazy(() => import("./components/employee/TeamProgressTracker").then(m => ({ default: m.TeamProgressTracker })));
const TimeEntryPage = lazy(() => import("./components/employee/TimeEntryPage"));

function PageLoader() {
  return (
    <div className="space-y-6 animate-fade-up">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-20" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-[200px]" /></CardContent></Card>
    </div>
  );
}

function AdminRoutes() {
  const [, setLocation] = useLocation();

  const handleBackToClients = () => {
    setLocation("/clients");
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={EnhancedDashboardPage} />
        <Route path="/dashboard" component={EnhancedDashboardPage} />
        <Route path="/projects" component={ModernProjectsPage} />
        <Route path="/analytics" component={EnhancedAnalyticsPage} />
        <Route path="/clients">
          {() => <ClientsPage />}
        </Route>
        <Route path="/clients/:id">
          {(params) => (
            <ClientDetailPage clientId={params.id} onBack={handleBackToClients} />
          )}
        </Route>
        <Route path="/client-health" component={ClientHealthDashboard} />
        <Route path="/deals" component={DealsPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/workload" component={EmployeeWorkloadDashboard} />
        <Route path="/daily-view" component={EnhancedDailyViewPage} />
        <Route path="/team-monitoring" component={TeamMonitoringPage} />
        <Route path="/assignments" component={EnhancedAssignmentsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/consolidated-reports" component={ConsolidatedReportsPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/goals" component={GoalsPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/time-off" component={TimeOffPage} />
        <Route path="/timesheets" component={TimesheetsManagementPage} />
        <Route path="/time-tracking" component={TimeTrackingPage} />
        <Route path="/documents" component={SharedDocumentsPage} />
        <Route path="/email-logs" component={EmailLogsPage} />
        <Route path="/report-templates" component={ReportTemplatesPage} />
        <Route path="/communications" component={CommunicationHubPage} />
        <Route path="/resources" component={ResourceManagementPage} />
        <Route path="/budget" component={BudgetsManagementPage} />
        <Route path="/benchmarks" component={PerformanceBenchmarksPage} />
        <Route path="/metrics" component={CustomMetricsPage} />
        <Route path="/approvals" component={ReportApprovalsPage} />
        <Route path="/templates" component={EmailTemplatesPage} />
        <Route path="/customize" component={DashboardCustomizationPage} />
        <Route path="/import" component={BulkImportPage} />
        <Route path="/bulk" component={BulkOperationsPage} />
        <Route path="/portal" component={ClientPortalPage} />
        <Route path="/credentials" component={ClientCredentialsPage} />
        <Route path="/logs" component={ActivityLogsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/onboarding" component={ClientOnboardingPage} />
        <Route path="/revenue" component={RevenueDashboardPage} />
        <Route path="/performance" component={PerformanceScoringPage} />
        <Route path="/report-pdf" component={ReportPDFPage} />
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </Suspense>
  );
}

function EmployeeRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={ModernEmployeeDashboard} />
        <Route path="/dashboard" component={ModernEmployeeDashboard} />
        <Route path="/reports" component={EnhancedReportSubmissionPage} />
        <Route path="/tasks" component={UnifiedTasksPage} />
        <Route path="/time-entry" component={TimeEntryPage} />
        <Route path="/account-manager" component={AccountManagerDailyView} />
        <Route path="/team-progress" component={TeamProgressTracker} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/time-off" component={TimeOffPage} />
        <Route path="/credentials" component={ClientCredentialsPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/documents" component={SharedDocumentsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </Suspense>
  );
}

function UserMenu() {
  const { profile, signOut } = useAuth();
  const [, setLocation] = useLocation();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="button-user-menu"
          className="flex items-center gap-2 rounded-md p-1 hover-elevate"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium" data-testid="text-user-name">
            {profile?.full_name || "User"}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-user-role">
            {profile?.role || "employee"}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppContent() {
  const { user, profile, loading, isPortalUser } = useAuth();
  const [location] = useLocation();

  if (location === "/forgot-password") {
    return <ForgotPasswordPage />;
  }
  if (location === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (isPortalUser) {
    return <ClientPortalView />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-retry-profile"
            onClick={() => window.location.reload()}
          >
            Taking too long? Refresh
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === "admin";

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b bg-card/95 backdrop-blur-lg px-6 h-14">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-5 w-px bg-border" />
              <GlobalSearch compact />
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationCenter />
              <ThemeToggle />
              <div className="h-5 w-px bg-border ml-1" />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="px-6 py-6 lg:px-8 max-w-[1600px]">
              {isAdmin ? <AdminRoutes /> : <EmployeeRoutes />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TooltipProvider>
              <OfflineBanner />
              <AppContent />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
