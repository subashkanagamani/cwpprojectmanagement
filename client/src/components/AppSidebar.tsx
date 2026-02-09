import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  LayoutDashboard,
  BarChart3,
  Briefcase,
  Activity,
  Users,
  Scale,
  ClipboardList,
  UserCog,
  FileText,
  Calendar,
  Target,
  CheckSquare,
  Clock,
  MessageSquare,
  UserCheck,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle,
  Mail,
  Settings,
  Upload,
  Layers,
  Globe,
  Key,
  LogOut,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";

interface AppSidebarProps {
  isAdmin: boolean;
}

const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "clients", label: "Clients", icon: Briefcase, path: "/clients" },
      { id: "client-health", label: "Client Health", icon: Activity, path: "/client-health" },
      { id: "credentials", label: "Credentials", icon: Key, path: "/credentials" },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "employees", label: "Employees", icon: Users, path: "/employees" },
      { id: "workload", label: "Workload", icon: Scale, path: "/workload" },
      { id: "daily-view", label: "Daily View", icon: ClipboardList, path: "/daily-view" },
      { id: "team-monitoring", label: "Team Monitoring", icon: UsersRound, path: "/team-monitoring" },
      { id: "daily-submissions", label: "Daily Submissions", icon: ClipboardCheck, path: "/daily-submissions" },
      { id: "assignments", label: "Assignments", icon: UserCog, path: "/assignments" },
      { id: "resources", label: "Resources", icon: UserCheck, path: "/resources" },
    ],
  },
  {
    label: "Work",
    items: [
      { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
      { id: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks" },
      { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
      { id: "goals", label: "Goals", icon: Target, path: "/goals" },
      { id: "feedback", label: "Feedback", icon: MessageSquare, path: "/feedback" },
      { id: "time-off", label: "Time Off", icon: Calendar, path: "/time-off" },
      { id: "time-tracking", label: "Time Tracking", icon: Clock, path: "/time-tracking" },
      { id: "approvals", label: "Approvals", icon: CheckCircle, path: "/approvals" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "budget", label: "Budget", icon: DollarSign, path: "/budget" },
      { id: "benchmarks", label: "Benchmarks", icon: TrendingUp, path: "/benchmarks" },
      { id: "metrics", label: "Metrics", icon: Sliders, path: "/metrics" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "communications", label: "Messages", icon: MessageSquare, path: "/communications" },
      { id: "templates", label: "Templates", icon: Mail, path: "/templates" },
      { id: "import", label: "Import", icon: Upload, path: "/import" },
      { id: "bulk", label: "Bulk Ops", icon: Layers, path: "/bulk" },
      { id: "portal", label: "Portal", icon: Globe, path: "/portal" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "logs", label: "Activity Logs", icon: Activity, path: "/logs" },
      { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

const employeeNavGroups = [
  {
    label: "My Work",
    items: [
      { id: "dashboard", label: "My Clients", icon: Briefcase, path: "/dashboard" },
      { id: "reports", label: "Submit Report", icon: FileText, path: "/reports" },
      { id: "tasks", label: "My Tasks", icon: CheckSquare, path: "/tasks" },
      { id: "team-progress", label: "Team Progress", icon: UsersRound, path: "/team-progress" },
      { id: "feedback", label: "Feedback", icon: MessageSquare, path: "/feedback" },
      { id: "time-off", label: "Time Off", icon: Calendar, path: "/time-off" },
      { id: "credentials", label: "Credentials", icon: Key, path: "/credentials" },
    ],
  },
];

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const { profile, signOut } = useAuth();
  const navGroups = isAdmin ? adminNavGroups : employeeNavGroups;

  const isActive = (path: string) => {
    if (path === "/dashboard" && (location === "/" || location === "/dashboard")) return true;
    if (path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold" data-testid="text-app-name">ClientFlow</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="px-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => setLocation(item.path)}
                        data-testid={`nav-${item.id}`}
                        className="text-[13px]"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" data-testid="text-sidebar-user">
              {profile?.full_name || "User"}
            </p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {profile?.role || "employee"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            data-testid="button-sidebar-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
