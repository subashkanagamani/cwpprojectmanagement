import { useState } from "react";
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

import { EnhancedDashboardPage } from "./components/admin/EnhancedDashboardPage";
import { EnhancedAnalyticsPage } from "./components/admin/EnhancedAnalyticsPage";
import { ClientsPage } from "./components/admin/ClientsPage";
import { ClientDetailPage } from "./components/admin/ClientDetailPage";
import { EmployeesPage } from "./components/admin/EmployeesPage";
import { AssignmentsPage } from "./components/admin/AssignmentsPage";
import { ReportsPage } from "./components/admin/ReportsPage";
import { BudgetTrackingPage } from "./components/admin/BudgetTrackingPage";
import { BulkOperationsPage } from "./components/admin/BulkOperationsPage";
import { ClientPortalPage } from "./components/admin/ClientPortalPage";
import { ActivityLogsPage } from "./components/admin/ActivityLogsPage";
import { CalendarPage } from "./components/admin/CalendarPage";
import { GoalsPage } from "./components/admin/GoalsPage";
import { TimeTrackingPage } from "./components/admin/TimeTrackingPage";
import { CommunicationHubPage } from "./components/admin/CommunicationHubPage";
import { ResourceManagementPage } from "./components/admin/ResourceManagementPage";
import { ReportApprovalsPage } from "./components/admin/ReportApprovalsPage";
import { EmailTemplatesPage } from "./components/admin/EmailTemplatesPage";
import { DashboardCustomizationPage } from "./components/admin/DashboardCustomizationPage";
import { BulkImportPage } from "./components/admin/BulkImportPage";
import { PerformanceBenchmarksPage } from "./components/admin/PerformanceBenchmarksPage";
import { CustomMetricsPage } from "./components/admin/CustomMetricsPage";
import { TasksPage } from "./components/admin/TasksPage";
import { SettingsPage } from "./components/admin/SettingsPage";
import { ClientHealthDashboard } from "./components/admin/ClientHealthDashboard";
import { EmployeeWorkloadDashboard } from "./components/admin/EmployeeWorkloadDashboard";
import { AccountManagerDailyView } from "./components/admin/AccountManagerDailyView";
import { ClientCredentialsPage } from "./components/admin/ClientCredentialsPage";
import { EnhancedEmployeeDashboard } from "./components/employee/EnhancedEmployeeDashboard";
import { EnhancedReportSubmissionPage } from "./components/employee/EnhancedReportSubmissionPage";
import { MyTasksPage } from "./components/employee/MyTasksPage";
import { AdminDailySubmissionsPage } from "./components/admin/AdminDailySubmissionsPage";
import { GlobalSearch } from "./components/GlobalSearch";

function AdminRoutes() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleViewClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setLocation("/clients/" + clientId);
  };

  const handleBackToClients = () => {
    setSelectedClientId(null);
    setLocation("/clients");
  };

  return (
    <Switch>
      <Route path="/" component={EnhancedDashboardPage} />
      <Route path="/dashboard" component={EnhancedDashboardPage} />
      <Route path="/analytics" component={EnhancedAnalyticsPage} />
      <Route path="/clients">
        <ClientsPage onViewClient={handleViewClient} />
      </Route>
      <Route path="/clients/:id">
        {(params) => (
          <ClientDetailPage clientId={params.id} onBack={handleBackToClients} />
        )}
      </Route>
      <Route path="/client-health" component={ClientHealthDashboard} />
      <Route path="/employees" component={EmployeesPage} />
      <Route path="/workload" component={EmployeeWorkloadDashboard} />
      <Route path="/daily-view" component={AccountManagerDailyView} />
      <Route path="/daily-submissions" component={AdminDailySubmissionsPage} />
      <Route path="/assignments" component={AssignmentsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/time-tracking" component={TimeTrackingPage} />
      <Route path="/communications" component={CommunicationHubPage} />
      <Route path="/resources" component={ResourceManagementPage} />
      <Route path="/budget" component={BudgetTrackingPage} />
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
      <Route>
        <Redirect to="/dashboard" />
      </Route>
    </Switch>
  );
}

function EmployeeRoutes() {
  return (
    <Switch>
      <Route path="/" component={EnhancedEmployeeDashboard} />
      <Route path="/dashboard" component={EnhancedEmployeeDashboard} />
      <Route path="/reports" component={EnhancedReportSubmissionPage} />
      <Route path="/tasks" component={MyTasksPage} />
      <Route path="/credentials" component={ClientCredentialsPage} />
      <Route>
        <Redirect to="/dashboard" />
      </Route>
    </Switch>
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
          <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b bg-card/80 backdrop-blur-sm px-6 h-14">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="px-6 py-6 lg:px-8">
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
