'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { 
  Users, 
  Plus, 
  X,
  Shield,
  Info
} from 'lucide-react';
import { useToast } from './ui/toast';
import { apiClient } from '../lib/api';

interface TeamCreationDialogProps {
  onClose: () => void;
  onCreate: (team: any) => void;
}

export function TeamCreationDialog({ onClose, onCreate }: TeamCreationDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberLimit: 25,
    autoApproveInvites: false,
    requireMfa: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }

    if (formData.memberLimit < 1) {
      newErrors.memberLimit = 'Member limit must be at least 1';
    } else if (formData.memberLimit > 100) {
      newErrors.memberLimit = 'Member limit cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createTeam(formData);
      if (response.success) {
        toast.success('Team created successfully!');
        onCreate(response.team);
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="glass-card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            Create New Team
          </CardTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-card"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Team Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">
                Team Name <span className="text-error">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="Enter team name"
                className="glass-card"
                maxLength={50}
              />
              {errors.name && (
                <p className="text-sm text-error">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description (optional)</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter team description"
                className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                Member Limit <span className="text-error">*</span>
              </Label>
              <Input
                type="number"
                value={formData.memberLimit}
                onChange={(e) => {
                  setFormData({ ...formData, memberLimit: parseInt(e.target.value) || 1 });
                  if (errors.memberLimit) setErrors({ ...errors, memberLimit: '' });
                }}
                min={1}
                max={100}
                className="glass-card"
              />
              {errors.memberLimit && (
                <p className="text-sm text-error">{errors.memberLimit}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum number of members (1-100)
              </p>
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="text-foreground font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Settings
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex-1">
                <Label className="text-foreground">Auto-approve Invitations</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically add invited members without approval
                </p>
              </div>
              <Switch
                checked={formData.autoApproveInvites}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, autoApproveInvites: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex-1">
                <Label className="text-foreground">Require MFA for Members</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  All members must enable two-factor authentication
                </p>
              </div>
              <Switch
                checked={formData.requireMfa}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, requireMfa: checked })
                }
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="flex gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Team Creation</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You will be the team owner with full permissions</li>
                <li>You can invite members via email after creation</li>
                <li>Team settings can be changed later</li>
                <li>Teams can be deleted only by the owner</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              onClick={onClose}
              variant="ghost"
              disabled={loading}
              className="text-foreground hover:bg-card"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="ios-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamCreationDialog;
