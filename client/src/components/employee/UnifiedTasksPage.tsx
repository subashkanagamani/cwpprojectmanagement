import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Target, AlertCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Modal } from "../Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  client_id: string;
  task_type: string;
  clients?: { name: string };
}

interface Client {
  id: string;
  name: string;
}

export default function UnifiedTasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_id: "",
    priority: "medium",
    due_date: "",
    status: "pending",
  });

  useEffect(() => {
    fetchTasks();
    fetchClients();
  }, [filterStatus]);

  const fetchTasks = async () => {
    if (!profile?.id) return;

    try {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          clients(name)
        `)
        .eq("assigned_to", profile.id)
        .order("due_date", { ascending: true });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tasksWithType = (data || []).map((task) => ({
        ...task,
        task_type: task.is_daily_task ? "daily" : "assigned",
      }));

      setTasks(tasksWithType);
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

  const fetchClients = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("client_assignments")
        .select(`
          client_id,
          clients(id, name)
        `)
        .eq("employee_id", profile.id);

      if (error) throw error;

      const clientsList = (data || [])
        .map((assignment: any) => assignment.clients)
        .filter((client) => client !== null);

      setClients(clientsList);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        client_id: formData.client_id,
        priority: formData.priority,
        due_date: formData.due_date,
        status: formData.status,
        assigned_to: profile?.id,
        is_daily_task: false,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        const { error } = await supabase.from("tasks").insert([taskData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task status updated",
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      client_id: task.client_id,
      priority: task.priority,
      due_date: task.due_date,
      status: task.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      client_id: "",
      priority: "medium",
      due_date: "",
      status: "pending",
    });
    setEditingTask(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "Pending", variant: "outline" },
      in_progress: { label: "In Progress", variant: "default" },
      completed: { label: "Completed", variant: "secondary" },
      blocked: { label: "Blocked", variant: "destructive" },
    };
    return statusConfig[status] || { label: status, variant: "outline" };
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive" }
    > = {
      low: { variant: "secondary" },
      medium: { variant: "default" },
      high: { variant: "destructive" },
    };
    return priorityConfig[priority] || { variant: "outline" };
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const groupedTasks = {
    today: tasks.filter((t) => {
      const dueDate = new Date(t.due_date);
      const today = new Date();
      return dueDate.toDateString() === today.toDateString();
    }),
    upcoming: tasks.filter((t) => {
      const dueDate = new Date(t.due_date);
      const today = new Date();
      return dueDate > today && dueDate.toDateString() !== today.toDateString();
    }),
    overdue: tasks.filter((t) => {
      const dueDate = new Date(t.due_date);
      const today = new Date();
      return dueDate < today && t.status !== "completed";
    }),
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage all your assigned and daily tasks</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient orange">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">In Progress</p>
            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="today">Today ({groupedTasks.today.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({groupedTasks.upcoming.length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({groupedTasks.overdue.length})</TabsTrigger>
            </TabsList>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="all" className="space-y-4">
            <TaskList
              tasks={tasks}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
            />
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            <TaskList
              tasks={groupedTasks.today}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
            />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <TaskList
              tasks={groupedTasks.upcoming}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
            />
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <TaskList
              tasks={groupedTasks.overdue}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingTask ? "Edit Task" : "Add New Task"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: string) => void;
  onEdit: (task: Task) => void;
  getStatusBadge: (status: string) => any;
  getPriorityBadge: (priority: string) => any;
}

function TaskList({ tasks, onStatusChange, onEdit, getStatusBadge, getPriorityBadge }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Target className="h-8 w-8 opacity-40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group border"
          onClick={() => onEdit(task)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground">{task.title}</h3>
                <Badge variant={getStatusBadge(task.status).variant}>
                  {getStatusBadge(task.status).label}
                </Badge>
                <Badge variant={getPriorityBadge(task.priority).variant}>
                  {task.priority}
                </Badge>
                {task.task_type === "daily" && (
                  <Badge variant="outline">Daily Task</Badge>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{task.clients?.name}</span>
                <span>•</span>
                <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {task.status !== "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, "completed");
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
