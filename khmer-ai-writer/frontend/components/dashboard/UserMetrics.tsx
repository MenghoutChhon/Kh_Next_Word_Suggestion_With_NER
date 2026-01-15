"use client";

import { useEffect, useState } from 'react';
import { BarChart3, Zap, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { apiClient } from '../../lib/api';
import { UserTier } from '../auth/Login';

interface UserMetricsProps {
  userTier: UserTier;
  onUpgrade?: () => void;
}

interface UsageMetrics {
  generationsUsed: number;
  generationsLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  teamMembers: number;
}

export function UserMetrics({ userTier, onUpgrade }: UserMetricsProps) {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const tierDefaults: Record<UserTier, { generations: number; apiCalls: number }> = {
    free: { generations: 100, apiCalls: 100 },
    premium: { generations: 10000, apiCalls: -1 },
    business: { generations: -1, apiCalls: -1 },
  };

  const tierCopy: Record<UserTier, string> = {
    free: 'Free tier: up to 100 generations and 100 API calls per billing cycle.',
    premium: 'Premium tier: up to 10,000 generations and unlimited API calls.',
    business: 'Business tier: unlimited generations and API calls.',
  };

  const formatLimitLabel = (limit: number, fallback: number) => {
    const normalized = limit > 0 ? limit : fallback;
    if (normalized === -1) {
      return 'Unlimited';
    }
    return normalized.toLocaleString();
  };

  useEffect(() => {
    let isMounted = true;
    const loadMetrics = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const data = await apiClient.getUserMetrics();
        if (data.success && data.metrics) {
          if (isMounted) {
            setMetrics({
              generationsUsed: data.metrics.generationsUsed ?? 0,
              generationsLimit: data.metrics.generationsLimit ?? 0,
              apiCallsUsed: data.metrics.apiCallsUsed ?? 0,
              apiCallsLimit: data.metrics.apiCallsLimit ?? 0,
              teamMembers: data.metrics.teamMembers ?? 1,
            });
          }
        } else {
          if (isMounted) {
            setMetrics({
              generationsUsed: 0,
              generationsLimit: 0,
              apiCallsUsed: 0,
              apiCallsLimit: 0,
              teamMembers: 1,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
        if (isMounted) {
          setMetrics({
            generationsUsed: 0,
            generationsLimit: 0,
            apiCallsUsed: 0,
            apiCallsLimit: 0,
            teamMembers: 1,
          });
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    loadMetrics(true);

    const refreshInterval = setInterval(() => {
      loadMetrics(false);
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadMetrics(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (loading || !metrics) {
    return (
      <div className="usage-card p-6 rounded-2xl">
        <div className="text-muted-foreground">Loading usage...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Usage</h2>
          <p className="text-muted-foreground">Monitor limits across your workspace.</p>
        </div>
        <Badge className="usage-card px-4 py-2 text-sm font-semibold border border-border capitalize">
          {userTier}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="usage-card p-6 rounded-2xl">
          <div className="usage-card-title flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4" />
            Generations
          </div>
          <div className="usage-card-value text-2xl font-bold">
            {metrics.generationsUsed} / {formatLimitLabel(metrics.generationsLimit, tierDefaults[userTier].generations)}
          </div>
        </div>
        <div className="usage-card p-6 rounded-2xl">
          <div className="usage-card-title flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4" />
            API Calls
          </div>
          <div className="usage-card-value text-2xl font-bold">
            {metrics.apiCallsUsed} / {formatLimitLabel(metrics.apiCallsLimit, tierDefaults[userTier].apiCalls)}
          </div>
        </div>
        <div className="usage-card p-6 rounded-2xl">
          <div className="usage-card-title flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            Team Members
          </div>
          <div className="usage-card-value text-2xl font-bold">{metrics.teamMembers}</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mt-3 leading-relaxed">
        {tierCopy[userTier]}
        <br />
        Upgrades refresh each billing cycle with the limits shown above.
      </div>

      {userTier === 'free' && (
        <div className="usage-card p-6 rounded-2xl border border-primary/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">Need higher limits?</h3>
              <p className="text-muted-foreground text-sm">Upgrade to unlock longer context and team tools.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => onUpgrade?.()}>
              View Plans
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
