'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Mail, CheckCircle, XCircle, Clock, Users } from 'lucide-react';

interface Invitation {
  id: string;
  team_id: string;
  team_name: string;
  inviter_email: string;
  inviter_name: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export function TeamInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const result = await apiClient.getPendingInvitations();
      setInvitations(result.invitations || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    setProcessing(invitationId);
    try {
      await apiClient.acceptInvitation(invitationId);
      alert('Successfully joined the team!');
      loadInvitations();
      // Refresh page to update user's team status
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessing(invitationId);
    try {
      await apiClient.declineInvitation(invitationId);
      alert('Invitation declined');
      loadInvitations();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to decline invitation');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-primary';
      case 'member': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 rounded-3xl text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading invitations...</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="glass-card p-8 rounded-3xl text-center">
        <Mail className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">No Pending Invitations</h3>
        <p className="text-muted-foreground">You don't have any team invitations at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/20 rounded-2xl">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="ios-headline text-foreground">Team Invitations</h2>
            <p className="text-sm text-muted-foreground">{invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="glass p-6 rounded-2xl border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{invitation.team_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Invited by {invitation.inviter_name || invitation.inviter_email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Role:</span>
                      <span className={`font-semibold capitalize ${getRoleColor(invitation.role)}`}>
                        {invitation.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires: {formatDate(invitation.expires_at)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Invited on {formatDate(invitation.created_at)}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button
                    onClick={() => handleAccept(invitation.id)}
                    disabled={processing === invitation.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-success/15 hover:bg-success/20 border border-success/30 text-success rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {processing === invitation.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDecline(invitation.id)}
                    disabled={processing === invitation.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-error/15 hover:bg-error/20 border border-error/30 text-error rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    {processing === invitation.id ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeamInvitations;
