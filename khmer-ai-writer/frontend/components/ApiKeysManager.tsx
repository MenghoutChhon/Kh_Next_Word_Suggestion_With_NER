'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertTriangle, Crown, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { apiClient, ApiKey } from '../lib/api';
import { UserTier } from './auth/Login';

interface ApiKeysManagerProps {
  userTier: UserTier;
}

export function ApiKeysManager({ userTier }: ApiKeysManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['lm:suggest', 'lm:complete', 'lm:score']);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const canUseApiKeys = userTier === 'premium' || userTier === 'business';

  useEffect(() => {
    if (canUseApiKeys) {
      loadApiKeys();
      
      // Auto-refresh API keys list every 60 seconds
      const refreshInterval = setInterval(() => {
        loadApiKeys();
      }, 60000);
      
      return () => clearInterval(refreshInterval);
    }
  }, [canUseApiKeys]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listApiKeys();
      setApiKeys(response.apiKeys || []);
    } catch (error: any) {
      console.error('Failed to load API keys:', error);
      if (error.response?.data?.upgrade_required) {
        // Handle upgrade required
      }
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      setLoading(true);
      const response = await apiClient.createApiKey(
        newKeyName.trim(),
        newKeyScopes,
        newKeyRateLimit
      );
      
      setCreatedKey(response.key);
      setApiKeys(prev => [response.apiKey, ...prev]);
      setShowCreateForm(false);
      setNewKeyName('');
      setNewKeyScopes(['lm:suggest', 'lm:complete', 'lm:score']);
      setNewKeyRateLimit(100);
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      alert(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.revokeApiKey(id);
      setApiKeys(prev => prev.map(key => 
        key.id === id ? { ...key, status: 'revoked' } : key
      ));
    } catch (error: any) {
      console.error('Failed to revoke API key:', error);
      alert(error.response?.data?.error || 'Failed to revoke API key');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!canUseApiKeys) {
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
            <div className="p-4 gradient-bg-ocean rounded-2xl shadow-lg">
              <Key className="h-8 w-8 text-foreground" />
            </div>
            <div>
              <h2 className="ios-title text-foreground font-bold">API Keys</h2>
              <p className="ios-body text-muted-foreground font-medium">
                Manage your API keys for programmatic access
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-12 rounded-3xl text-center">
          <div className="p-8 gradient-bg-sunset rounded-full w-fit mx-auto mb-8">
            <Crown className="h-16 w-16 text-foreground" />
          </div>
          <h3 className="ios-headline text-foreground mb-4 font-bold">Upgrade Required</h3>
          <p className="ios-body text-muted-foreground mb-6 max-w-md mx-auto font-medium">
            API Keys are a premium feature starting at $29/month. Get programmatic access to Khmer AI Writer with dedicated rate limits and priority support.
          </p>
          <div className="glass-card p-6 mb-8 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-bold text-foreground text-lg">Premium - $29/mo</div>
                <div className="text-muted-foreground font-medium">500 API calls/hour</div>
              </div>
              <div>
                <div className="font-bold text-foreground text-lg">Business - $99/mo</div>
                <div className="text-muted-foreground font-medium">2000 API calls/hour</div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="ios-button water-ripple">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium - $29/mo
            </button>
            <button className="ios-button-secondary water-ripple">
              <Building2 className="h-4 w-4 mr-2" />
              Business Plan - $99/mo
            </button>
          </div>
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

      {/* Header */}
      <div className="glass-card p-8 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 gradient-bg-ocean rounded-2xl shadow-lg">
              <Key className="h-8 w-8 text-foreground" />
            </div>
            <div>
              <h2 className="ios-title text-foreground font-bold">API Keys</h2>
              <p className="ios-body text-muted-foreground font-medium">
                Manage your API keys for programmatic access
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreateForm(true)} disabled={loading} className="ios-button water-ripple">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </button>
        </div>
      </div>

      {/* Created Key Display */}
      {createdKey && (
        <div className="glass-card p-8 rounded-3xl bg-success/15 border-success/40">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 gradient-bg-forest rounded-2xl shadow-lg">
              <Key className="h-7 w-7 text-foreground" />
            </div>
            <h3 className="ios-headline text-foreground font-bold">API Key Created Successfully</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Save this key now - you won't be able to see it again!
            </p>
            <div className="flex items-center gap-3 p-4 glass-card rounded-2xl">
              <code className="flex-1 text-sm font-mono text-foreground font-medium">
                {showKey ? createdKey : createdKey.replace(/./g, '*')}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                className="ios-button-secondary p-3 water-ripple"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                title={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => copyToClipboard(createdKey)}
                className="ios-button p-3 water-ripple"
                aria-label="Copy API key"
                title="Copy API key"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="ios-button-secondary water-ripple"
            >
              I've saved the key
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="glass-card p-8 rounded-3xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 gradient-bg-lavender rounded-2xl shadow-lg">
              <Plus className="h-7 w-7 text-foreground" />
            </div>
            <h3 className="ios-headline text-foreground font-bold">Create New API Key</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="api-key-name" className="text-sm font-semibold text-muted-foreground mb-3 block">
                Key Name
              </label>
              <input
                id="api-key-name"
                type="text"
                placeholder="My API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="water-ripple"
              />
            </div>
            
            <div>
              <label htmlFor="api-key-rate-limit" className="text-sm font-semibold text-muted-foreground mb-3 block">
                Rate Limit (requests per hour)
              </label>
              <input
                id="api-key-rate-limit"
                type="number"
                min="1"
                max={userTier === 'business' ? 1000 : 500}
                value={newKeyRateLimit}
                onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 100)}
                className="water-ripple"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={createApiKey} disabled={loading || !newKeyName.trim()} className="ios-button water-ripple">
                Create Key
              </button>
              <button onClick={() => setShowCreateForm(false)} className="ios-button-secondary water-ripple">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-6">
        {loading && apiKeys.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
            <p className="text-muted-foreground font-medium">Loading API keys...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl text-center">
            <div className="p-6 gradient-bg-ocean rounded-full w-fit mx-auto mb-6">
              <Key className="h-12 w-12 text-foreground" />
            </div>
            <h3 className="ios-headline text-foreground mb-3 font-bold">
              No API Keys
            </h3>
            <p className="ios-body text-muted-foreground mb-6 font-medium">
              Create your first API key to start using our programmatic interface
            </p>
            <button onClick={() => setShowCreateForm(true)} className="ios-button water-ripple">
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="glass-card p-6 rounded-3xl water-ripple">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 gradient-bg-ocean rounded-2xl">
                      <Key className="h-5 w-5 text-foreground" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">
                      {apiKey.name}
                    </h3>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                      apiKey.status === 'active' ? 'bg-success/20 text-foreground border border-success/40' : 'bg-error/20 text-foreground border border-error/40'
                    }`}>
                      {apiKey.status}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground font-medium">
                    <p>Key: <code className="glass-card px-3 py-1 rounded font-mono">{apiKey.key_prefix}</code></p>
                    <p>Rate Limit: {apiKey.rate_limit_per_hour}/hour ({apiKey.requests_used_hour} used)</p>
                    <p>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                    {apiKey.last_used_at && (
                      <p>Last Used: {new Date(apiKey.last_used_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(apiKey.key_prefix)}
                    className="ios-button-secondary p-3 water-ripple"
                    aria-label={`Copy API key prefix for ${apiKey.name}`}
                    title={`Copy API key prefix for ${apiKey.name}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {apiKey.status === 'active' && (
                    <button
                      onClick={() => revokeApiKey(apiKey.id)}
                      disabled={loading}
                      className="ios-button-secondary p-3 text-error hover:text-error water-ripple"
                      aria-label={`Revoke API key ${apiKey.name}`}
                      title={`Revoke API key ${apiKey.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
