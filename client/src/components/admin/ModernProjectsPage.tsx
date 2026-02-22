import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Grid2X2,
  List,
  Plus,
  Search,
  GripVertical,
  Calendar,
  User,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string;
  client_id: string | null;
  due_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  client_name?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
}

const STATUS_COLUMNS = [
  { id: 'pending', title: 'To Do', color: 'blue' },
  { id: 'in_progress', title: 'In Progress', color: 'orange' },
  { id: 'completed', title: 'Done', color: 'green' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

const COLUMN_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
};

const emptyFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  assigned_to: '',
  client_id: '',
  due_date: '',
};

export function ModernProjectsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, profilesRes, clientsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('status', 'active')
          .is('deleted_at', null),
        supabase
          .from('clients')
          .select('id, name')
          .is('deleted_at', null)
          .order('name'),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p.full_name])
      );
      const clientMap = new Map(
        (clientsRes.data || []).map((c) => [c.id, c.name])
      );

      const enrichedTasks: Task[] = (tasksRes.data || []).map((t) => ({
        ...t,
        assignee_name: profileMap.get(t.assigned_to) || 'Unassigned',
        client_name: t.client_id ? clientMap.get(t.client_id) || 'Unknown' : undefined,
      }));

      setTasks(enrichedTasks);
      setProfiles(profilesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.assignee_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient =
      clientFilter === 'all' || task.client_id === clientFilter;
    return matchesSearch && matchesClient;
  });

  const getColumnTasks = (status: string) =>
    filteredTasks.filter((t) => t.status === status);

  const openCreateDialog = () => {
    setEditingTask(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to,
      client_id: task.client_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.assigned_to) {
      toast.error('Assignee is required');
      return;
    }
    if (!formData.due_date) {
      toast.error('Due date is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        assigned_to: formData.assigned_to,
        client_id: formData.client_id || null,
        due_date: formData.due_date,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingTask.id);
        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert({ ...payload, created_by: user?.id || null });
        if (error) throw error;
        toast.success('Task created successfully');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Task deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setDraggedTaskId(null);

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
      if (error) throw error;
      toast.success(`Task moved to ${STATUS_COLUMNS.find((c) => c.id === newStatus)?.title}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task status');
      fetchData();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dateStr: string, status: string) => {
    if (status === 'completed') return false;
    return new Date(dateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-80 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Manage and track your project tasks
        </p>
      </div>

      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up"
        style={{ animationDelay: '100ms' }}
      >
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <Grid2X2 className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        {viewMode === 'kanban' ? (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((column) => {
              const columnTasks = getColumnTasks(column.id);
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${COLUMN_DOT_COLORS[column.color]}`}
                      />
                      <h2 className="font-semibold text-foreground">
                        {column.title}
                      </h2>
                      <Badge variant="secondary" className="text-xs">
                        {columnTasks.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={openCreateDialog}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3 flex-1 min-h-[200px] rounded-lg">
                    {columnTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={`p-4 cursor-grab hover:shadow-md transition-all group ${
                          draggedTaskId === task.id ? 'opacity-50' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant="secondary"
                              className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] || ''}`}
                            >
                              {task.priority.charAt(0).toUpperCase() +
                                task.priority.slice(1)}
                            </Badge>
                            {task.client_name && (
                              <Badge variant="outline" className="text-xs">
                                {task.client_name}
                              </Badge>
                            )}
                          </div>
                          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <h3
                          className="font-semibold text-foreground mb-1 cursor-pointer hover:text-primary"
                          onClick={() => openEditDialog(task)}
                        >
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[100px]">
                              {task.assignee_name}
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1 ${
                              isOverdue(task.due_date, task.status)
                                ? 'text-red-500'
                                : ''
                            }`}
                          >
                            {isOverdue(task.due_date, task.status) && (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(task.due_date)}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <button
                            className="text-left hover:text-primary transition-colors"
                            onClick={() => openEditDialog(task)}
                          >
                            {task.title}
                          </button>
                        </TableCell>
                        <TableCell>{task.client_name || '—'}</TableCell>
                        <TableCell>{task.assignee_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${PRIORITY_COLORS[task.priority] || ''}`}
                          >
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${STATUS_COLORS[task.status] || ''}`}
                          >
                            {task.status === 'in_progress'
                              ? 'In Progress'
                              : task.status.charAt(0).toUpperCase() +
                                task.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              isOverdue(task.due_date, task.status)
                                ? 'text-red-500 font-medium'
                                : ''
                            }
                          >
                            {formatDate(task.due_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, priority: val }))
                  }
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, assigned_to: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={formData.client_id || 'none'}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    client_id: val === 'none' ? '' : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? 'Saving...'
                : editingTask
                  ? 'Update Task'
                  : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
