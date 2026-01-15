'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  Settings, 
  Users, 
  Shield, 
  Trash2, 
  Save,
  AlertTriangle,
  Palette,
  Globe
} from 'lucide-react';
import { useToast } from './ui/toast';
import { apiClient } from '../lib/api';

interface TeamSettingsProps {
  teamId: string;
  currentTeamData: any;
  onUpdate: () => void;
  onDelete: () => void;
}

export function TeamSettings({ teamId, currentTeamData, onUpdate, onDelete }: TeamSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    name: currentTeamData?.team?.name || '',
    description: '',
    memberLimit: currentTeamData?.team?.memberLimit || 25,
    autoApproveInvites: false,
    requireMfa: false,
    allowPublicReports: false,
    dataRetentionDays: 90,
    primaryColor: '#667eea'
  });

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.updateTeamSettings(teamId, settings);
      if (response.success) {
        toast.success('Team settings updated successfully');
        onUpdate();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update team settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!confirm('This will permanently delete the team and remove all members. This action cannot be undone!')) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.deleteTeam(teamId);
      if (response.success) {
        toast.success('Team deleted successfully');
        onDelete();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Information */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5" />
            Team Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-foreground">Team Name</Label>
            <Input
              id="team-name"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              placeholder="Enter team name"
              className="glass-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description" className="text-foreground">Description</Label>
            <textarea
              id="team-description"
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              placeholder="Enter team description (optional)"
              className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-member-limit" className="text-foreground">Member Limit</Label>
            <Input
              id="team-member-limit"
              type="number"
              value={settings.memberLimit}
              onChange={(e) => setSettings({ ...settings, memberLimit: parseInt(e.target.value) })}
              min={1}
              max={100}
              className="glass-card"
            />
            <p className="text-xs text-muted-foreground">
              Current members: {currentTeamData?.stats?.totalMembers || 0}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Auto-approve Invitations</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve team invitations without manual review
              </p>
            </div>
            <Switch
              checked={settings.autoApproveInvites}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, autoApproveInvites: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Require MFA for Members</Label>
              <p className="text-sm text-muted-foreground">
                Require all team members to enable two-factor authentication
              </p>
            </div>
            <Switch
              checked={settings.requireMfa}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, requireMfa: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Allow Public Reports</Label>
              <p className="text-sm text-muted-foreground">
                Allow team members to share insights publicly
              </p>
            </div>
            <Switch
              checked={settings.allowPublicReports}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allowPublicReports: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-data-retention" className="text-foreground">Data Retention (days)</Label>
            <Input
              id="team-data-retention"
              type="number"
              value={settings.dataRetentionDays}
              onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
              min={30}
              max={365}
              className="glass-card"
            />
            <p className="text-xs text-muted-foreground">
              How long to keep generation data and insights (30-365 days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-primary-color-picker" className="text-foreground">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="team-primary-color-picker"
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <div className="sr-only">
                <Label htmlFor="team-primary-color" className="mb-0">
                  Primary color hex
                </Label>
              </div>
              <Input
                id="team-primary-color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="glass-card flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleSaveSettings}
          disabled={loading}
          className="ios-button"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="glass-card border-error/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-delete-confirm" className="text-foreground">Delete Team</Label>
            <p className="text-sm text-muted-foreground mb-3">
              This will permanently delete the team and remove all members. This action cannot be undone!
            </p>
            <Input
              id="team-delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="glass-card mb-3"
            />
            <Button
              onClick={handleDeleteTeam}
              disabled={loading || deleteConfirm !== 'DELETE'}
              className="bg-error hover:bg-error/90 text-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Team Permanently
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamSettings;
