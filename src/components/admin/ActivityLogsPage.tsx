import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ActivityLog, Profile } from '../../lib/database.types';
import { Clock, User, FileText, Download } from 'lucide-react';
import { exportToCSV } from '../../utils/exportData';

interface ActivityLogWithUser extends ActivityLog {
  user?: Profile;
}

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (logsData) {
        const logsWithUsers = logsData.map((log: any) => ({
          ...log,
          user: log.profiles || undefined,
        }));
        setLogs(logsWithUsers);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterEntity !== 'all' && log.entity_type !== filterEntity) return false;
    if (searchTerm && !JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleExport = () => {
    const exportData = filteredLogs.map((log) => ({
      timestamp: new Date(log.created_at).toLocaleString(),
      user: log.user?.full_name || 'System',
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      ip_address: log.ip_address,
    }));
    exportToCSV(exportData, `activity_logs_${new Date().toISOString().split('T')[0]}`);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading activity logs...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">Audit trail of all system activities</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Download className="h-5 w-5" />
          Export Logs
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="INSERT">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="clients">Clients</option>
              <option value="profiles">Employees</option>
              <option value="client_assignments">Assignments</option>
              <option value="weekly_reports">Reports</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      {log.user?.full_name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {log.entity_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.ip_address || '-'}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No activity logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  );
}
