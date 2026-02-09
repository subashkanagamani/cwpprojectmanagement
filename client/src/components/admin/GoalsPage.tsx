import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Target, Plus, TrendingUp, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GoalProgressModal } from './GoalProgressModal';
import { GoalProgressHistory } from './GoalProgressHistory';

interface Goal {
  id: string;
  client_id: string;
  service_id: string | null;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  start_date: string;
  target_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  clients?: { name: string };
  services?: { name: string };
}

export function GoalsPage() {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    title: '',
    description: '',
    target_value: '',
    current_value: '0',
    unit: '',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    status: 'active' as Goal['status'],
    priority: 'medium' as Goal['priority'],
  });

  useEffect(() => {
    loadGoals();
    loadClients();
    loadServices();
  }, []);

  const loadGoals = async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*, clients(name), services(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading goals:', error);
      showToast('Failed to load goals', 'error');
    } else {
      setGoals(data || []);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    if (data) setClients(data);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setServices(data);
  };

  const openModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        client_id: goal.client_id,
        service_id: goal.service_id || '',
        title: goal.title,
        description: goal.description || '',
        target_value: goal.target_value?.toString() || '',
        current_value: goal.current_value.toString(),
        unit: goal.unit || '',
        start_date: goal.start_date,
        target_date: goal.target_date,
        status: goal.status,
        priority: goal.priority,
      });
    } else {
      setEditingGoal(null);
      setFormData({
        client_id: '',
        service_id: '',
        title: '',
        description: '',
        target_value: '',
        current_value: '0',
        unit: '',
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
        status: 'active',
        priority: 'medium',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const goalData = {
      ...formData,
      service_id: formData.service_id || null,
      target_value: formData.target_value ? Number(formData.target_value) : null,
      current_value: Number(formData.current_value),
      unit: formData.unit || null,
      created_by: editingGoal ? undefined : user.id,
    };

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id);
        if (error) throw error;
        showToast('Goal updated successfully', 'success');
      } else {
        const { error } = await supabase.from('goals').insert(goalData);
        if (error) throw error;
        showToast('Goal created successfully', 'success');
      }
      setShowModal(false);
      loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      showToast('Failed to save goal', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'active': return <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'on_hold': return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'cancelled': return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default: return null;
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getProgress = (goal: Goal) => {
    if (!goal.target_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const filteredGoals = filterStatus === 'all'
    ? goals
    : goals.filter(g => g.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Goals</h1>
          <p className="text-sm text-muted-foreground">Track client objectives and milestones</p>
        </div>
        <Button onClick={() => openModal()} data-testid="button-add-goal">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'completed', 'on_hold', 'cancelled'].map(status => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            onClick={() => setFilterStatus(status)}
            className={filterStatus === status ? 'toggle-elevate toggle-elevated' : ''}
            data-testid={`button-filter-${status}`}
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 max-h-[600px] overflow-y-auto">
        {filteredGoals.map(goal => (
          <Card key={goal.id} data-testid={`card-goal-${goal.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {getStatusIcon(goal.status)}
                    <h3 className="text-lg font-semibold text-foreground" data-testid={`text-goal-title-${goal.id}`}>{goal.title}</h3>
                    <Badge variant={getPriorityVariant(goal.priority)} data-testid={`text-goal-priority-${goal.id}`}>
                      {goal.priority}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>{goal.clients?.name}</span>
                    {goal.services && <span>- {goal.services.name}</span>}
                    <span>- {format(new Date(goal.start_date), 'MMM d')} - {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {goal.status === 'active' && goal.target_value && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProgressGoal(goal)}
                      data-testid={`button-record-progress-${goal.id}`}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Record Progress
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openModal(goal)}
                    data-testid={`button-edit-goal-${goal.id}`}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {goal.description && (
                <p className="text-muted-foreground mb-4">{goal.description}</p>
              )}

              {goal.target_value && (
                <div>
                  <div className="flex justify-between gap-4 flex-wrap text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                  </div>
                  <Progress value={getProgress(goal)} className="h-3" />
                  <div className="flex justify-between items-center mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                      className="text-xs h-auto p-1"
                    >
                      {expandedGoalId === goal.id ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Hide History
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          View History
                        </>
                      )}
                    </Button>
                    <span className="text-sm text-muted-foreground" data-testid={`text-goal-progress-${goal.id}`}>
                      {getProgress(goal).toFixed(0)}% complete
                    </span>
                  </div>
                </div>
              )}

              {expandedGoalId === goal.id && goal.target_value && (
                <div className="mt-6 pt-6 border-t">
                  <GoalProgressHistory goalId={goal.id} unit={goal.unit || ''} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredGoals.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No goals found</h3>
              <p className="text-muted-foreground">Create your first goal to start tracking progress</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-2 block">Title</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="input-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Client</Label>
                <Select
                  value={formData.client_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select client</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Service</Label>
                <Select
                  value={formData.service_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, service_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger data-testid="select-service">
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All services</SelectItem>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="mb-2 block">Target Value</Label>
                <Input
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  step="0.01"
                  data-testid="input-target-value"
                />
              </div>
              <div>
                <Label className="mb-2 block">Current Value</Label>
                <Input
                  type="number"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  step="0.01"
                  data-testid="input-current-value"
                />
              </div>
              <div>
                <Label className="mb-2 block">Unit</Label>
                <Input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="leads, $, %"
                  data-testid="input-unit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <Label className="mb-2 block">Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  required
                  data-testid="input-target-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 flex-wrap pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-goal">
                {editingGoal ? 'Update' : 'Create'} Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {progressGoal && (
        <GoalProgressModal
          goal={progressGoal}
          onClose={() => setProgressGoal(null)}
          onSuccess={() => {
            loadGoals();
            if (expandedGoalId === progressGoal.id) {
              setExpandedGoalId(null);
              setTimeout(() => setExpandedGoalId(progressGoal.id), 100);
            }
          }}
        />
      )}
    </div>
  );
}
