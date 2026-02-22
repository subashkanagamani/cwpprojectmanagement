import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Briefcase, UserCheck, Crown, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Modal } from "../Modal";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface Assignment {
  id: string;
  client_id: string;
  employee_id: string;
  service_id?: string;
  is_account_manager: boolean;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  industry?: string;
  status: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Service {
  id: string;
  name: string;
  is_active: boolean;
}

interface AssignmentGroup {
  client: Client;
  assignments: Array<{
    id: string;
    employee: Employee;
    service?: Service;
    is_account_manager: boolean;
  }>;
}

export default function EnhancedAssignmentsPage() {
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_id: "",
    employee_id: "",
    service_id: "",
    is_account_manager: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, employeesRes, servicesRes, assignmentsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("status", "active").order("name"),
        supabase.from("profiles").select("*").eq("role", "employee").order("full_name"),
        supabase.from("services").select("*").eq("is_active", true).order("name"),
        supabase.from("client_assignments").select("*"),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setClients(clientsRes.data || []);
      setEmployees(employeesRes.data || []);
      setServices(servicesRes.data || []);

      const grouped = await groupAssignments(
        clientsRes.data || [],
        employeesRes.data || [],
        servicesRes.data || [],
        assignmentsRes.data || []
      );
      setAssignmentGroups(grouped);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupAssignments = async (
    clientsList: Client[],
    employeesList: Employee[],
    servicesList: Service[],
    assignments: Assignment[]
  ) => {
    const groups: AssignmentGroup[] = [];

    for (const client of clientsList) {
      const clientAssignments = assignments
        .filter((a) => a.client_id === client.id)
        .map((a) => ({
          id: a.id,
          employee: employeesList.find((e) => e.id === a.employee_id)!,
          service: a.service_id ? servicesList.find((s) => s.id === a.service_id) : undefined,
          is_account_manager: a.is_account_manager,
        }))
        .filter((a) => a.employee);

      if (clientAssignments.length > 0) {
        groups.push({
          client,
          assignments: clientAssignments,
        });
      }
    }

    return groups;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: existingAssignment } = await supabase
        .from("client_assignments")
        .select("id")
        .eq("client_id", formData.client_id)
        .eq("employee_id", formData.employee_id)
        .maybeSingle();

      if (existingAssignment) {
        toast({
          title: "Warning",
          description: "This employee is already assigned to this client",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("client_assignments").insert([
        {
          client_id: formData.client_id,
          employee_id: formData.employee_id,
          service_id: formData.service_id || null,
          is_account_manager: formData.is_account_manager,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;

    try {
      const { error } = await supabase
        .from("client_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment removed successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      employee_id: "",
      service_id: "",
      is_account_manager: false,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredGroups = assignmentGroups.filter((group) =>
    group.client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalClients: assignmentGroups.length,
    totalAssignments: assignmentGroups.reduce((sum, g) => sum + g.assignments.length, 0),
    accountManagers: assignmentGroups.reduce(
      (sum, g) => sum + g.assignments.filter((a) => a.is_account_manager).length,
      0
    ),
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Assignments</h1>
          <p className="text-muted-foreground mt-1">Manage team assignments and account managers</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground">Assigned Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.totalAssignments}</p>
                <p className="text-xs text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/30">
                <Crown className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.accountManagers}</p>
                <p className="text-xs text-muted-foreground">Account Managers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assignments by Client</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 opacity-40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No assignments found</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <Card key={group.client.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{group.client.name}</h3>
                          {group.client.industry && (
                            <p className="text-sm text-muted-foreground">{group.client.industry}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">{group.assignments.length} team members</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(assignment.employee.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">
                                  {assignment.employee.full_name}
                                </p>
                                {assignment.is_account_manager && (
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {assignment.employee.email}
                              </p>
                              {assignment.service && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {assignment.service.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(assignment.id)}
                            className="h-8 w-8 ml-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="New Assignment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client_id">Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employee_id">Employee *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="service_id">Service (Optional)</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => setFormData({ ...formData, service_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_account_manager"
              checked={formData.is_account_manager}
              onChange={(e) =>
                setFormData({ ...formData, is_account_manager: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="is_account_manager" className="cursor-pointer">
              Set as Account Manager
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Create Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
