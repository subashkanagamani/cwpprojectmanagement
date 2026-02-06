import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationCenter } from './NotificationCenter';
import {
  Building2,
  Users,
  Briefcase,
  UserCog,
  FileText,
  LogOut,
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Layers,
  Globe,
  Activity,
  Calendar,
  Target,
  Clock,
  MessageSquare,
  UserCheck,
  Sun,
  Moon,
  CheckCircle,
  Mail,
  Settings,
  Upload,
  TrendingUp,
  Sliders,
  CheckSquare,
  Scale
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isAdmin = profile?.role === 'admin';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'clients', label: 'Clients', icon: Briefcase },
    { id: 'client-health', label: 'Client Health', icon: Activity },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'workload', label: 'Team Workload', icon: Scale },
    { id: 'assignments', label: 'Assignments', icon: UserCog },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'timetracking', label: 'Time Tracking', icon: Clock },
    { id: 'communications', label: 'Communications', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: UserCheck },
    { id: 'budget', label: 'Budget', icon: DollarSign },
    { id: 'benchmarks', label: 'Benchmarks', icon: TrendingUp },
    { id: 'metrics', label: 'Custom Metrics', icon: Sliders },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle },
    { id: 'templates', label: 'Email Templates', icon: Mail },
    { id: 'customize', label: 'Customize Dashboard', icon: Settings },
    { id: 'import', label: 'Bulk Import', icon: Upload },
    { id: 'bulk', label: 'Bulk Operations', icon: Layers },
    { id: 'portal', label: 'Client Portal', icon: Globe },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const employeeNav = [
    { id: 'dashboard', label: 'My Clients', icon: Briefcase },
    { id: 'reports', label: 'Submit Report', icon: FileText },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
  ];

  const navigation = isAdmin ? adminNav : employeeNav;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-64 lg:h-screen bg-white border-r border-gray-200 flex-col sticky top-0">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ClientFlow</h1>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Admin Panel' : 'Employee Portal'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
          <div className="mb-2">
            <NotificationCenter />
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition mb-2"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ClientFlow</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={() => {
              const event = new CustomEvent('toggleMobileMenu');
              window.dispatchEvent(event);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 z-20">
        <div className="flex justify-around">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
                  isActive ? 'text-blue-700' : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
