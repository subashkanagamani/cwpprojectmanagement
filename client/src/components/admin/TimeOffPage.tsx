import { useState, useEffect } from 'react';
import { Calendar, Plus, Check, X, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';

interface TimeOffRequest {
  id: string;
  employee_id: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  employee?: {
    full_name: string;
    email: string;
    role: string;
  };
  approver?: {
    full_name: string;
  };
}

export function TimeOffPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(profile?.role === 'admin' ? 'pending' : 'my-requests');
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [myRequests, setMyRequests] = useState<TimeOffRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'vacation' as TimeOffRequest['type'],
    start_date: '',
    end_date: '',
    reason: '',
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'account_manager';

  useEffect(() => {
    if (isAdmin) {
      loadPendingRequests();
    }
    loadMyRequests();
  }, []);

  async function loadPendingRequests() {
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          employee:profiles!employee_id(full_name, email, role)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading time off requests:', error);
    }
  }

  async function loadMyRequests() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          approver:profiles!approved_by(full_name)
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error('Error loading my requests:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!formData.start_date || !formData.end_date) {
      showToast('Please select both start and end dates', 'error');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      showToast('End date must be after start date', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('time_off_requests').insert({
        employee_id: profile.id,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || null,
        status: 'pending',
      });

      if (error) throw error;

      showToast('Time off request submitted successfully', 'success');
      setShowModal(false);
      setFormData({
        type: 'vacation',
        start_date: '',
        end_date: '',
        reason: '',
      });
      loadMyRequests();
    } catch (error: any) {
      showToast(error.message || 'Failed to submit request', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      showToast('Request approved', 'success');
      loadPendingRequests();
    } catch (error: any) {
      showToast(error.message || 'Failed to approve request', 'error');
    }
  }

  async function handleReject(requestId: string) {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({
          status: 'rejected',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      showToast('Request rejected', 'success');
      loadPendingRequests();
    } catch (error: any) {
      showToast(error.message || 'Failed to reject request', 'error');
    }
  }

  const getStatusBadge = (status: TimeOffRequest['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getTypeLabel = (type: TimeOffRequest['type']) => {
    const labels = {
      vacation: 'Vacation',
      sick: 'Sick Leave',
      personal: 'Personal',
      other: 'Other',
    };
    return labels[type];
  };

  const getDaysCount = (request: TimeOffRequest) => {
    const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Time Off</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Manage team time off requests' : 'Request and manage your time off'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Time Off
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full max-w-md ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {isAdmin && (
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
              {requests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              All Requests
            </TabsTrigger>
          )}
          <TabsTrigger value="my-requests" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            My Requests
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              {requests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No pending requests
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      All time off requests have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                requests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-semibold text-lg text-foreground">
                              {request.employee?.full_name}
                            </div>
                            {getStatusBadge(request.status)}
                            <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {request.employee?.role} • {request.employee?.email}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                              <div className="text-sm font-medium">
                                {format(new Date(request.start_date), 'MMM d, yyyy')}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">End Date</div>
                              <div className="text-sm font-medium">
                                {format(new Date(request.end_date), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Duration: {getDaysCount(request)} day{getDaysCount(request) > 1 ? 's' : ''}
                          </div>
                          {request.reason && (
                            <div className="mt-3 p-3 bg-muted rounded-md">
                              <div className="text-xs text-muted-foreground mb-1">Reason</div>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(request.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(request.id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="my-requests" className="mt-6">
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No time off requests
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Click "Request Time Off" to submit your first request
                  </p>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusBadge(request.status)}
                          <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                            <div className="text-sm font-medium">
                              {format(new Date(request.start_date), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">End Date</div>
                            <div className="text-sm font-medium">
                              {format(new Date(request.end_date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          Duration: {getDaysCount(request)} day{getDaysCount(request) > 1 ? 's' : ''}
                        </div>
                        {request.reason && (
                          <div className="p-3 bg-muted rounded-md mb-2">
                            <div className="text-xs text-muted-foreground mb-1">Reason</div>
                            <p className="text-sm">{request.reason}</p>
                          </div>
                        )}
                        {request.status !== 'pending' && request.approver && (
                          <div className="text-xs text-muted-foreground">
                            {request.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                            {request.approver.full_name} on{' '}
                            {format(new Date(request.approved_at!), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {formData.start_date && formData.end_date && (
              <div className="p-3 bg-primary/10 rounded-md text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1} day(s) requested
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Add any additional details..."
                rows={4}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
