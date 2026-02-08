import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, CheckCircle2, Circle, Building2, Calendar, User, ClipboardList, AlertTriangle } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  created_by?: string;
  client_id?: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  status: 'pending' | 'completed';
  completed_at?: string;
  remarks?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  clients?: {
    name: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
}

export function TasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    client_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, employeesRes, clientsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select(`
            *,
            profiles!tasks_assigned_to_fkey(full_name, email),
            clients(name)
          `)
          .order('due_date', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'employee')
          .eq('status', 'active')
          .order('full_name'),
        supabase
          .from('clients')
          .select('id, name')
          .eq('status', 'active')
          .order('name'),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setTasks(tasksRes.data || []);
      setEmployees(employeesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      client_id: '',
      priority: 'medium',
      due_date: '',
    });
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      client_id: task.client_id || '',
      priority: task.priority,
      due_date: task.due_date,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to,
        client_id: formData.client_id || null,
        priority: formData.priority,
        due_date: formData.due_date,
        created_by: user!.id,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        showToast('Task updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        showToast('Task created successfully', 'success');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Task deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const isOverdue = (task: Task) => {
    return task.status === 'pending' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  };

  const getPriorityVariant = (priority: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(isOverdue);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Task Management</h1>
          <p className="text-sm text-muted-foreground">Assign and manage daily tasks for employees</p>
        </div>
        <Button onClick={openAddModal} data-testid="button-create-task">
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Tasks</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-pending-count">{pendingTasks.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/40">
                <Circle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Overdue Tasks</p>
                <p className="text-2xl font-semibold tracking-tight text-destructive" data-testid="text-overdue-count">{overdueTasks.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-red-50 dark:bg-red-950/40">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Completed Tasks</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-completed-count">{completedTasks.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first task to get started</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task);

                  return (
                    <TableRow key={task.id} className={overdue ? 'bg-destructive/5' : ''} data-testid={`row-task-${task.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.remarks && (
                            <p className="text-xs text-primary mt-1 italic">Remarks: {task.remarks}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{task.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{task.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.clients ? (
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {task.clients.name}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                          {task.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className={`text-sm ${overdue ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                            {format(parseISO(task.due_date), 'MMM d, yyyy')}
                            {overdue && (
                              <span className="block text-xs text-destructive">OVERDUE</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.status === 'completed' ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Circle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(task)}
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(task.id)}
                            data-testid={`button-delete-task-${task.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Task Title *</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="input-task-title"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Provide more details about the task..."
                data-testid="input-task-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign To *</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Client (Optional)</Label>
                <Select
                  value={formData.client_id || '_none'}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value === '_none' ? '' : value })}
                >
                  <SelectTrigger data-testid="select-task-client">
                    <SelectValue placeholder="No Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No Client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger data-testid="select-task-priority">
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
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  data-testid="input-task-due-date"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-task">
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
