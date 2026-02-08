import { useState, useEffect } from 'react';
import { Heart, AlertTriangle, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface ClientHealth {
  id: string;
  client_id: string;
  score: number;
  factors: Record<string, any>;
  calculated_at: string;
  next_review_date: string;
  clients: {
    name: string;
    status: string;
  };
}

interface Client {
  id: string;
  name: string;
}

export default function ClientHealthScoresPage() {
  const { showToast } = useToast();
  const [healthScores, setHealthScores] = useState<ClientHealth[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    score: 50,
    communication: 5,
    satisfaction: 5,
    payment: 5,
    engagement: 5,
    next_review_date: '',
  });

  useEffect(() => {
    fetchHealthScores();
    fetchClients();
  }, []);

  const fetchHealthScores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_health_scores')
        .select(`
          *,
          clients(name, status)
        `)
        .order('calculated_at', { ascending: false });

      if (error) throw error;
      setHealthScores(data || []);
    } catch (error) {
      showToast('Failed to load health scores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const calculateScore = () => {
    const { communication, satisfaction, payment, engagement } = formData;
    return Math.round((communication + satisfaction + payment + engagement) * 2.5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const score = calculateScore();
    const factors = {
      communication: formData.communication,
      satisfaction: formData.satisfaction,
      payment: formData.payment,
      engagement: formData.engagement,
    };

    try {
      const { error } = await supabase
        .from('client_health_scores')
        .insert({
          client_id: formData.client_id,
          score,
          factors,
          next_review_date: formData.next_review_date || null,
        });

      if (error) throw error;

      showToast('Health score recorded', 'success');
      setIsModalOpen(false);
      resetForm();
      fetchHealthScores();
    } catch (error) {
      showToast('Failed to record health score', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      score: 50,
      communication: 5,
      satisfaction: 5,
      payment: 5,
      engagement: 5,
      next_review_date: '',
    });
  };

  const getHealthBadge = (score: number): { variant: "default" | "secondary" | "destructive"; label: string } => {
    if (score >= 75) return { variant: 'default', label: 'Healthy' };
    if (score >= 50) return { variant: 'secondary', label: 'At Risk' };
    return { variant: 'destructive', label: 'Critical' };
  };

  const getHealthIcon = (score: number) => {
    if (score >= 75) return <Heart className="h-5 w-5 text-green-600 fill-green-600" />;
    if (score >= 50) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const averageScore =
    healthScores.length > 0
      ? healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length
      : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Client Health Scores</h1>
          <p className="text-sm text-muted-foreground">Monitor and track client health metrics</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          data-testid="button-record-score"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Score
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-average-score">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Average Score</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{averageScore.toFixed(0)}/100</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-healthy">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Healthy Clients</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {healthScores.filter((h) => h.score >= 75).length}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-at-risk">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">At Risk</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {healthScores.filter((h) => h.score >= 50 && h.score < 75).length}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-critical">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Critical</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {healthScores.filter((h) => h.score < 50).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {healthScores.map((health) => {
            const badge = getHealthBadge(health.score);
            return (
              <div key={health.id} className="p-4" data-testid={`row-health-${health.id}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-1">
                    {getHealthIcon(health.score)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{health.clients.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>Communication: {health.factors?.communication || 0}/10</span>
                        <span>Satisfaction: {health.factors?.satisfaction || 0}/10</span>
                        <span>Payment: {health.factors?.payment || 0}/10</span>
                        <span>Engagement: {health.factors?.engagement || 0}/10</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last assessed: {format(new Date(health.calculated_at), 'MMM d, yyyy')}
                        {health.next_review_date && (
                          <> &bull; Next review: {format(new Date(health.next_review_date), 'MMM d, yyyy')}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-semibold tracking-tight text-foreground">{health.score}</div>
                      <div className="text-sm text-muted-foreground">/ 100</div>
                    </div>
                    <Badge variant={badge.variant} className="no-default-active-elevate">
                      {badge.label}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={health.score} />
                </div>
              </div>
            );
          })}
        </CardContent>

        {healthScores.length === 0 && (
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No health scores yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking client health to monitor relationships</p>
          </CardContent>
        )}
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Client Health Score</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={formData.client_id || 'placeholder'}
                onValueChange={(val) => setFormData({ ...formData, client_id: val === 'placeholder' ? '' : val })}
              >
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select a client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="communication">
                  Communication ({formData.communication}/10)
                </Label>
                <Input
                  id="communication"
                  type="range"
                  min="0"
                  max="10"
                  value={formData.communication}
                  onChange={(e) => setFormData({ ...formData, communication: Number(e.target.value) })}
                  className="border-0 shadow-none p-0"
                  data-testid="input-communication"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="satisfaction">
                  Satisfaction ({formData.satisfaction}/10)
                </Label>
                <Input
                  id="satisfaction"
                  type="range"
                  min="0"
                  max="10"
                  value={formData.satisfaction}
                  onChange={(e) => setFormData({ ...formData, satisfaction: Number(e.target.value) })}
                  className="border-0 shadow-none p-0"
                  data-testid="input-satisfaction"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">
                  Payment ({formData.payment}/10)
                </Label>
                <Input
                  id="payment"
                  type="range"
                  min="0"
                  max="10"
                  value={formData.payment}
                  onChange={(e) => setFormData({ ...formData, payment: Number(e.target.value) })}
                  className="border-0 shadow-none p-0"
                  data-testid="input-payment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="engagement">
                  Engagement ({formData.engagement}/10)
                </Label>
                <Input
                  id="engagement"
                  type="range"
                  min="0"
                  max="10"
                  value={formData.engagement}
                  onChange={(e) => setFormData({ ...formData, engagement: Number(e.target.value) })}
                  className="border-0 shadow-none p-0"
                  data-testid="input-engagement"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Calculated Score</div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">{calculateScore()}/100</div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="next-review-date">
                Next Review Date (Optional)
              </Label>
              <Input
                id="next-review-date"
                type="date"
                value={formData.next_review_date}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
                data-testid="input-next-review-date"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-score"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-score">
                Record Score
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
