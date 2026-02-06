import { useState, useEffect } from 'react';
import { Settings, Save, User, Bell, Globe, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and notifications</p>
      </div>

      <div className="bg-white rounded-lg shadow space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <User className="w-5 h-5" />
            Profile Information
          </h2>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profile?.full_name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5" />
            Regional Settings
          </h2>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Timezone
              </label>
              <select
                value={preferences.timezone}
                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                value={preferences.date_format}
                onChange={(e) => setPreferences({ ...preferences, date_format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </h2>
          <div className="space-y-4 pl-7">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.email_notifications}
                onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                <p className="text-xs text-gray-500">Receive notifications via email</p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.push_notifications}
                onChange={(e) => setPreferences({ ...preferences, push_notifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Push Notifications</span>
                <p className="text-xs text-gray-500">Receive push notifications in the app</p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition ${
              saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
