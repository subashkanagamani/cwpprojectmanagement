import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Report Templates</h1>
          <p className="text-sm text-muted-foreground">Create reusable templates for weekly reports</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          data-testid="button-new-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.id}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                <Badge
                  variant={template.is_active ? 'default' : 'secondary'}
                  className="no-default-active-elevate"
                >
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}

              {template.clients && (
                <p className="text-sm text-muted-foreground">
                  Default Client: {template.clients.name}
                </p>
              )}

              <div className="text-xs text-muted-foreground">
                Created by {template.profiles?.full_name || 'Unknown'}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(template)}
                  data-testid={`button-edit-template-${template.id}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDuplicate(template)}
                  data-testid={`button-duplicate-template-${template.id}`}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(template.id)}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">Create your first report template to get started</p>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            data-testid="button-new-template-empty"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-template-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                data-testid="input-template-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Client (Optional)</Label>
              <Select
                value={formData.default_client_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, default_client_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger data-testid="select-default-client">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Default Content</h4>

              <div className="space-y-2">
                <Label htmlFor="work-summary">Work Summary Template</Label>
                <Textarea
                  id="work-summary"
                  value={formData.work_summary}
                  onChange={(e) => setFormData({ ...formData, work_summary: e.target.value })}
                  rows={3}
                  placeholder="Enter default text for work summary..."
                  data-testid="input-work-summary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-wins">Key Wins Template</Label>
                <Textarea
                  id="key-wins"
                  value={formData.key_wins}
                  onChange={(e) => setFormData({ ...formData, key_wins: e.target.value })}
                  rows={3}
                  placeholder="Enter default text for key wins..."
                  data-testid="input-key-wins"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenges">Challenges Template</Label>
                <Textarea
                  id="challenges"
                  value={formData.challenges}
                  onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  rows={3}
                  placeholder="Enter default text for challenges..."
                  data-testid="input-challenges"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next-week-plan">Next Week Plan Template</Label>
                <Textarea
                  id="next-week-plan"
                  value={formData.next_week_plan}
                  onChange={(e) => setFormData({ ...formData, next_week_plan: e.target.value })}
                  rows={3}
                  placeholder="Enter default text for next week plan..."
                  data-testid="input-next-week-plan"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                data-testid="checkbox-is-active"
              />
              <Label htmlFor="is_active" className="text-sm">
                Active (available for use)
              </Label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-template"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-template">
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
