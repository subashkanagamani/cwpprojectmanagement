import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment } from '../../lib/database.types';
import { Briefcase, FileText } from 'lucide-react';

interface AssignmentWithDetails extends ClientAssignment {
  client?: Client;
  service?: Service;
}

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    try {
      const { data: assignmentsData, error } = await supabase
        .from('client_assignments')
        .select('*')
        .eq('employee_id', user!.id);

      if (error) throw error;

      if (assignmentsData) {
        const assignmentsWithDetails = await Promise.all(
          assignmentsData.map(async (assignment) => {
            const [clientRes, serviceRes] = await Promise.all([
              supabase.from('clients').select('*').eq('id', assignment.client_id).single(),
              supabase.from('services').select('*').eq('id', assignment.service_id).single(),
            ]);

            return {
              ...assignment,
              client: clientRes.data || undefined,
              service: serviceRes.data || undefined,
            };
          })
        );
        setAssignments(assignmentsWithDetails);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedByClient = assignments.reduce((acc, assignment) => {
    const clientId = assignment.client_id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: assignment.client,
        services: [],
      };
    }
    if (assignment.service) {
      acc[clientId].services.push(assignment.service);
    }
    return acc;
  }, {} as Record<string, { client?: Client; services: Service[] }>);

  if (loading) {
    return <div className="text-center py-12">Loading your clients...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
        <p className="text-gray-600 mt-1">View and manage your assigned clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(groupedByClient).map(({ client, services }) => {
          if (!client) return null;

          return (
            <div
              key={client.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden"
            >
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                </div>
                {client.industry && (
                  <p className="text-sm text-gray-600">{client.industry}</p>
                )}
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Your Roles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <span
                        key={service.id}
                        className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                      >
                        {service.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      client.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : client.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {client.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    Since {new Date(client.start_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {Object.keys(groupedByClient).length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No clients assigned yet. Contact your admin for assignments.
            </p>
          </div>
        )}
      </div>

      {Object.keys(groupedByClient).length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Submit Weekly Reports</h3>
              <p className="text-sm text-gray-700 mb-3">
                Navigate to the Reports section to submit your weekly updates for each client and
                service you're assigned to.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
