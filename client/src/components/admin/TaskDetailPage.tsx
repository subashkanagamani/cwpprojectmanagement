import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Building2, Clock, CheckCircle2, Circle, AlertTriangle, CreditCard as Edit2, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  taskId: string;
  onBack: () => void;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string | null;
  client_id: string | null;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
  remarks: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  clients: { name: string } | null;
  creator?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
}

interface Client {
  id: string;
  name: string;
}

function getPriorityVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (priority === 'high') return 'destructive';
  if (priority === 'medium') return 'default';
  return 'secondary';
}

function getDueBadge(dueDate: string, status: string) {
  if (status === 'completed') return null;
  const date = parseISO(dueDate);
  if (isPast(date) && !isToday(date)) return { label: 'Overdue', className: 'text-red-600 bg-red-50 dark:bg-red-950/50 border-red-200' };
  if (isToday(date)) return { label: 'Due today', className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200' };
  return null;
}

export function TaskDetailPage({ taskId, onBack }: Props) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [remarksEditing, setRemarksEditing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    client_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  useEffect(() => {
    loadTask();
    loadDropdowns();
  }, [taskId]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_assigned_to_fkey(full_name, email),
          clients(name)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      setTask(data);
      setRemarks(data.remarks || '');
    } catch {
      showToast('Failed to load task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    const [empRes, clientRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'employee').eq('status', 'active').order('full_name'),
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
    ]);
    setEmployees(empRes.data || []);
    setClients(clientRes.data || []);
  };

  const handleToggleStatus = async () => {
    if (!task) return;
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);
      if (error) throw error;
      showToast(newStatus === 'completed' ? 'Task marked complete' : 'Task reopened', 'success');
      loadTask();
    } catch {
      showToast('Failed to update task', 'error');
    }
  };

  const handleSaveRemarks = async () => {
    if (!task) return;
    setSavingRemarks(true);
    try {
      const { error } = await supabase.from('tasks').update({ remarks }).eq('id', taskId);
      if (error) throw error;
      showToast('Remarks saved', 'success');
      setRemarksEditing(false);
      setTask({ ...task, remarks });
    } catch {
      showToast('Failed to save remarks', 'error');
    } finally {
      setSavingRemarks(false);
    }
  };

  const openEdit = () => {
    if (!task) return;
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      client_id: task.client_id || '',
      priority: task.priority,
      due_date: task.due_date,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to,
          client_id: formData.client_id || null,
          priority: formData.priority,
          due_date: formData.due_date,
        })
        .eq('id', taskId);
      if (error) throw error;
      showToast('Task updated', 'success');
      setShowEditModal(false);
      loadTask();
    } catch {
      showToast('Failed to update task', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      showToast('Task deleted', 'success');
      onBack();
    } catch {
      showToast('Failed to delete task', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-8 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="text-muted-foreground">Task not found.</p>
      </div>
    );
  }

  const dueBadge = getDueBadge(task.due_date, task.status);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-1" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={handleToggleStatus}
              className="mt-1 shrink-0 transition-colors hover:opacity-80"
              data-testid="button-toggle-status"
              title={task.status === 'completed' ? 'Reopen task' : 'Mark complete'}
            >
              {task.status === 'completed'
                ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                : <Circle className="h-6 w-6 text-muted-foreground" />}
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={getPriorityVariant(task.priority)} className="capitalize no-default-active-elevate">
                  {task.priority} priority
                </Badge>
                <Badge variant={task.status === 'completed' ? 'default' : 'outline'} className="capitalize no-default-active-elevate">
                  {task.status}
                </Badge>
                {dueBadge && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${dueBadge.className}`}>
                    <AlertTriangle className="h-3 w-3" />
                    {dueBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openEdit} data-testid="button-edit-task">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" data-testid="button-delete-task">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ animationDelay: '50ms' }}>
        {/* Main details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {task.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {task.description && <Separator />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned to</p>
                  <p className="text-sm font-medium text-foreground">{task.profiles?.full_name || '—'}</p>
                  {task.profiles?.email && <p className="text-xs text-muted-foreground">{task.profiles.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 shrink-0">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due date</p>
                  <p className="text-sm font-medium text-foreground">{format(parseISO(task.due_date), 'MMMM dd, yyyy')}</p>
                </div>
              </div>

              {task.clients && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 shrink-0">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="text-sm font-medium text-foreground">{task.clients.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                  <Clock className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">{format(parseISO(task.created_at), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              {task.completed_at && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-sm font-medium text-foreground">{format(parseISO(task.completed_at), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Remarks / Notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Remarks
            </CardTitle>
            {!remarksEditing && (
              <Button variant="ghost" size="sm" onClick={() => setRemarksEditing(true)}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {remarksEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Add notes or remarks..."
                  rows={6}
                  className="resize-none"
                  data-testid="textarea-remarks"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveRemarks} disabled={savingRemarks} data-testid="button-save-remarks">
                    {savingRemarks ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRemarksEditing(false); setRemarks(task.remarks || ''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap min-h-[80px]">
                {task.remarks || <span className="text-muted-foreground italic">No remarks yet. Click Edit to add notes.</span>}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assigned to</Label>
                <Select value={formData.assigned_to} onValueChange={v => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as 'low' | 'medium' | 'high' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Client (optional)</Label>
                <Select value={formData.client_id} onValueChange={v => setFormData({ ...formData, client_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
