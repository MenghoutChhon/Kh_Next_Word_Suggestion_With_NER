'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  Globe,
  MapPin,
  Clock,
  Shield,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from './ui/toast';
import { apiClient } from '../lib/api';

interface Session {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getSessions();
      if (response.success) {
        setSessions(response.sessions);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? You will be logged out from that device.')) {
      return;
    }

    setRevoking(sessionId);
    try {
      const response = await apiClient.revokeSession(sessionId);
      if (response.success) {
        toast.success('Session revoked successfully');
        await loadSessions();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will be logged out from all devices except this one.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.revokeAllSessions();
      if (response.success) {
        toast.success(`Revoked ${response.revokedCount} session(s)`);
        await loadSessions();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke sessions');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={loadSessions}
                disabled={loading}
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-card"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {sessions.filter(s => !s.isCurrent).length > 0 && (
                <Button
                  onClick={revokeAllSessions}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                className="text-error hover:bg-error/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke All Others
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Manage your active sessions across all devices. You can revoke access to any device at any time.
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </span>
            </div>
            {sessions.length > 1 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-muted-foreground">
                  {sessions.length - 1} other device{sessions.length - 1 !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {loading && sessions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading sessions...</p>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No active sessions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card 
              key={session.id} 
              className={`glass-card ${session.isCurrent ? 'border-primary/50' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    {/* Device Icon */}
                    <div className={`p-3 rounded-xl ${
                      session.isCurrent 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-card text-muted-foreground'
                    }`}>
                      {getDeviceIcon(session.deviceType)}
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-foreground font-medium">
                              {session.deviceName}
                            </h3>
                            {session.isCurrent && (
                              <Badge className="bg-primary/15 text-foreground border-primary/30">
                                Current Session
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.browser} on {session.os}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>{session.ipAddress}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{session.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatLastActive(session.lastActive)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!session.isCurrent && (
                    <Button
                      onClick={() => revokeSession(session.id)}
                      disabled={revoking === session.id}
                      size="sm"
                      className="bg-error/10 hover:bg-error/20 text-error border border-error/30"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {revoking === session.id ? 'Revoking...' : 'Revoke'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security Tips */}
      <Card className="glass-card border-warning/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning text-base">
            <AlertCircle className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-warning">•</span>
              <span>Regularly review your active sessions and revoke any you don't recognize</span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">•</span>
              <span>Always log out from public or shared devices</span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">•</span>
              <span>Enable two-factor authentication for additional security</span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">•</span>
              <span>If you see suspicious activity, change your password immediately</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default SessionManagement;
