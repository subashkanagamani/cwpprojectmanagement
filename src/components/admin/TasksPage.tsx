import { useState, useEffect } from 'react';
import { CheckSquare, Plus, X, Edit2, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../Modal';
import { Table } from '../Table';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  assignee?: {
    full_name: string;
    email: string;
  };
  assigner?: {
    full_name: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { showToast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in_progress' | 'completed'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tasksResult, employeesResult] = await Promise.all([
        supabase
          .from('employee_tasks')
          .select(`
            *,
            assignee:profiles!assigned_to(full_name, email),
            assigner:profiles!assigned_by(full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'employee')
          .order('full_name')
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (employeesResult.error) throw employeesResult.error;

      setTasks(tasksResult.data || []);
      setEmployees(employeesResult.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'medium',
      status: 'pending'
    });
    setShowModal(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      due_date: task.due_date || '',
      priority: task.priority,
      status: task.status
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.assigned_to) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        assigned_to: formData.assigned_to,
        assigned_by: user!.id,
        due_date: formData.due_date || null,
        priority: formData.priority,
        status: formData.status
      };

      if (editingTask) {
        const { error } = await supabase
          .from('employee_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        showToast('Task updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('employee_tasks')
          .insert([taskData]);

        if (error) throw error;
        showToast('Task created successfully', 'success');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('employee_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Task deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignee?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800'
  };

  const columns = [
    { key: 'title', label: 'Task' },
    { key: 'assignee', label: 'Assigned To' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const rows = filteredTasks.map(task => ({
    title: (
      <div>
        <div className="font-medium text-gray-900">{task.title}</div>
        {task.description && (
          <div className="text-sm text-gray-500 mt-1">{task.description}</div>
        )}
      </div>
    ),
    assignee: (
      <div>
        <div className="font-medium text-gray-900">{task.assignee?.full_name}</div>
        <div className="text-sm text-gray-500">{task.assignee?.email}</div>
      </div>
    ),
    due_date: task.due_date ? (
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        {new Date(task.due_date).toLocaleDateString()}
      </div>
    ) : (
      <span className="text-gray-400">No due date</span>
    ),
    priority: (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
        {task.priority}
      </span>
    ),
    status: (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
        {task.status.replace('_', ' ')}
      </span>
    ),
    actions: (
      <div className="flex gap-2">
        <button
          onClick={() => openEditModal(task)}
          className="p-1 hover:bg-gray-100 rounded transition"
          aria-label="Edit task"
        >
          <Edit2 className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => handleDelete(task.id)}
          className="p-1 hover:bg-red-100 rounded transition"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    )
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-600 mt-1">Assign and track employee tasks</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tasks or employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <Table columns={columns} data={rows} />
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editingTask ? 'Edit Task' : 'Add Task'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingTask ? 'Update' : 'Create'} Task
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
