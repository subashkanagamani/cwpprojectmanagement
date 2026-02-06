import React, { useState, useEffect } from 'react';
import { Heart, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import Modal from '../Modal';

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

  const getHealthColor = (score: number) => {
    if (score >= 75) return { bg: 'bg-green-100', text: 'text-green-800', label: 'Healthy' };
    if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'At Risk' };
    return { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' };
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Health Scores</h1>
          <p className="text-gray-600">Monitor and track client health metrics</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Record Score
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Average Score</div>
          <div className="text-2xl font-bold text-gray-900">{averageScore.toFixed(0)}/100</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Healthy Clients</div>
          <div className="text-2xl font-bold text-green-600">
            {healthScores.filter((h) => h.score >= 75).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">At Risk</div>
          <div className="text-2xl font-bold text-yellow-600">
            {healthScores.filter((h) => h.score >= 50 && h.score < 75).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-2xl font-bold text-red-600">
            {healthScores.filter((h) => h.score < 50).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="divide-y">
          {healthScores.map((health) => {
            const color = getHealthColor(health.score);
            return (
              <div key={health.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {getHealthIcon(health.score)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{health.clients.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>Communication: {health.factors?.communication || 0}/10</span>
                        <span>Satisfaction: {health.factors?.satisfaction || 0}/10</span>
                        <span>Payment: {health.factors?.payment || 0}/10</span>
                        <span>Engagement: {health.factors?.engagement || 0}/10</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last assessed: {format(new Date(health.calculated_at), 'MMM d, yyyy')}
                        {health.next_review_date && (
                          <> • Next review: {format(new Date(health.next_review_date), 'MMM d, yyyy')}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{health.score}</div>
                      <div className="text-sm text-gray-500">/ 100</div>
                    </div>
                    <span className={`px-3 py-1 text-sm rounded-full ${color.bg} ${color.text}`}>
                      {color.label}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        health.score >= 75
                          ? 'bg-green-600'
                          : health.score >= 50
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${health.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {healthScores.length === 0 && (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No health scores yet</h3>
            <p className="text-gray-600 mb-4">Start tracking client health to monitor relationships</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Record Client Health Score"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Communication ({formData.communication}/10)
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={formData.communication}
                onChange={(e) => setFormData({ ...formData, communication: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Satisfaction ({formData.satisfaction}/10)
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={formData.satisfaction}
                onChange={(e) => setFormData({ ...formData, satisfaction: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment ({formData.payment}/10)
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={formData.payment}
                onChange={(e) => setFormData({ ...formData, payment: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engagement ({formData.engagement}/10)
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={formData.engagement}
                onChange={(e) => setFormData({ ...formData, engagement: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Calculated Score</div>
            <div className="text-3xl font-bold text-gray-900">{calculateScore()}/100</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Review Date (Optional)
            </label>
            <input
              type="date"
              value={formData.next_review_date}
              onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Record Score
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
