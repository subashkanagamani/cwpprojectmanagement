import { useState, useEffect } from 'react';
import { Settings, Save, User, Bell, Globe, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface UserPreference {
  theme: string;
  language: string;
  timezone: string;
  date_format: string;
  email_notifications: boolean;
  push_notifications: boolean;
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreference>({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    email_notifications: true,
    push_notifications: true
  });
  const { showToast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    loadPreferences();
  }, [user]);

  async function loadPreferences() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          theme: data.theme || 'light',
          language: data.language || 'en',
          timezone: data.timezone || 'UTC',
          date_format: data.date_format || 'MM/DD/YYYY',
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true
        });
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      showToast('Settings saved successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-4 pl-7">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-6 w-40" />
            <div className="space-y-4 pl-7">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and notifications</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                Profile Information
              </h2>
              <div className="space-y-4 pl-7">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    data-testid="input-full-name"
                    type="text"
                    value={profile?.full_name || ''}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                Regional Settings
              </h2>
              <div className="space-y-4 pl-7">
                <div>
                  <Label>Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                  >
                    <SelectTrigger data-testid="select-language" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Timezone
                  </Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                  >
                    <SelectTrigger data-testid="select-timezone" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={preferences.date_format}
                    onValueChange={(value) => setPreferences({ ...preferences, date_format: value })}
                  >
                    <SelectTrigger data-testid="select-date-format" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                  <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                Notification Preferences
              </h2>
              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between gap-4 flex-wrap p-3.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    data-testid="switch-email-notifications"
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, email_notifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap p-3.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive push notifications in the app</p>
                  </div>
                  <Switch
                    data-testid="switch-push-notifications"
                    checked={preferences.push_notifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, push_notifications: checked })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-4 flex-wrap">
              <Button
                data-testid="button-save-settings"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
