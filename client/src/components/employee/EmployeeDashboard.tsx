import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client, Service, ClientAssignment } from '../../lib/database.types';
import { Briefcase, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Clients</h1>
          <p className="text-sm text-muted-foreground">View and manage your assigned clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(groupedByClient).map(({ client, services }) => {
          if (!client) return null;

          return (
            <Card key={client.id} data-testid={`card-client-${client.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-primary p-2 rounded-md">
                    <Briefcase className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg" data-testid={`text-client-name-${client.id}`}>{client.name}</CardTitle>
                </div>
                {client.industry && (
                  <p className="text-sm text-muted-foreground">{client.industry}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Your Roles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Badge
                        key={service.id}
                        variant="secondary"
                        data-testid={`badge-service-${service.id}`}
                      >
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      client.status === 'active'
                        ? 'default'
                        : client.status === 'paused'
                        ? 'outline'
                        : 'secondary'
                    }
                    data-testid={`badge-status-${client.id}`}
                  >
                    {client.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Since {new Date(client.start_date).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {Object.keys(groupedByClient).length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-clients">
                No clients assigned yet. Contact your admin for assignments.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {Object.keys(groupedByClient).length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3 flex-wrap">
              <FileText className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Submit Weekly Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Navigate to the Reports section to submit your weekly updates for each client and
                  service you're assigned to.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
