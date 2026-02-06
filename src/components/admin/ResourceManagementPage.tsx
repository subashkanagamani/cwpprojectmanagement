import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Calendar as CalendarIcon, Award, Plus, X } from 'lucide-react';
import { format, startOfWeek, addWeeks } from 'date-fns';
import { useToast } from '../../contexts/ToastContext';

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

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'expert': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'beginner': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
          <p className="text-gray-600 mt-1">Manage capacity, time off, and skills</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('capacity')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'capacity'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Capacity Planning
        </button>
        <button
          onClick={() => setActiveTab('timeoff')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'timeoff'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Time Off
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'skills'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          Skills Matrix
        </button>
      </div>

      {activeTab === 'capacity' && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              ← Previous Week
            </button>
            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold">
                Week of {format(currentWeek, 'MMM d, yyyy')}
              </h2>
            </div>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Next Week →
            </button>
            <button
              onClick={() => setShowAllocationModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              <Plus className="h-5 w-5" />
              Allocate
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allocations.map(allocation => {
                  const util = getUtilization(allocation.employee_id);
                  return (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{allocation.profiles?.full_name}</td>
                      <td className="px-6 py-4">{allocation.clients?.name}</td>
                      <td className="px-6 py-4">{allocation.services?.name}</td>
                      <td className="px-6 py-4">{allocation.allocated_hours}h</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                util.percentage > 100 ? 'bg-red-600' :
                                util.percentage > 80 ? 'bg-yellow-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(util.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {util.allocated}/{util.capacity}h
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'timeoff' && (
        <>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowTimeOffModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              <Plus className="h-5 w-5" />
              Request Time Off
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {timeOffRequests.map(request => (
              <div key={request.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{request.profiles?.full_name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{request.type}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                    </p>
                    {request.reason && <p className="text-sm text-gray-700 mt-2">{request.reason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTimeOffAction(request.id, 'approved')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleTimeOffAction(request.id, 'rejected')}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'skills' && (
        <>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowSkillModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              <Plus className="h-5 w-5" />
              Add Skill
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Skill</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Proficiency</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Experience</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {skills.map(skill => (
                  <tr key={skill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{skill.profiles?.full_name}</td>
                    <td className="px-6 py-4">{skill.skill}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProficiencyColor(skill.proficiency)}`}>
                        {skill.proficiency}
                      </span>
                    </td>
                    <td className="px-6 py-4">{skill.years_experience ? `${skill.years_experience} years` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAllocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Allocate Resources</h2>
              <button onClick={() => setShowAllocationModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAllocationSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                  <select
                    value={allocationFormData.employee_id}
                    onChange={(e) => setAllocationFormData({ ...allocationFormData, employee_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                  <select
                    value={allocationFormData.client_id}
                    onChange={(e) => setAllocationFormData({ ...allocationFormData, client_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <select
                    value={allocationFormData.service_id}
                    onChange={(e) => setAllocationFormData({ ...allocationFormData, service_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select service</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                  <input
                    type="number"
                    value={allocationFormData.allocated_hours}
                    onChange={(e) => setAllocationFormData({ ...allocationFormData, allocated_hours: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="0"
                    step="0.5"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Request Time Off</h2>
              <button onClick={() => setShowTimeOffModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTimeOffSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={timeOffFormData.employee_id}
                  onChange={(e) => setTimeOffFormData({ ...timeOffFormData, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={timeOffFormData.type}
                  onChange={(e) => setTimeOffFormData({ ...timeOffFormData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={timeOffFormData.start_date}
                    onChange={(e) => setTimeOffFormData({ ...timeOffFormData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={timeOffFormData.end_date}
                    onChange={(e) => setTimeOffFormData({ ...timeOffFormData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                <textarea
                  value={timeOffFormData.reason}
                  onChange={(e) => setTimeOffFormData({ ...timeOffFormData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowTimeOffModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSkillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Add Skill</h2>
              <button onClick={() => setShowSkillModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSkillSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={skillFormData.employee_id}
                  onChange={(e) => setSkillFormData({ ...skillFormData, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill</label>
                <input
                  type="text"
                  value={skillFormData.skill}
                  onChange={(e) => setSkillFormData({ ...skillFormData, skill: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Google Ads, SEO, Content Writing"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proficiency</label>
                  <select
                    value={skillFormData.proficiency}
                    onChange={(e) => setSkillFormData({ ...skillFormData, proficiency: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={skillFormData.years_experience}
                    onChange={(e) => setSkillFormData({ ...skillFormData, years_experience: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
