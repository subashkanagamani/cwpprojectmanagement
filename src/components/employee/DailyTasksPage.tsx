import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertTriangle,
  Building2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  client_id?: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  status: 'pending' | 'completed';
  completed_at?: string;
  remarks?: string;
  created_at: string;
  clients?: {
    name: string;
  };
}

export function DailyTasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState('');

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          clients(name)
        `)
        .eq('assigned_to', user!.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      showToast(
        newStatus === 'completed' ? 'Task marked as completed' : 'Task marked as pending',
        'success'
      );
      loadTasks();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const saveRemarks = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ remarks: remarksText })
        .eq('id', taskId);

      if (error) throw error;

      showToast('Remarks saved successfully', 'success');
      setEditingRemarks(null);
      setRemarksText('');
      loadTasks();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const isOverdue = (task: Task) => {
    return task.status === 'pending' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  };

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const startEditingRemarks = (task: Task) => {
    setEditingRemarks(task.id);
    setRemarksText(task.remarks || '');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(priority)}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'today') {
      return isToday(parseISO(task.due_date));
    } else if (filter === 'overdue') {
      return isOverdue(task);
    }
    return true;
  });

  // Sort tasks: overdue on top, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // If both overdue or both not overdue, sort by priority then date
    if (a.priority !== b.priority) {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(isOverdue);
  const todayTasks = tasks.filter(t => isToday(parseISO(t.due_date)));

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Daily Tasks</h1>
        <p className="text-gray-600">Manage your tasks and track your daily progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-900">{tasks.length}</p>
            </div>
            <Calendar className="h-10 w-10 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingTasks.length}</p>
            </div>
            <Circle className="h-10 w-10 text-yellow-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-900">{overdueTasks.length}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-900">{completedTasks.length}</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-green-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today ({todayTasks.length})
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'overdue'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overdue ({overdueTasks.length})
            </button>
          </div>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No tasks found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'all'
              ? "You don't have any tasks assigned yet"
              : `No ${filter} tasks`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const overdue = isOverdue(task);
            const today = isToday(parseISO(task.due_date));
            const expanded = expandedTasks.has(task.id);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                  overdue && task.status === 'pending'
                    ? 'border-red-300 bg-red-50'
                    : task.status === 'completed'
                    ? 'border-green-200 bg-green-50 opacity-75'
                    : today
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={`mt-1 flex-shrink-0 transition-transform hover:scale-110 ${
                        task.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-7 w-7" />
                      ) : (
                        <Circle className="h-7 w-7" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3
                            className={`text-lg font-semibold mb-2 ${
                              task.status === 'completed'
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            {task.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3">
                            {getPriorityBadge(task.priority)}

                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span className={overdue && task.status === 'pending' ? 'text-red-700 font-semibold' : ''}>
                                {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                {today && ' (Today)'}
                                {overdue && task.status === 'pending' && ' - OVERDUE'}
                              </span>
                            </div>

                            {task.clients && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Building2 className="h-4 w-4" />
                                <span>{task.clients.name}</span>
                              </div>
                            )}

                            {task.status === 'completed' && task.completed_at && (
                              <span className="text-xs text-green-700 font-medium">
                                Completed {format(parseISO(task.completed_at), 'MMM d, h:mm a')}
                              </span>
                            )}
                          </div>
                        </div>

                        {overdue && task.status === 'pending' && (
                          <div className="flex-shrink-0">
                            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                              <AlertTriangle className="h-4 w-4" />
                              OVERDUE
                            </div>
                          </div>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-gray-700 mb-3 text-sm">{task.description}</p>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExpanded(task.id)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {expanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show Details
                            </>
                          )}
                        </button>

                        {task.status === 'pending' && (
                          <button
                            onClick={() => startEditingRemarks(task)}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {task.remarks ? 'Edit Remarks' : 'Add Remarks'}
                          </button>
                        )}
                      </div>

                      {expanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Task Remarks
                            </h4>

                            {editingRemarks === task.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={remarksText}
                                  onChange={(e) => setRemarksText(e.target.value)}
                                  placeholder="Add your remarks about this task..."
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveRemarks(task.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                  >
                                    Save Remarks
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRemarks(null);
                                      setRemarksText('');
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {task.remarks ? (
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.remarks}</p>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No remarks added yet</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
