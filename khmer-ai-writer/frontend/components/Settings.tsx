'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { apiClient } from '../lib/api';
import { 
  User, Shield, Bell, Eye, Lock, Trash2, Download, Upload, Save,
  Crown, Building2, Sparkles, Zap, Settings as SettingsIcon, CreditCard, XCircle, Monitor, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react';
import MFASetup from './MFASetup';
import SessionManagement from './SessionManagement';
import { useTheme } from '../lib/hooks/useTheme';

interface SettingsProps {
  user: any;
  onUpdateProfile: (data: any) => void;
  onUpgrade: () => void;
}

export function Settings({ user, onUpdateProfile, onUpgrade }: SettingsProps) {
  const { theme, toggleTheme } = useTheme();
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const [tabsCanScrollLeft, setTabsCanScrollLeft] = useState(false);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [privacy, setPrivacy] = useState({
    shareAnalytics: true,
    emailNotifications: true,
    securityAlerts: true,
    marketingEmails: false,
    dataRetention: '1year'
  });

  const [notifications, setNotifications] = useState({
    generationComplete: true,
    nerComplete: true,
    usageDigest: true,
    systemUpdates: true,
    securityAlerts: true
  });

  const [isCanceling, setIsCanceling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const updateTabsScroll = () => {
      const el = tabsScrollRef.current;
      if (!el) return;
      const canScroll = el.scrollWidth > el.clientWidth + 1;
      setTabsOverflow(canScroll);
      setTabsCanScrollLeft(el.scrollLeft > 0);
      setTabsCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    updateTabsScroll();
    window.addEventListener('resize', updateTabsScroll);
    return () => window.removeEventListener('resize', updateTabsScroll);
  }, [activeTab]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const result = await apiClient.getMFAStatus();
      if (result.success) {
        setMfaEnabled(result.enabled);
      }
    } catch (err) {
      console.error('Failed to check MFA status:', err);
    }
  };

  const loadPreferences = async () => {
    try {
      const result = await apiClient.getPreferences();
      if (result.success && result.preferences) {
        if (result.preferences.privacy) {
          setPrivacy(result.preferences.privacy);
        }
        if (result.preferences.notifications) {
          setNotifications(result.preferences.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const savePreferences = async () => {
    try {
      const result = await apiClient.updatePreferences({
        privacy,
        notifications
      });
      if (result.success) {
        setSuccess('Preferences saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save preferences');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Update basic profile
      if (profile.fullName || profile.email) {
        const result = await apiClient.updateProfile({
          name: profile.fullName,
          email: profile.email
        });
        
        if (result.success) {
          setSuccess('Profile updated successfully!');
          onUpdateProfile(result.user);
        }
      }
      
      // Update password if provided
      if (profile.currentPassword && profile.newPassword) {
        if (profile.newPassword !== profile.confirmPassword) {
          setError('New passwords do not match');
          setLoading(false);
          return;
        }
        
        const pwResult = await apiClient.updatePassword(
          profile.currentPassword,
          profile.newPassword
        );
        
        if (pwResult.success) {
          setSuccess('Password updated successfully!');
          setProfile({
            ...profile,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
      return;
    }

    setIsCanceling(true);
    try {
      const result = await apiClient.cancelSubscription();
      if (result.success) {
        alert(result.message);
        // Optionally refresh user data
        window.location.reload();
      } else {
        alert('Failed to cancel subscription: ' + result.message);
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('An error occurred while canceling your subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleUpgradeTier = async (newTier: string) => {
    const tierNames = { premium: 'Premium', business: 'Business' };
    const tierPrices = { premium: '$29', business: '$99' };
    
    if (!confirm(`Upgrade to ${tierNames[newTier as keyof typeof tierNames]} plan for ${tierPrices[newTier as keyof typeof tierPrices]}/month?`)) {
      return;
    }

    setIsUpgrading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await apiClient.upgradeTier(newTier, 'User requested upgrade');
      if (result.success) {
        setSuccess(`Successfully upgraded to ${tierNames[newTier as keyof typeof tierNames]} plan!`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(result.message || 'Failed to upgrade tier');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to upgrade tier');
    } finally {
      setIsUpgrading(false);
      setTimeout(() => { setError(''); setSuccess(''); }, 3000);
    }
  };

  const handleDowngradeTier = async (_newTier: string) => {
    setError('Downgrade is disabled in this demo. Please use cancel subscription instead.');
    setTimeout(() => { setError(''); }, 3000);
  };

  const getTierIcon = () => {
    switch (user?.tier) {
      case 'premium': return <Crown className="h-5 w-5 text-warning" />;
      case 'business': return <Building2 className="h-5 w-5 text-primary" />;
      default: return <Shield className="h-5 w-5 text-primary" />;
    }
  };

  const securityPostureLabel = mfaEnabled ? 'Hardened' : 'Action Needed';
  const securityPostureMessage = mfaEnabled
    ? 'Multi-factor authentication is active and suspicious login alerts are enabled. Keep monitoring sessions to maintain this rating.'
    : 'Enable multi-factor authentication and turn on login alerts to block takeover attempts before they start.';
  const loginAlertsEnabled = Boolean(privacy.securityAlerts);
  const generationAlertsEnabled = Boolean(notifications.generationComplete);

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="glass-card p-4 rounded-2xl border border-success/30 bg-success/10">
          <p className="text-success text-sm font-semibold">{success}</p>
        </div>
      )}
      {error && (
        <div className="glass-card p-4 rounded-2xl border border-error/30 bg-error/10">
          <p className="text-error text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="ios-title text-foreground mb-2">Account Settings</h1>
            <p className="ios-body text-muted-foreground">Manage your account preferences and security</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="dynamic-island">
              <div className="flex items-center gap-2">
                {getTierIcon()}
                <span className="text-foreground text-sm font-semibold">{user?.tier?.toUpperCase()} Plan</span>
              </div>
            </div>
            
            {user?.tier !== 'business' && (
              <button onClick={onUpgrade} className="ios-button">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="tabs-segment p-2 rounded-2xl relative">
          {tabsOverflow && (
            <button
              type="button"
              className="tabs-scroll-btn absolute left-2 top-1/2 -translate-y-1/2"
              onClick={() => tabsScrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
              disabled={!tabsCanScrollLeft}
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {tabsOverflow && (
            <button
              type="button"
              className="tabs-scroll-btn absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => tabsScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
              disabled={!tabsCanScrollRight}
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <div
            ref={tabsScrollRef}
            onScroll={() => {
              const el = tabsScrollRef.current;
              if (!el) return;
              setTabsCanScrollLeft(el.scrollLeft > 0);
              setTabsCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
            }}
            onWheel={(event) => {
              const el = tabsScrollRef.current;
              if (!el) return;
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                el.scrollLeft += event.deltaY;
                event.preventDefault();
              }
            }}
            className="overflow-x-auto scrollbar-thin"
          >
            <TabsList className="grid w-full grid-cols-7 gap-1 min-w-max">
            <TabsTrigger value="profile" className="rounded-xl py-3">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="subscription" className="rounded-xl py-3">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl py-3">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="mfa" className="rounded-xl py-3">
              <Shield className="h-4 w-4 mr-2" />
              2FA
            </TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-xl py-3">
              <Monitor className="h-4 w-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-xl py-3">
              <Eye className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl py-3">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>
          </div>
        </div>

        <TabsContent value="profile" className="space-y-6">
          {error && (
            <div className="glass-card p-4 rounded-2xl bg-error/15 border border-error/30">
              <p className="text-error">{error}</p>
            </div>
          )}
          {success && (
            <div className="glass-card p-4 rounded-2xl bg-success/15 border border-success/30">
              <p className="text-success">{success}</p>
            </div>
          )}
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/15 rounded-2xl">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="ios-headline text-foreground">Profile Information</h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="ios-caption text-foreground font-semibold">Full Name</label>
                  <input
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    value={profile.fullName}
                    onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="ios-caption text-foreground font-semibold">Email Address</label>
                  <input
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              
              <div className="pt-6 border-t border-border">
                <h4 className="ios-headline text-foreground mb-6">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="ios-caption text-foreground font-semibold">Current Password</label>
                    <input
                      className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      type="password"
                      value={profile.currentPassword}
                      onChange={(e) => setProfile({...profile, currentPassword: e.target.value})}
                      placeholder="Current password"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="ios-caption text-foreground font-semibold">New Password</label>
                    <input
                      className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      type="password"
                      value={profile.newPassword}
                      onChange={(e) => setProfile({...profile, newPassword: e.target.value})}
                      placeholder="New password"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="ios-caption text-foreground font-semibold">Confirm Password</label>
                    <input
                      className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      type="password"
                      value={profile.confirmPassword}
                      onChange={(e) => setProfile({...profile, confirmPassword: e.target.value})}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={handleProfileSave} 
                  disabled={loading}
                  className="ios-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Theme Preferences */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 rounded-2xl">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <h3 className="ios-headline text-foreground">Appearance</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${theme === 'dark' ? 'bg-primary/15' : 'bg-warning/15'}`}>
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div>
                    <h4 className="ios-body font-semibold text-foreground">Theme Mode</h4>
                    <p className="ios-caption text-muted-foreground">
                      {theme === 'dark' ? 'Dark mode with solid surfaces and strong contrast' : 'Light mode with solid cards and clear borders'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all duration-200 text-foreground font-semibold"
                >
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>

              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="ios-caption text-foreground/80">
                  ✨ {theme === 'dark' 
                    ? 'Dark mode prioritizes solid panels, readable text, and clear separation.' 
                    : 'Light mode uses solid surfaces with higher contrast and defined borders.'}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="ios-headline text-foreground">Subscription & Billing</h3>
            <p className="text-muted-foreground">Manage your plan and view your upcoming charges. All charges are handled through Khmer ML's secure billing platform.</p>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 rounded-2xl">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="ios-headline text-foreground">Privacy Settings</h3>
            </div>
            
            <div className="space-y-6">
              {Object.entries(privacy).map(([key, value]) => (
                <div key={key} className="toggle-row flex items-center justify-between p-4">
                  <div>
                    <h4 className="font-semibold text-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="ios-caption text-muted-foreground">
                      {key === 'shareAnalytics' && 'Help improve our service by sharing anonymous usage data'}
                      {key === 'emailNotifications' && 'Receive important updates via email'}
                      {key === 'securityAlerts' && 'Get notified about security events'}
                      {key === 'marketingEmails' && 'Receive product updates and promotions'}
                    </p>
                  </div>
                  <Switch 
                    checked={typeof value === 'boolean' ? value : false}
                    onCheckedChange={(checked) => {
                      setPrivacy({...privacy, [key]: checked});
                      // Auto-save on change
                      setTimeout(() => savePreferences(), 500);
                    }}
                  />
                </div>
              ))}
              
              <div className="flex justify-end pt-4">
                <button 
                  onClick={savePreferences}
                  className="ios-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Privacy Settings
                </button>
              </div>
              
              <div className="pt-6 border-t border-border">
                <h4 className="ios-headline text-foreground mb-6">Data Management</h4>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={async () => {
                      try {
                        const activities = await apiClient.getActivityLog(1000);
                        const blob = new Blob([JSON.stringify(activities, null, 2)], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        setSuccess('Data exported successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) {
                        setError('Failed to export data');
                      }
                    }}
                    className="ios-button-secondary flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Data
                  </button>
                  <button 
                    onClick={async () => {
                      const password = prompt('⚠️ DANGER ZONE\n\nEnter your password to confirm account deletion:');
                      if (!password) return;
                      
                      const confirm = prompt('Type DELETE in all caps to confirm.\n\nThis will permanently delete:\n- All your generations\n- All your usage history\n- All your API keys\n- All your data\n\nThis action CANNOT be undone!');
                      if (confirm !== 'DELETE') {
                        alert('Account deletion cancelled');
                        return;
                      }
                      
                      setIsDeleting(true);
                      setError('');
                      
                      try {
                        const result = await apiClient.deleteAccount(password, confirm);
                        if (result.success) {
                          alert('✓ Account deleted successfully. You will be redirected to the home page.');
                          window.location.href = '/';
                        } else {
                          setError(result.message || 'Failed to delete account');
                          alert('Failed to delete account: ' + result.message);
                        }
                      } catch (err: any) {
                        const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error occurred';
                        setError(errorMsg);
                        alert('Error deleting account: ' + errorMsg);
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting}
                    className="ios-button-secondary flex items-center gap-2 bg-error/15 border-error/30 text-error hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-success/15 rounded-2xl">
                <Lock className="h-6 w-6 text-success" />
              </div>
              <h3 className="ios-headline text-foreground">Security Settings</h3>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 glass rounded-2xl bg-success/15 border-success/30">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-5 w-5 text-success" />
                  <span className="font-semibold text-success">Security Posture: {securityPostureLabel}</span>
                </div>
                <p className="ios-caption text-success">
                  {securityPostureMessage}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass p-4 rounded-2xl border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h5 className="font-semibold text-foreground">Multi-Factor Authentication</h5>
                      <p className="ios-caption text-muted-foreground">
                        {mfaEnabled ? 'Authenticator apps and backup codes protect this account.' : 'Turn on 2FA to require a time-based code on every login.'}
                      </p>
                    </div>
                    <Badge className={mfaEnabled ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30'}>
                      {mfaEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {mfaEnabled ? 'Manage backup codes or disable 2FA.' : 'Setup takes less than a minute.'}
                    </span>
                    <button
                      onClick={() => {
                        if (mfaEnabled) {
                          setActiveTab('mfa');
                        } else {
                          setShowMFASetup(true);
                          setActiveTab('mfa');
                        }
                      }}
                      className="ios-button-secondary"
                    >
                      {mfaEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                    </button>
                  </div>
                </div>

                <div className="toggle-row p-4 rounded-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h5 className="font-semibold text-foreground">Login & Device Alerts</h5>
                      <p className="ios-caption text-muted-foreground">Receive an email whenever a new device signs in.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${loginAlertsEnabled ? 'text-success' : 'text-muted-foreground'}`}>
                        {loginAlertsEnabled ? 'On' : 'Off'}
                      </span>
                      <Switch
                        checked={loginAlertsEnabled}
                        onCheckedChange={(checked) => {
                          setPrivacy({ ...privacy, securityAlerts: checked });
                          setTimeout(() => savePreferences(), 500);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="toggle-row p-4 rounded-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h5 className="font-semibold text-foreground">Generation Alerts</h5>
                      <p className="ios-caption text-muted-foreground">Stay notified when a generation completes.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${generationAlertsEnabled ? 'text-success' : 'text-muted-foreground'}`}>
                        {generationAlertsEnabled ? 'On' : 'Off'}
                      </span>
                      <Switch
                        checked={generationAlertsEnabled}
                        onCheckedChange={(checked) => {
                          setNotifications({ ...notifications, generationComplete: checked });
                          setTimeout(() => savePreferences(), 500);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass p-4 rounded-2xl border border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h5 className="font-semibold text-foreground">Session Management</h5>
                      <p className="ios-caption text-muted-foreground">Review active sessions and revoke anything unfamiliar.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="ios-button-secondary"
                    >
                      Review Sessions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mfa" className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/15 rounded-2xl">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="ios-headline text-foreground">Two-Factor Authentication</h3>
                <p className="ios-caption text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              {mfaEnabled && (
                <Badge className="bg-success/15 text-success border-success/30">
                  Enabled
                </Badge>
              )}
            </div>

            {!mfaEnabled ? (
              <div className="space-y-6">
                <div className="flex gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-2">Protect Your Account</p>
                    <p className="mb-3">
                      Two-factor authentication adds an extra layer of security by requiring 
                      a verification code from your phone in addition to your password.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Prevents unauthorized access even if your password is compromised</li>
                      <li>Uses standard authenticator apps like Google Authenticator</li>
                      <li>Includes backup codes for account recovery</li>
                      <li>Can be disabled at any time</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={() => setShowMFASetup(true)}
                  className="ios-button w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Enable Two-Factor Authentication
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                  <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-2">2FA is Active</p>
                    <p>
                      Your account is protected with two-factor authentication. You'll need 
                      to enter a code from your authenticator app when signing in.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">Backup Codes</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Regenerate backup codes if you've lost them
                          </p>
                        </div>
                        <Button
                          onClick={async () => {
                            const password = prompt('Enter your password to regenerate backup codes:');
                            if (!password) return;
                            try {
                              const result = await apiClient.regenerateBackupCodes(password);
                              if (result.success) {
                                alert('New backup codes:\n\n' + result.backupCodes.join('\n') + '\n\nSave these codes in a safe place!');
                              }
                            } catch (err: any) {
                              alert(err.response?.data?.error || 'Failed to regenerate backup codes');
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-foreground hover:bg-card"
                        >
                          Regenerate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-error/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">Disable 2FA</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Turn off two-factor authentication
                          </p>
                        </div>
                        <Button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
                              return;
                            }
                            const password = prompt('Enter your password to confirm:');
                            if (!password) return;
                            try {
                              const result = await apiClient.disableMFA(password);
                              if (result.success) {
                                setMfaEnabled(false);
                                setSuccess('Two-factor authentication disabled');
                                setTimeout(() => setSuccess(''), 3000);
                              }
                            } catch (err: any) {
                              setError(err.response?.data?.error || 'Failed to disable 2FA');
                              setTimeout(() => setError(''), 3000);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error/10"
                        >
                          Disable
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <SessionManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-warning/15 rounded-2xl">
                <Bell className="h-6 w-6 text-warning" />
              </div>
              <h3 className="ios-headline text-foreground">Notification Preferences</h3>
            </div>
            
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="toggle-row flex items-center justify-between p-4">
                  <div>
                    <h4 className="font-semibold text-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="ios-caption text-muted-foreground">
                      {key === 'generationComplete' && 'Notify when generations are finished'}
                      {key === 'nerComplete' && 'Notify when entity extraction completes'}
                      {key === 'usageDigest' && 'Weekly usage summary'}
                      {key === 'systemUpdates' && 'System maintenance notifications'}
                      {key === 'securityAlerts' && 'Critical security alerts'}
                    </p>
                  </div>
                  <Switch 
                    checked={value}
                    onCheckedChange={(checked) => {
                      setNotifications({...notifications, [key]: checked});
                      // Auto-save on change
                      setTimeout(() => savePreferences(), 500);
                    }}
                  />
                </div>
              ))}
              
              <div className="flex justify-end pt-4">
                <button 
                  onClick={savePreferences}
                  className="ios-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showMFASetup && (
        <MFASetup
          onComplete={() => {
            setShowMFASetup(false);
            setMfaEnabled(true);
            checkMFAStatus();
          }}
          onCancel={() => setShowMFASetup(false)}
        />
      )}
    </div>
  );
}
