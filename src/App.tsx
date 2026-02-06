import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './components/LoginPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { EnhancedDashboardPage } from './components/admin/EnhancedDashboardPage';
import { EnhancedAnalyticsPage } from './components/admin/EnhancedAnalyticsPage';
import { ClientsPage } from './components/admin/ClientsPage';
import { EmployeesPage } from './components/admin/EmployeesPage';
import { AssignmentsPage } from './components/admin/AssignmentsPage';
import { ReportsPage } from './components/admin/ReportsPage';
import { BudgetTrackingPage } from './components/admin/BudgetTrackingPage';
import { BulkOperationsPage } from './components/admin/BulkOperationsPage';
import { ClientPortalPage } from './components/admin/ClientPortalPage';
import { ActivityLogsPage } from './components/admin/ActivityLogsPage';
import { EnhancedEmployeeDashboard } from './components/employee/EnhancedEmployeeDashboard';
import { EnhancedReportSubmissionPage } from './components/employee/EnhancedReportSubmissionPage';
import { DailyTasksPage } from './components/employee/DailyTasksPage';
import { ClientDetailPage } from './components/admin/ClientDetailPage';
import { CalendarPage } from './components/admin/CalendarPage';
import { GoalsPage } from './components/admin/GoalsPage';
import { TimeTrackingPage } from './components/admin/TimeTrackingPage';
import { CommunicationHubPage } from './components/admin/CommunicationHubPage';
import { ResourceManagementPage } from './components/admin/ResourceManagementPage';
import { ReportApprovalsPage } from './components/admin/ReportApprovalsPage';
import { EmailTemplatesPage } from './components/admin/EmailTemplatesPage';
import { DashboardCustomizationPage } from './components/admin/DashboardCustomizationPage';
import { BulkImportPage } from './components/admin/BulkImportPage';
import { PerformanceBenchmarksPage } from './components/admin/PerformanceBenchmarksPage';
import { CustomMetricsPage } from './components/admin/CustomMetricsPage';
import { TasksPage } from './components/admin/TasksPage';
import { SettingsPage } from './components/admin/SettingsPage';
import { ClientPortalView } from './components/ClientPortalView';
import { ClientHealthDashboard } from './components/admin/ClientHealthDashboard';
import { EmployeeWorkloadDashboard } from './components/admin/EmployeeWorkloadDashboard';

function AppContent() {
  const { user, profile, loading, isPortalUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const pathname = window.location.pathname;

  if (pathname === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  if (pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
    return <LoginPage />;
  }

  const isAdmin = profile.role === 'admin';

  const handleViewClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentPage('client-detail');
  };

  const handleBackToClients = () => {
    setSelectedClientId(null);
    setCurrentPage('clients');
  };

  const renderPage = () => {
    if (isAdmin) {
      switch (currentPage) {
        case 'dashboard':
          return <EnhancedDashboardPage />;
        case 'analytics':
          return <EnhancedAnalyticsPage />;
        case 'clients':
          return <ClientsPage onViewClient={handleViewClient} />;
        case 'client-detail':
          return selectedClientId ? (
            <ClientDetailPage clientId={selectedClientId} onBack={handleBackToClients} />
          ) : (
            <ClientsPage onViewClient={handleViewClient} />
          );
        case 'employees':
          return <EmployeesPage />;
        case 'assignments':
          return <AssignmentsPage />;
        case 'reports':
          return <ReportsPage />;
        case 'budget':
          return <BudgetTrackingPage />;
        case 'bulk':
          return <BulkOperationsPage />;
        case 'portal':
          return <ClientPortalPage />;
        case 'logs':
          return <ActivityLogsPage />;
        case 'calendar':
          return <CalendarPage />;
        case 'goals':
          return <GoalsPage />;
        case 'timetracking':
          return <TimeTrackingPage />;
        case 'communications':
          return <CommunicationHubPage />;
        case 'resources':
          return <ResourceManagementPage />;
        case 'approvals':
          return <ReportApprovalsPage />;
        case 'templates':
          return <EmailTemplatesPage />;
        case 'customize':
          return <DashboardCustomizationPage />;
        case 'import':
          return <BulkImportPage />;
        case 'benchmarks':
          return <PerformanceBenchmarksPage />;
        case 'metrics':
          return <CustomMetricsPage />;
        case 'tasks':
          return <TasksPage />;
        case 'settings':
          return <SettingsPage />;
        case 'client-health':
          return <ClientHealthDashboard />;
        case 'workload':
          return <EmployeeWorkloadDashboard />;
        default:
          return <EnhancedDashboardPage />;
      }
    } else {
      switch (currentPage) {
        case 'dashboard':
          return <EnhancedEmployeeDashboard />;
        case 'reports':
          return <EnhancedReportSubmissionPage />;
        case 'tasks':
          return <DailyTasksPage />;
        default:
          return <EnhancedEmployeeDashboard />;
      }
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
