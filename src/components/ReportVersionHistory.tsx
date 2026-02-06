import { useState, useEffect } from 'react';
import { History, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';

interface ReportVersion {
  id: string;
  version: number;
  data: any;
  changed_by: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface ReportVersionHistoryProps {
  reportId: string;
  onClose: () => void;
  onRestore?: () => void;
}

export function ReportVersionHistory({ reportId, onClose, onRestore }: ReportVersionHistoryProps) {
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadVersions();
  }, [reportId]);

  async function loadVersions() {
    try {
      const { data, error } = await supabase
        .from('report_revisions')
        .select(`
          *,
          profile:profiles!changed_by(full_name, email)
        `)
        .eq('report_id', reportId)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(versionId: string, versionData: any) {
    if (!confirm('Are you sure you want to restore this version? This will create a new version with this data.')) {
      return;
    }

    try {
      const { data: currentReport, error: fetchError } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('weekly_reports')
        .update({
          status: versionData.status || currentReport.status,
          work_summary: versionData.work_summary || currentReport.work_summary,
          wins: versionData.wins || currentReport.wins,
          challenges: versionData.challenges || currentReport.challenges,
          next_week_plan: versionData.next_week_plan || currentReport.next_week_plan,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      showToast('Version restored successfully', 'success');
      if (onRestore) onRestore();
      onClose();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function toggleExpand(versionId: string) {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close version history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No version history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
                          Version {version.version}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Modified by:</span>{' '}
                          {version.profile?.full_name || 'Unknown'}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span>{' '}
                          {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleExpand(version.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label={expandedVersion === version.id ? 'Collapse details' : 'Expand details'}
                      >
                        {expandedVersion === version.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                      {index !== 0 && (
                        <button
                          onClick={() => handleRestore(version.id, version.data)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedVersion === version.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {version.data.status && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Status:</p>
                          <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded">
                            {version.data.status}
                          </p>
                        </div>
                      )}
                      {version.data.work_summary && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Work Summary:</p>
                          <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded whitespace-pre-wrap">
                            {version.data.work_summary}
                          </p>
                        </div>
                      )}
                      {version.data.wins && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Wins:</p>
                          <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded whitespace-pre-wrap">
                            {version.data.wins}
                          </p>
                        </div>
                      )}
                      {version.data.challenges && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Challenges:</p>
                          <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded whitespace-pre-wrap">
                            {version.data.challenges}
                          </p>
                        </div>
                      )}
                      {version.data.next_week_plan && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Next Week Plan:</p>
                          <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded whitespace-pre-wrap">
                            {version.data.next_week_plan}
                          </p>
                        </div>
                      )}
                      {version.data.metrics && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Metrics:</p>
                          <pre className="text-xs text-gray-600 px-3 py-2 bg-gray-50 rounded overflow-x-auto">
                            {JSON.stringify(version.data.metrics, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
