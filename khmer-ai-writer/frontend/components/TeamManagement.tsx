import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, UserPlus, Crown, Shield, User, Trash2, Settings, Mail, Plus, Cog } from 'lucide-react';
import { useToast } from './ui/toast';
import { apiClient } from '../lib/api';
import TeamCreationDialog from './TeamCreationDialog';
import TeamSettings from './TeamSettings';
import TeamInvitations from './TeamInvitations';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
}

interface TeamInfo {
  id: string;
  name: string;
  ownerId: string;
  memberLimit: number;
  createdAt: string;
}

interface TeamData {
  team: TeamInfo;
  members: TeamMember[];
  stats: {
    totalMembers: number;
    activeMembers: number;
    memberLimit: number;
  };
}

interface TeamManagementProps {
  userTier: string;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ userTier }) => {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'member' });
  const [showTeamCreation, setShowTeamCreation] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userTier !== 'free') {
      fetchTeamData();
      
      // Auto-refresh team data every 60 seconds
      const refreshInterval = setInterval(() => {
        fetchTeamData();
      }, 60000);
      
      return () => clearInterval(refreshInterval);
    } else {
      setLoading(false);
    }
  }, [userTier]);

  const fetchTeamData = async () => {
    try {
      const data = await apiClient.getTeamInfo();
      setTeamData(data);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    try {
      const result = await apiClient.inviteTeamMember(inviteForm.email, inviteForm.name, inviteForm.role);
      if (result) {
        toast.success('Member invited successfully');
        setInviteDialogOpen(false);
        setInviteForm({ email: '', name: '', role: 'member' });
        fetchTeamData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to invite member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await apiClient.removeTeamMember(memberId);
      toast.success('Member removed successfully');
      fetchTeamData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await apiClient.updateMemberRole(memberId, newRole);
      toast.success('Member role updated successfully');
      fetchTeamData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleLeaveTeam = async () => {
    if (!teamData?.team?.id) return;
    
    if (!confirm('Are you sure you want to leave this team? You will lose access to all team resources.')) {
      return;
    }

    try {
      await apiClient.leaveTeam(teamData.team.id);
      toast.success('Successfully left the team');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to leave team');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-warning" />;
      case 'admin': return <Shield className="h-4 w-4 text-primary" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (userTier === 'free') {
    return (
      <div className="space-y-8 relative">
        {/* Floating Liquid Bubbles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="floating-bubble w-16 h-16 top-[5%] left-[10%]" style={{animationDelay: '0s'}}></div>
          <div className="floating-bubble w-12 h-12 top-[20%] right-[15%]" style={{animationDelay: '2s'}}></div>
          <div className="floating-bubble w-20 h-20 bottom-[25%] left-[5%]" style={{animationDelay: '4s'}}></div>
        </div>

        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="p-8 gradient-bg-sunset rounded-full w-fit mx-auto mb-8">
            <Users className="h-16 w-16 text-foreground" />
          </div>
          <h3 className="ios-headline text-foreground mb-4 font-bold">Team Management Requires Premium or Business</h3>
          <p className="ios-body text-muted-foreground mb-8 max-w-md mx-auto font-medium">
            Upgrade to Premium or Business to manage team members, assign roles, and collaborate with your team.
          </p>
          <button className="ios-button text-lg px-8 py-4 water-ripple">
            <Crown className="h-5 w-5 mr-2" />
            Upgrade Plans
          </button>
        </div>

        {/* Pending invitations are still relevant for non-business users who were invited by a Business org */}
        <TeamInvitations />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 relative">
        {/* Floating Liquid Bubbles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="floating-bubble w-16 h-16 top-[5%] left-[10%]" style={{animationDelay: '0s'}}></div>
          <div className="floating-bubble w-12 h-12 top-[20%] right-[15%]" style={{animationDelay: '2s'}}></div>
          <div className="floating-bubble w-20 h-20 bottom-[25%] left-[5%]" style={{animationDelay: '4s'}}></div>
        </div>

        <div className="glass-card p-8 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="p-4 gradient-bg-lavender rounded-2xl shadow-lg">
              <Users className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="ios-title text-foreground font-bold">Team Management</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass-card p-8 rounded-3xl loading-shimmer"></div>
          <div className="glass-card p-16 rounded-3xl loading-shimmer"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Floating Liquid Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="floating-bubble w-16 h-16 top-[5%] left-[10%]" style={{animationDelay: '0s'}}></div>
        <div className="floating-bubble w-12 h-12 top-[20%] right-[15%]" style={{animationDelay: '2s'}}></div>
        <div className="floating-bubble w-20 h-20 bottom-[25%] left-[5%]" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Pending invitations for users who might not yet be in a team */}
      <TeamInvitations />

      {/* Header */}
      <div className="glass-card p-8 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 gradient-bg-lavender rounded-2xl shadow-lg">
              <Users className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="ios-title text-foreground font-bold">Team Management</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {!teamData?.team && (
              <button 
                onClick={() => setShowTeamCreation(true)}
                className="ios-button water-ripple"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </button>
            )}
            
            {teamData?.team && (
              <>
                <button 
                  onClick={() => setShowTeamSettings(true)}
                  className="ios-button-secondary water-ripple"
                >
                  <Cog className="h-4 w-4 mr-2" />
                  Team Settings
                </button>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="ios-button water-ripple">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground font-bold">Invite Team Member</DialogTitle>
                      <DialogDescription className="text-muted-foreground font-medium">
                        Send an invitation to join your team workspace.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">Email Address</label>
                        <input
                          type="email"
                          placeholder="member@company.com"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          className="water-ripple"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">Full Name</label>
                        <Input
                          placeholder="John Doe"
                          value={inviteForm.name}
                          onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                          className="water-ripple"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-muted-foreground mb-2 block">Role</label>
                        <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                          <SelectTrigger className="glass-card border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-border">
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button onClick={handleInviteMember} className="ios-button flex-1 water-ripple">
                          Send Invitation
                        </button>
                        <button onClick={() => setInviteDialogOpen(false)} className="ios-button-secondary water-ripple">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl floating-card water-ripple">
          <div className="flex items-center gap-4">
            <div className="p-4 gradient-bg-ocean rounded-2xl shadow-lg">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="ios-caption text-muted-foreground font-semibold">Total Members</p>
              <p className="ios-headline text-foreground font-bold text-2xl">{teamData?.stats.totalMembers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-3xl floating-card water-ripple">
          <div className="flex items-center gap-4">
            <div className="p-4 gradient-bg-forest rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-foreground" />
            </div>
            <div>
              <p className="ios-caption text-muted-foreground font-semibold">Active Members</p>
              <p className="ios-headline text-foreground font-bold text-2xl">{teamData?.stats.activeMembers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-3xl floating-card water-ripple">
          <div className="flex items-center gap-4">
            <div className="p-4 gradient-bg-lavender rounded-2xl shadow-lg">
              <Settings className="h-8 w-8 text-foreground" />
            </div>
            <div>
              <p className="ios-caption text-muted-foreground font-semibold">Member Limit</p>
              <p className="ios-headline text-foreground font-bold text-2xl">{teamData?.stats.memberLimit || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="glass-card p-8 rounded-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 gradient-bg-sunset rounded-2xl shadow-lg">
            <Users className="h-7 w-7 text-foreground" />
          </div>
          <div>
            <h3 className="ios-headline text-foreground font-bold">Team Members</h3>
            <p className="ios-caption text-muted-foreground font-medium">
              Manage your team members, roles, and permissions.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {teamData?.members.map((member) => (
            <div key={member.id} className="glass-card p-6 rounded-2xl hover:bg-muted/50 transition-all water-ripple">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 gradient-bg-ocean rounded-2xl">
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">{member.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                      member.role === 'owner' ? 'bg-warning/20 text-foreground border border-warning/40' :
                      member.role === 'admin' ? 'bg-primary/20 text-foreground border border-primary/40' :
                      'bg-card text-foreground border border-border'
                    }`}>
                      {member.role}
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                      member.status === 'active' ? 'bg-success/20 text-foreground border border-success/40' :
                      member.status === 'pending' ? 'bg-warning/20 text-foreground border border-warning/40' :
                      'bg-card text-foreground border border-border'
                    }`}>
                      {member.status}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {member.role !== 'owner' && (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32 glass-card border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-border">
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="ios-button-secondary p-3 text-error hover:text-error/80 water-ripple"
                        aria-label={`Remove ${member.name}`}
                        title={`Remove ${member.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Creation Dialog */}
      {showTeamCreation && (
        <TeamCreationDialog
          onClose={() => setShowTeamCreation(false)}
          onCreate={(team) => {
            setShowTeamCreation(false);
            fetchTeamData();
          }}
        />
      )}

      {/* Team Settings Dialog */}
      {showTeamSettings && teamData?.team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="glass-card w-full max-w-4xl mx-4 rounded-3xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground">Team Settings</h2>
              <button
                onClick={() => setShowTeamSettings(false)}
                className="p-2 hover:bg-card rounded-lg transition-colors"
                aria-label="Close team settings"
                title="Close team settings"
              >
                <Trash2 className="h-5 w-5 text-foreground" />
              </button>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <TeamSettings
                teamId={teamData.team.id}
                currentTeamData={teamData}
                onUpdate={() => {
                  fetchTeamData();
                }}
                onDelete={() => {
                  setShowTeamSettings(false);
                  setTeamData(null);
                  fetchTeamData();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { TeamManagement };
export default TeamManagement;
