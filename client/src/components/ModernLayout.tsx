import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { GlobalSearch } from './GlobalSearch';
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
  Scale,
  Key,
  ClipboardList,
  ChevronLeft,
  Bell,
  Plus,
  Grid2X2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface ModernLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function ModernLayout({ children, currentPage, onNavigate }: ModernLayoutProps) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isAdmin = profile?.role === 'admin';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const adminNav = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, group: 'main' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, group: 'main' },
    { id: 'clients', label: 'Clients', icon: Briefcase, group: 'main' },
    { id: 'employees', label: 'Members', icon: Users, group: 'main' },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'main' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'projects' },
    { id: 'client-health', label: 'Client Health', icon: Activity, group: 'projects' },
    { id: 'workload', label: 'Team Workload', icon: Scale, group: 'projects' },
    { id: 'account-manager', label: 'Daily View', icon: ClipboardList, group: 'projects' },
    { id: 'assignments', label: 'Assignments', icon: UserCog, group: 'projects' },
    { id: 'reports', label: 'Reports', icon: FileText, group: 'projects' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, group: 'projects' },
    { id: 'goals', label: 'Goals', icon: Target, group: 'projects' },
  ];

  const employeeNav = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, group: 'main' },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare, group: 'main' },
    { id: 'reports', label: 'Submit Report', icon: FileText, group: 'main' },
    { id: 'credentials', label: 'Client Credentials', icon: Key, group: 'main' },
  ];

  const navigation = isAdmin ? adminNav : employeeNav;
  const mainNav = navigation.filter(item => item.group === 'main');
  const projectsNav = navigation.filter(item => item.group === 'projects');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-foreground">ClientFlow</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition group ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {!sidebarCollapsed && projectsNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  My Projects
                </p>
                <button className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-primary flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Add Project
                </button>
              </div>
              {projectsNav.slice(0, 4).map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const colors = ['text-green-600', 'text-orange-600', 'text-purple-600', 'text-blue-600'];
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${colors[projectsNav.indexOf(item) % colors.length].replace('text-', 'bg-')}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(profile?.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email?.split('@')[0]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={signOut}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(profile?.full_name || '')}
                </AvatarFallback>
              </Avatar>
              <button onClick={signOut} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
          <div className="flex-1 max-w-xl">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition relative">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile?.full_name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">U.P, India</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 z-20">
        <div className="flex justify-around">
          {mainNav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
                  isActive ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
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
