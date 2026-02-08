import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Calendar as CalendarIcon, Award, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addWeeks } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

interface ResourceAllocation {
  id: string;
  employee_id: string;
  client_id: string;
  service_id: string;
  allocated_hours: number;
  week_start: string;
  profiles?: { full_name: string; max_capacity: number };
  clients?: { name: string };
  services?: { name: string };
}

interface TimeOffRequest {
  id: string;
  employee_id: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  profiles?: { full_name: string };
}

interface SkillEntry {
  id: string;
  employee_id: string;
  skill: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number | null;
  profiles?: { full_name: string };
}

export function ResourceManagementPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'capacity' | 'timeoff' | 'skills'>('capacity');
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [allocationFormData, setAllocationFormData] = useState({
    employee_id: '',
    client_id: '',
    service_id: '',
    allocated_hours: '',
    week_start: format(currentWeek, 'yyyy-MM-dd'),
  });

  const [timeOffFormData, setTimeOffFormData] = useState({
    employee_id: '',
    type: 'vacation' as TimeOffRequest['type'],
    start_date: '',
    end_date: '',
    reason: '',
  });

  const [skillFormData, setSkillFormData] = useState({
    employee_id: '',
    skill: '',
    proficiency: 'intermediate' as SkillEntry['proficiency'],
    years_experience: '',
  });

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  const loadData = async () => {
    await Promise.all([
      loadAllocations(),
      loadTimeOffRequests(),
      loadSkills(),
      loadEmployees(),
      loadClients(),
      loadServices(),
    ]);
  };

  const loadAllocations = async () => {
    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('resource_allocations')
      .select('*, profiles(full_name, max_capacity), clients(name), services(name)')
      .eq('week_start', weekStart);

    if (error) {
      console.error('Error loading allocations:', error);
    } else {
      setAllocations(data || []);
    }
  };

  const loadTimeOffRequests = async () => {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*, profiles(full_name)')
      .order('start_date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading time off:', error);
    } else {
      setTimeOffRequests(data || []);
    }
  };

  const loadSkills = async () => {
    const { data, error } = await supabase
      .from('skill_matrix')
      .select('*, profiles(full_name)')
      .order('skill');

    if (error) {
      console.error('Error loading skills:', error);
    } else {
      setSkills(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'active');
    if (data) setEmployees(data);
  };

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    if (data) setClients(data);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('id, name').eq('is_active', true);
    if (data) setServices(data);
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('resource_allocations').insert({
        ...allocationFormData,
        allocated_hours: Number(allocationFormData.allocated_hours),
      });

      if (error) throw error;
      showToast('Allocation saved successfully', 'success');
      setShowAllocationModal(false);
      loadAllocations();
    } catch (error: any) {
      console.error('Error saving allocation:', error);
      if (error.code === '23505') {
        showToast('Allocation already exists for this employee/client/service/week', 'error');
      } else {
        showToast('Failed to save allocation', 'error');
      }
    }
  };

  const handleTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('time_off_requests').insert(timeOffFormData);
      if (error) throw error;
      showToast('Time off request submitted', 'success');
      setShowTimeOffModal(false);
      loadTimeOffRequests();
    } catch (error) {
      console.error('Error submitting time off:', error);
      showToast('Failed to submit time off request', 'error');
    }
  };

  const handleTimeOffAction = async (id: string, status: 'approved' | 'rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status, approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      showToast(`Time off request ${status}`, 'success');
      loadTimeOffRequests();
    } catch (error) {
      console.error('Error updating time off:', error);
      showToast('Failed to update time off request', 'error');
    }
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('skill_matrix').insert({
        ...skillFormData,
        years_experience: skillFormData.years_experience ? Number(skillFormData.years_experience) : null,
      });

      if (error) throw error;
      showToast('Skill added successfully', 'success');
      setShowSkillModal(false);
      loadSkills();
    } catch (error: any) {
      console.error('Error saving skill:', error);
      if (error.code === '23505') {
        showToast('This skill already exists for this employee', 'error');
      } else {
        showToast('Failed to save skill', 'error');
      }
    }
  };

  const getUtilization = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const allocated = allocations
      .filter(a => a.employee_id === employeeId)
      .reduce((sum, a) => sum + a.allocated_hours, 0);
    const capacity = employee?.max_capacity || 40;
    return { allocated, capacity, percentage: (allocated / capacity) * 100 };
  };

  const getProficiencyVariant = (proficiency: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (proficiency) {
      case 'expert': return 'default';
      case 'advanced': return 'secondary';
      case 'intermediate': return 'outline';
      case 'beginner': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resource Management</h1>
          <p className="text-sm text-muted-foreground">Manage capacity, time off, and skills</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          data-testid="tab-capacity"
          variant={activeTab === 'capacity' ? 'default' : 'outline'}
          onClick={() => setActiveTab('capacity')}
        >
          Capacity Planning
        </Button>
        <Button
          data-testid="tab-timeoff"
          variant={activeTab === 'timeoff' ? 'default' : 'outline'}
          onClick={() => setActiveTab('timeoff')}
        >
          Time Off
        </Button>
        <Button
          data-testid="tab-skills"
          variant={activeTab === 'skills' ? 'default' : 'outline'}
          onClick={() => setActiveTab('skills')}
        >
          Skills Matrix
        </Button>
      </div>

      {activeTab === 'capacity' && (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              data-testid="button-prev-week"
              variant="outline"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Week
            </Button>
            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Week of {format(currentWeek, 'MMM d, yyyy')}
              </h2>
            </div>
            <Button
              data-testid="button-next-week"
              variant="outline"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              Next Week
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              data-testid="button-allocate"
              onClick={() => setShowAllocationModal(true)}
            >
              <Plus className="h-4 w-4" />
              Allocate
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map(allocation => {
                      const util = getUtilization(allocation.employee_id);
                      return (
                        <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                          <TableCell className="font-medium">{allocation.profiles?.full_name}</TableCell>
                          <TableCell>{allocation.clients?.name}</TableCell>
                          <TableCell>{allocation.services?.name}</TableCell>
                          <TableCell>{allocation.allocated_hours}h</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(util.percentage, 100)}
                                className="w-32"
                              />
                              <span className="text-sm text-muted-foreground">
                                {util.allocated}/{util.capacity}h
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {allocations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No allocations for this week
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'timeoff' && (
        <>
          <div className="flex justify-end">
            <Button
              data-testid="button-request-timeoff"
              onClick={() => setShowTimeOffModal(true)}
            >
              <Plus className="h-4 w-4" />
              Request Time Off
            </Button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {timeOffRequests.map(request => (
              <Card key={request.id} data-testid={`card-timeoff-${request.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{request.profiles?.full_name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{request.type}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      {request.reason && <p className="text-sm text-foreground mt-2">{request.reason}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getStatusVariant(request.status)} className="no-default-active-elevate no-default-hover-elevate capitalize">
                        {request.status}
                      </Badge>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            data-testid={`button-approve-${request.id}`}
                            size="sm"
                            onClick={() => handleTimeOffAction(request.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            data-testid={`button-reject-${request.id}`}
                            size="sm"
                            variant="destructive"
                            onClick={() => handleTimeOffAction(request.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {timeOffRequests.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No time off requests</h3>
                  <p className="text-muted-foreground">Time off requests will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {activeTab === 'skills' && (
        <>
          <div className="flex justify-end">
            <Button
              data-testid="button-add-skill"
              onClick={() => setShowSkillModal(true)}
            >
              <Plus className="h-4 w-4" />
              Add Skill
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Skill</TableHead>
                      <TableHead>Proficiency</TableHead>
                      <TableHead>Experience</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skills.map(skill => (
                      <TableRow key={skill.id} data-testid={`row-skill-${skill.id}`}>
                        <TableCell className="font-medium">{skill.profiles?.full_name}</TableCell>
                        <TableCell>{skill.skill}</TableCell>
                        <TableCell>
                          <Badge variant={getProficiencyVariant(skill.proficiency)} className="no-default-active-elevate no-default-hover-elevate capitalize">
                            {skill.proficiency}
                          </Badge>
                        </TableCell>
                        <TableCell>{skill.years_experience ? `${skill.years_experience} years` : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {skills.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No skills recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showAllocationModal} onOpenChange={setShowAllocationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocate Resources</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAllocationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={allocationFormData.employee_id}
                  onValueChange={(value) => setAllocationFormData({ ...allocationFormData, employee_id: value })}
                >
                  <SelectTrigger data-testid="select-allocation-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={allocationFormData.client_id}
                  onValueChange={(value) => setAllocationFormData({ ...allocationFormData, client_id: value })}
                >
                  <SelectTrigger data-testid="select-allocation-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={allocationFormData.service_id}
                  onValueChange={(value) => setAllocationFormData({ ...allocationFormData, service_id: value })}
                >
                  <SelectTrigger data-testid="select-allocation-service">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input
                  data-testid="input-allocation-hours"
                  type="number"
                  value={allocationFormData.allocated_hours}
                  onChange={(e) => setAllocationFormData({ ...allocationFormData, allocated_hours: e.target.value })}
                  min="0"
                  step="0.5"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                data-testid="button-cancel-allocation"
                type="button"
                variant="outline"
                onClick={() => setShowAllocationModal(false)}
              >
                Cancel
              </Button>
              <Button data-testid="button-submit-allocation" type="submit">
                Allocate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showTimeOffModal} onOpenChange={setShowTimeOffModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleTimeOffSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={timeOffFormData.employee_id}
                onValueChange={(value) => setTimeOffFormData({ ...timeOffFormData, employee_id: value })}
              >
                <SelectTrigger data-testid="select-timeoff-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={timeOffFormData.type}
                onValueChange={(value) => setTimeOffFormData({ ...timeOffFormData, type: value as any })}
              >
                <SelectTrigger data-testid="select-timeoff-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  data-testid="input-timeoff-start"
                  type="date"
                  value={timeOffFormData.start_date}
                  onChange={(e) => setTimeOffFormData({ ...timeOffFormData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  data-testid="input-timeoff-end"
                  type="date"
                  value={timeOffFormData.end_date}
                  onChange={(e) => setTimeOffFormData({ ...timeOffFormData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                data-testid="textarea-timeoff-reason"
                value={timeOffFormData.reason}
                onChange={(e) => setTimeOffFormData({ ...timeOffFormData, reason: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                data-testid="button-cancel-timeoff"
                type="button"
                variant="outline"
                onClick={() => setShowTimeOffModal(false)}
              >
                Cancel
              </Button>
              <Button data-testid="button-submit-timeoff" type="submit">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSkillModal} onOpenChange={setShowSkillModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSkillSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={skillFormData.employee_id}
                onValueChange={(value) => setSkillFormData({ ...skillFormData, employee_id: value })}
              >
                <SelectTrigger data-testid="select-skill-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Skill</Label>
              <Input
                data-testid="input-skill-name"
                type="text"
                value={skillFormData.skill}
                onChange={(e) => setSkillFormData({ ...skillFormData, skill: e.target.value })}
                placeholder="e.g., Google Ads, SEO, Content Writing"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proficiency</Label>
                <Select
                  value={skillFormData.proficiency}
                  onValueChange={(value) => setSkillFormData({ ...skillFormData, proficiency: value as any })}
                >
                  <SelectTrigger data-testid="select-skill-proficiency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  data-testid="input-skill-experience"
                  type="number"
                  value={skillFormData.years_experience}
                  onChange={(e) => setSkillFormData({ ...skillFormData, years_experience: e.target.value })}
                  min="0"
                  step="0.5"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                data-testid="button-cancel-skill"
                type="button"
                variant="outline"
                onClick={() => setShowSkillModal(false)}
              >
                Cancel
              </Button>
              <Button data-testid="button-submit-skill" type="submit">
                Add Skill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
