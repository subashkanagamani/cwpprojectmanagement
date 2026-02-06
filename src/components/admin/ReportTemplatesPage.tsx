import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../Modal';
import FormInput from '../forms/FormInput';
import FormTextArea from '../forms/FormTextArea';
import FormSelect from '../forms/FormSelect';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  default_client_id: string | null;
  template_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  created_by: string;
  profiles?: { full_name: string };
  clients?: { name: string };
}

interface Client {
  id: string;
  name: string;
}

export default function ReportTemplatesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_client_id: '',
    work_summary: '',
    key_wins: '',
    challenges: '',
    next_week_plan: '',
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
    fetchClients();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select(`
          *,
          profiles:created_by(full_name),
          clients:default_client_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const templateData = {
      work_summary: formData.work_summary,
      key_wins: formData.key_wins,
      challenges: formData.challenges,
      next_week_plan: formData.next_week_plan,
    };

    const payload = {
      name: formData.name,
      description: formData.description,
      default_client_id: formData.default_client_id || null,
      template_data: templateData,
      is_active: formData.is_active,
      created_by: user?.id,
    };

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('report_templates')
          .update(payload)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        showToast('Template updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('report_templates')
          .insert(payload);

        if (error) throw error;
        showToast('Template created successfully', 'success');
      }

      setIsModalOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      showToast('Failed to save template', 'error');
    }
  };

  const handleEdit = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      default_client_id: template.default_client_id || '',
      work_summary: template.template_data?.work_summary || '',
      key_wins: template.template_data?.key_wins || '',
      challenges: template.template_data?.challenges || '',
      next_week_plan: template.template_data?.next_week_plan || '',
      is_active: template.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = async (template: ReportTemplate) => {
    const payload = {
      name: `${template.name} (Copy)`,
      description: template.description,
      default_client_id: template.default_client_id,
      template_data: template.template_data,
      is_active: true,
      created_by: user?.id,
    };

    try {
      const { error } = await supabase
        .from('report_templates')
        .insert(payload);

      if (error) throw error;
      showToast('Template duplicated successfully', 'success');
      fetchTemplates();
    } catch (error) {
      showToast('Failed to duplicate template', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Template deleted successfully', 'success');
      fetchTemplates();
    } catch (error) {
      showToast('Failed to delete template', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      default_client_id: '',
      work_summary: '',
      key_wins: '',
      challenges: '',
      next_week_plan: '',
      is_active: true,
    });
    setEditingTemplate(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
          <p className="text-gray-600">Create reusable templates for weekly reports</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Template
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  template.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {template.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {template.description && (
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            )}

            {template.clients && (
              <p className="text-sm text-gray-500 mb-4">
                Default Client: {template.clients.name}
              </p>
            )}

            <div className="text-xs text-gray-500 mb-4">
              Created by {template.profiles?.full_name || 'Unknown'}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(template)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDuplicate(template)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-600 mb-4">Create your first report template to get started</p>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Template
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <FormTextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />

          <FormSelect
            label="Default Client (Optional)"
            value={formData.default_client_id}
            onChange={(e) => setFormData({ ...formData, default_client_id: e.target.value })}
          >
            <option value="">None</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </FormSelect>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Default Content</h4>

            <FormTextArea
              label="Work Summary Template"
              value={formData.work_summary}
              onChange={(e) => setFormData({ ...formData, work_summary: e.target.value })}
              rows={3}
              placeholder="Enter default text for work summary..."
            />

            <FormTextArea
              label="Key Wins Template"
              value={formData.key_wins}
              onChange={(e) => setFormData({ ...formData, key_wins: e.target.value })}
              rows={3}
              placeholder="Enter default text for key wins..."
            />

            <FormTextArea
              label="Challenges Template"
              value={formData.challenges}
              onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
              rows={3}
              placeholder="Enter default text for challenges..."
            />

            <FormTextArea
              label="Next Week Plan Template"
              value={formData.next_week_plan}
              onChange={(e) => setFormData({ ...formData, next_week_plan: e.target.value })}
              rows={3}
              placeholder="Enter default text for next week plan..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active (available for use)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingTemplate ? 'Update' : 'Create'} Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
