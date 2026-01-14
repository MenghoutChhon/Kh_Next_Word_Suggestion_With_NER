"use client";

import { useEffect, useState } from 'react';
import { BarChart3, Activity, Users, Sparkles } from 'lucide-react';
import { UserTier } from '../auth/Login';
import { apiClient } from '@/lib/api';

interface DashboardProps {
  userTier: UserTier;
  onLogout: () => void;
}

export function Dashboard({ userTier }: DashboardProps) {
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const stats = await apiClient.getDashboardStats();
        if (isMounted) {
          setDashboardStats(stats);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    loadDashboardData(true);

    const refreshInterval = setInterval(() => {
      loadDashboardData(false);
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const overview = dashboardStats?.overview || {};
  const totalGenerations = overview.totalGenerations ?? overview.totalScans ?? 0;
  const activeUsers = overview.activeUsers ?? overview.teamMembers ?? 0;
  const avgQuality = overview.avgQuality ?? overview.avgConfidence ?? 0;
  const tokensUsed = overview.tokensUsed ?? overview.totalTokens ?? 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="glass-card p-6 md:p-8 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              Workspace Overview
              <BarChart3 className="h-8 w-8 text-primary" />
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Track writing usage, quality, and team activity at a glance.
            </p>
          </div>
          <div className="px-4 py-2 bg-muted rounded-full border border-border flex items-center gap-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {loading ? 'Loading' : 'Live'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="card-compact hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generations
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{totalGenerations.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card-compact hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                Active Users
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{activeUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card-compact hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Avg Quality
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{Math.round(avgQuality * 100)}%</p>
            </div>
          </div>
        </div>

        <div className="card-compact hover:shadow-xl transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Tokens Used
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{tokensUsed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-3xl">
        <h3 className="ios-headline text-foreground mb-4 font-bold">Plan</h3>
        <p className="text-muted-foreground">
          Current tier: <span className="font-semibold capitalize">{userTier}</span>. Upgrade for higher limits and team features.
        </p>
      </div>
    </div>
  );
}
