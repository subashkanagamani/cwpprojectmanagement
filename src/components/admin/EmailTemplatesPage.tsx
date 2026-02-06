import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Plus, Edit2, Trash2, X, Copy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  template_type: 'report_delivery' | 'deadline_reminder' | 'welcome' | 'status_update' | 'custom';
  variables: Record<string, string>;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string };
}

export function EmailTemplatesPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    template_type: 'custom' as EmailTemplate['template_type'],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        subject: template.subject,
        body: template.body,
        template_type: template.template_type,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        subject: '',
        body: '',
        template_type: 'custom',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        showToast('Template updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            ...formData,
            created_by: user.id,
            variables: {},
          });

        if (error) throw error;
        showToast('Template created successfully', 'success');
      }

      setShowModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showToast('Failed to save template', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Template deleted successfully', 'success');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template', 'error');
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body: template.body,
      template_type: template.template_type,
    });
    setEditingTemplate(null);
    setShowModal(true);
  };

  const getTypeColor = (type: EmailTemplate['template_type']) => {
    const colors = {
      report_delivery: 'bg-blue-100 text-blue-800',
      deadline_reminder: 'bg-yellow-100 text-yellow-800',
      welcome: 'bg-green-100 text-green-800',
      status_update: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">Manage email templates for automated communications</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          <Plus className="h-5 w-5" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[700px] overflow-y-auto">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(template.template_type)}`}>
                  {template.template_type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDuplicate(template)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => openModal(template)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Subject</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{template.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Body Preview</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-wrap line-clamp-3">
                  {template.body}
                </p>
              </div>
              <div className="pt-3 border-t text-xs text-gray-500">
                Created by {template.profiles?.full_name || 'Unknown'}
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No email templates yet</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first template
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Weekly Report Delivery"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value as EmailTemplate['template_type'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="report_delivery">Report Delivery</option>
                  <option value="deadline_reminder">Deadline Reminder</option>
                  <option value="welcome">Welcome</option>
                  <option value="status_update">Status Update</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Your Weekly Report is Ready"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg resize-none font-mono text-sm"
                  rows={12}
                  placeholder="Hi {{client_name}},&#10;&#10;Your weekly report for {{week_date}} is now available...&#10;&#10;Available variables: {{client_name}}, {{week_date}}, {{employee_name}}, {{report_link}}"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use variables like {'{{'} client_name{'}}'}, {'{{'} week_date{'}}'}, {'{{'} employee_name{'}}'}, {'{{'} report_link {'}}'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
