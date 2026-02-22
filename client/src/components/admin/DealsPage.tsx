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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, TrendingUp, DollarSign, Target, CheckCircle2, XCircle, Trash2, Edit2, ChevronRight } from "lucide-react";
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
  { value: 'prospecting', label: 'Prospecting', color: 'bg-muted-foreground' },
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deal deleted successfully",
      });
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
    return stageObj?.color || 'bg-muted-foreground';
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
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-5 w-40 mb-4" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 mb-3" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage your sales pipeline and track deal progress</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </div>

      <div className="animate-fade-up grid grid-cols-1 md:grid-cols-4 gap-5" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Deals</p>
                <p className="text-2xl font-bold text-foreground">{metrics.activeCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-foreground">${metrics.totalValue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Weighted Value</p>
                <p className="text-2xl font-bold text-foreground">${metrics.weightedValue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient orange">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Won Deals</p>
                <p className="text-2xl font-bold text-foreground">${metrics.wonValue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <CheckCircle2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-up" style={{ animationDelay: "200ms" }}>
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
          <div className="space-y-3">
            {deals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-8 w-8 opacity-40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No deals found</p>
              </div>
            ) : (
              deals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleEdit(deal)}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{deal.deal_name}</h3>
                        <Badge className={`${getStageBadgeColor(deal.stage)} text-white text-[11px]`}>
                          {stages.find(s => s.value === deal.stage)?.label}
                        </Badge>
                        {deal.status !== 'active' && (
                          <Badge variant="outline" className="text-[11px]">{deal.status}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">Client:</span> {deal.clients?.name}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Value:</span> ${deal.deal_value.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Probability:</span> {deal.probability}%
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Owner:</span> {deal.profiles?.full_name}
                        </div>
                      </div>
                      {deal.expected_close_date && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Expected Close:</span>{" "}
                          {new Date(deal.expected_close_date).toLocaleDateString()}
                        </div>
                      )}
                      {deal.notes && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Notes:</span> {deal.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(deal);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(deal.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
