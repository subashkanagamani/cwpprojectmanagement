import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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
  ClipboardCheck,
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
  UsersRound,
  Handshake,
  ChevronsUpDown,
} from "lucide-react";

interface AppSidebarProps {
  isAdmin: boolean;
}

const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "projects", label: "Projects", icon: Briefcase, path: "/projects" },
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "clients", label: "Clients", icon: Briefcase, path: "/clients" },
      { id: "client-health", label: "Client Health", icon: Activity, path: "/client-health" },
      { id: "deals", label: "Deals", icon: Handshake, path: "/deals" },
      { id: "credentials", label: "Credentials", icon: Key, path: "/credentials" },
      { id: "onboarding", label: "Onboarding", icon: ClipboardCheck, path: "/onboarding" },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "employees", label: "Employees", icon: Users, path: "/employees" },
      { id: "workload", label: "Workload", icon: Scale, path: "/workload" },
      { id: "daily-view", label: "Daily View", icon: ClipboardList, path: "/daily-view" },
      { id: "team-monitoring", label: "Team Monitoring", icon: UsersRound, path: "/team-monitoring" },
      { id: "assignments", label: "Assignments", icon: UserCog, path: "/assignments" },
      { id: "resources", label: "Resources", icon: UserCheck, path: "/resources" },
      { id: "performance", label: "Performance", icon: TrendingUp, path: "/performance" },
    ],
  },
  {
    label: "Work",
    items: [
      { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
      { id: "report-pdf", label: "PDF Reports", icon: FileText, path: "/report-pdf" },
      { id: "consolidated-reports", label: "Client Reports", icon: FileText, path: "/consolidated-reports" },
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
      { id: "revenue", label: "Revenue", icon: DollarSign, path: "/revenue" },
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

const getEmployeeNavGroups = (isAccountManager: boolean) => [
  {
    label: "My Work",
    items: [
      { id: "dashboard", label: "My Clients", icon: Briefcase, path: "/dashboard" },
      { id: "reports", label: "Submit Report", icon: FileText, path: "/reports" },
      { id: "tasks", label: "My Tasks", icon: CheckSquare, path: "/tasks" },
      ...(isAccountManager ? [{ id: "account-manager", label: "Account Manager", icon: UsersRound, path: "/account-manager" }] : []),
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
  const [isAccountManager, setIsAccountManager] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin && profile?.id) {
      supabase
        .from("client_assignments")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", profile.id)
        .eq("is_account_manager", true)
        .then(({ count }) => {
          setIsAccountManager((count || 0) > 0);
        });
    }
  }, [isAdmin, profile?.id]);

  const navGroups = isAdmin ? adminNavGroups : getEmployeeNavGroups(isAccountManager);

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
      <SidebarHeader className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight" data-testid="text-app-name">ClientFlow</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="px-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70 px-2 mb-0.5">
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
                        className={`text-[13px] rounded-lg transition-all ${
                          active
                            ? "font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
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
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            data-testid="button-sidebar-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
