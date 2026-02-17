import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, DollarSign, Target, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Modal } from "../Modal";
import { Badge } from "@/components/ui/badge";

interface Deal {
  id: string;
  client_id: string;
  deal_name: string;
  deal_value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  owner_id: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  clients?: { name: string };
  profiles?: { full_name: string };
}

interface Client {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
}

const stages = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-gray-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_id: "",
    deal_name: "",
    deal_value: "",
    stage: "prospecting",
    probability: "0",
    expected_close_date: "",
    owner_id: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    fetchDeals();
    fetchClients();
    fetchEmployees();
  }, [filterStage, filterStatus]);

  const fetchDeals = async () => {
    try {
      let query = supabase
        .from("deals")
        .select(`
          *,
          clients(name),
          profiles(full_name)
        `)
        .order("created_at", { ascending: false });

      if (filterStage !== "all") {
        query = query.eq("stage", filterStage);
      }
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeals(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dealData = {
        client_id: formData.client_id,
        deal_name: formData.deal_name,
        deal_value: parseFloat(formData.deal_value) || 0,
        stage: formData.stage,
        probability: parseInt(formData.probability) || 0,
        expected_close_date: formData.expected_close_date || null,
        owner_id: formData.owner_id,
        notes: formData.notes,
        status: formData.status,
      };

      if (editingDeal) {
        const { error } = await supabase
          .from("deals")
          .update({ ...dealData, updated_at: new Date().toISOString() })
          .eq("id", editingDeal.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Deal updated successfully",
        });
      } else {
        const { error } = await supabase.from("deals").insert([dealData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Deal created successfully",
        });
      }

      setShowModal(false);
      resetForm();
      fetchDeals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      client_id: deal.client_id,
      deal_name: deal.deal_name,
      deal_value: deal.deal_value.toString(),
      stage: deal.stage,
      probability: deal.probability.toString(),
      expected_close_date: deal.expected_close_date || "",
      owner_id: deal.owner_id,
      notes: deal.notes,
      status: deal.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      deal_name: "",
      deal_value: "",
      stage: "prospecting",
      probability: "0",
      expected_close_date: "",
      owner_id: "",
      notes: "",
      status: "active",
    });
    setEditingDeal(null);
  };

  const getStageBadgeColor = (stage: string) => {
    const stageObj = stages.find(s => s.value === stage);
    return stageObj?.color || 'bg-gray-500';
  };

  const calculatePipelineMetrics = () => {
    const activeDeals = deals.filter(d => d.status === 'active');
    const totalValue = activeDeals.reduce((sum, deal) => sum + deal.deal_value, 0);
    const weightedValue = activeDeals.reduce((sum, deal) => sum + (deal.deal_value * deal.probability / 100), 0);
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const wonValue = wonDeals.reduce((sum, deal) => sum + deal.deal_value, 0);

    return { totalValue, weightedValue, wonValue, activeCount: activeDeals.length };
  };

  const metrics = calculatePipelineMetrics();

  if (loading) {
    return <div className="p-6">Loading deals...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deals Pipeline</h1>
          <p className="text-muted-foreground">Manage your sales pipeline and track deal progress</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.weightedValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.wonValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pipeline Overview</CardTitle>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No deals found</p>
            ) : (
              deals.map((deal) => (
                <div
                  key={deal.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEdit(deal)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{deal.deal_name}</h3>
                        <Badge className={getStageBadgeColor(deal.stage) + " text-white"}>
                          {stages.find(s => s.value === deal.stage)?.label}
                        </Badge>
                        {deal.status !== 'active' && (
                          <Badge variant="outline">{deal.status}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Client:</span> {deal.clients?.name}
                        </div>
                        <div>
                          <span className="font-medium">Value:</span> ${deal.deal_value.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Probability:</span> {deal.probability}%
                        </div>
                        <div>
                          <span className="font-medium">Owner:</span> {deal.profiles?.full_name}
                        </div>
                      </div>
                      {deal.expected_close_date && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Expected Close:</span>{" "}
                          {new Date(deal.expected_close_date).toLocaleDateString()}
                        </div>
                      )}
                      {deal.notes && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Notes:</span> {deal.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingDeal ? "Edit Deal" : "Add New Deal"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="deal_name">Deal Name *</Label>
            <Input
              id="deal_name"
              value={formData.deal_name}
              onChange={(e) => setFormData({ ...formData, deal_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="client_id">Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deal_value">Deal Value ($)</Label>
              <Input
                id="deal_value"
                type="number"
                step="0.01"
                value={formData.deal_value}
                onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage">Stage *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="expected_close_date">Expected Close Date</Label>
            <Input
              id="expected_close_date"
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="owner_id">Deal Owner *</Label>
            <Select
              value={formData.owner_id}
              onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDeal ? "Update Deal" : "Create Deal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
