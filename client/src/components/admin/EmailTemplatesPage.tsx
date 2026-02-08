import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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

  const getTypeBadgeVariant = (type: EmailTemplate['template_type']): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'report_delivery': return 'default';
      case 'deadline_reminder': return 'secondary';
      case 'welcome': return 'default';
      case 'status_update': return 'outline';
      case 'custom': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Manage email templates for automated communications</p>
        </div>
        <Button data-testid="button-create-template" onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[700px] overflow-y-auto">
        {templates.map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                  </div>
                  <Badge variant={getTypeBadgeVariant(template.template_type)} data-testid={`badge-type-${template.id}`}>
                    {template.template_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(template)}
                    aria-label="Duplicate"
                    data-testid={`button-duplicate-${template.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openModal(template)}
                    aria-label="Edit"
                    data-testid={`button-edit-${template.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                    aria-label="Delete"
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm text-foreground bg-muted p-2 rounded-md">{template.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Body Preview</p>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md whitespace-pre-wrap line-clamp-3">
                    {template.body}
                  </p>
                </div>
                <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                  Created by {template.profiles?.full_name || 'Unknown'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No email templates yet</p>
              <Button
                variant="ghost"
                onClick={() => openModal()}
                className="mt-4"
                data-testid="button-create-first-template"
              >
                Create your first template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                data-testid="input-template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Report Delivery"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-type">
                Template Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.template_type}
                onValueChange={(value) => setFormData({ ...formData, template_type: value as EmailTemplate['template_type'] })}
              >
                <SelectTrigger data-testid="select-template-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report_delivery">Report Delivery</SelectItem>
                  <SelectItem value="deadline_reminder">Deadline Reminder</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="status_update">Status Update</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-subject">
                Subject Line <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-subject"
                data-testid="input-template-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Your Weekly Report is Ready"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-body">
                Email Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="template-body"
                data-testid="input-template-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="font-mono text-sm"
                rows={12}
                placeholder={"Hi {{client_name}},\n\nYour weekly report for {{week_date}} is now available...\n\nAvailable variables: {{client_name}}, {{week_date}}, {{employee_name}}, {{report_link}}"}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {'{{'} client_name{'}}'}, {'{{'} week_date{'}}'}, {'{{'} employee_name{'}}'}, {'{{'} report_link {'}}'}
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-template"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-template">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
