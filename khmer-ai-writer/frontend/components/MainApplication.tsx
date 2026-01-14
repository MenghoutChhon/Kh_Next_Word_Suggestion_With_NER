import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModernLogin as Login, UserTier } from './auth/Login';
import { Dashboard } from './dashboard/Dashboard';
import { KhmerWriter } from './writer/KhmerWriter';
import { TeamManagement } from './TeamManagement';
import { ChatAssistant } from './ChatAssistant';
import { ApiKeysManager } from './ApiKeysManager';
import { AuthGuard } from './auth/AuthGuard';
import { UserMetrics } from './dashboard/UserMetrics';
import { UpgradePlan } from './payment/UpgradePlan';
import { Settings } from './Settings';
import { PaymentCheckout } from './payment/PaymentCheckout';
import { apiClient } from '@/lib/api';
import { AngkorWatLogo } from './AngkorWatLogo';
import {
  BarChart3, Users, MessageSquare, Key, 
  Settings as SettingsIcon, LogOut, Menu, X, Crown, Building2, Zap,
  Activity, AlertCircle, PenLine, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface User {
  id: string;
  email: string;
  fullName: string;
  tier: UserTier;
}

type ViewType = 'writer' | 'dashboard' | 'team' | 'chat' | 'api-keys' | 'metrics' | 'settings' | 'upgrade' | 'checkout';

interface AppState {
  isLoading: boolean;
  error: string | null;
}

export function MainApplication() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('writer');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFreeWriter, setShowFreeWriter] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('token');
  });
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [appState, setAppState] = useState<AppState>({ isLoading: true, error: null });

  // Initialize user from localStorage
  useEffect(() => {
    const initializeUser = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          apiClient.setToken(token);
          apiClient.setUser(parsedUser);
          setUser(parsedUser);
          setShowFreeWriter(false);
        }
      } catch (error) {
        console.error('Failed to restore user session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAppState(prev => ({ ...prev, error: 'Session expired. Please log in again.' }));
      } finally {
        setAppState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeUser();
  }, []);

  const handleLogin = useCallback((userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setShowFreeWriter(false);
    setAppState({ isLoading: false, error: null });
  }, []);

  const handleLogout = useCallback(() => {
    apiClient.clearToken();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('writer');
    setShowFreeWriter(true);
    setSidebarOpen(false);
    setAppState({ isLoading: false, error: null });
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    setSidebarOpen(false);
  }, []);

  const handleCheckout = useCallback((plan: any) => {
    setSelectedPlan(plan);
    setCurrentView('checkout');
  }, []);

  const handlePaymentSuccess = useCallback(async (paymentData: any) => {
    console.log('Payment successful:', paymentData);
    
    try {
      // Call backend API to process payment and update user tier
      const planId = selectedPlan?.id;
      if (planId && planId !== 'free') {
        const response = await apiClient.processPayment({
          tier: planId as 'premium' | 'business',
          paymentMethod: paymentData.method.toLowerCase(),
          billingCycle: paymentData.cycle,
          transactionId: paymentData.transactionId,
          couponCode: paymentData.coupon,
          discount: paymentData.discount
        });

        console.log('Payment API response:', response);

        // The apiClient.processPayment already refreshes user data
        // Just update the local state from apiClient
        if (apiClient.user) {
          const updatedUser = {
            id: apiClient.user.id,
            email: apiClient.user.email,
            fullName: apiClient.user.full_name || '',
            tier: apiClient.user.tier
          };
          
          console.log('Updating user to:', updatedUser);
          setUser(updatedUser);
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Show success message
          alert(`Success! You are now on the ${apiClient.user.tier.toUpperCase()} plan!`);
        }
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('Payment processing failed. Please try again or contact support.');
    }

    setCurrentView('dashboard');
    setSelectedPlan(null);
  }, [selectedPlan]);

  const handleUpdateProfile = useCallback((data: any) => {
    console.log('Updating profile:', data);
    // Profile update logic here
  }, []);

  const getTierIcon = useCallback((tier: UserTier) => {
    const iconClass = "h-4 w-4";
    switch (tier) {
      case 'business': return <Building2 className={iconClass + " text-(--accent)"} />;
      case 'premium': return <Crown className={iconClass + " text-(--secondary)"} />;
      default: return <Zap className={iconClass + " text-(--primary)"} />;
    }
  }, []);

  const navigationItems = useMemo(() => [
    { id: 'writer' as ViewType, label: 'Writer', icon: PenLine, available: true },
    { id: 'chat' as ViewType, label: 'Chat', icon: MessageSquare, available: true },
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: BarChart3, available: true },
    { id: 'api-keys' as ViewType, label: 'API Keys', icon: Key, available: user?.tier === 'premium' || user?.tier === 'business' },
    { id: 'team' as ViewType, label: 'Teams', icon: Users, available: user?.tier !== 'free' },
    { id: 'metrics' as ViewType, label: 'Usage', icon: Activity, available: true },
    { id: 'settings' as ViewType, label: 'Settings', icon: SettingsIcon, available: true },
    { id: 'upgrade' as ViewType, label: 'Upgrade', icon: Crown, available: user?.tier !== 'business' }
  ], [user?.tier]);

  const renderContent = () => {
    if (appState.isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center animate-fade-in" style={{ background: 'var(--background)' }}>
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-(--muted-foreground)">Loading application...</p>
          </div>
        </div>
      );
    }

    if (appState.error && !user) {
      return (
        <div className="min-h-screen flex items-center justify-center animate-fade-in" style={{ background: 'var(--background)' }}>
          <div className="glass-card p-8 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-(--error) mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-(--muted-foreground) mb-6">{appState.error}</p>
            <button className="btn btn-primary w-full" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!user && showFreeWriter) {
      return (
        <div className="min-h-screen animate-fade-in" style={{ background: 'var(--background)' }}>
          {/* Free Writer Header */}
          <header className="nav-container">
            <div className="nav-content">
              <div className="nav-brand">
                <AngkorWatLogo className="icon-lg icon-accent" />
                <span>Khmer AI Writer</span>
              </div>
              <div className="nav-menu">
                <button 
                  onClick={() => setShowFreeWriter(false)}
                  className="btn btn-ghost"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowFreeWriter(false)}
                  className="ios-button"
                >
                  Start Free
                </button>
              </div>
            </div>
          </header>

          {/* Free Writer Content */}
          <main className="container">
            <div className="mb-8 animate-slide-up">
              <h1 className="ios-title mb-3">Write in Khmer with AI</h1>
              <p className="text-(--muted-foreground) text-lg">
                Try the writer and get instant suggestions without creating an account.
              </p>
            </div>
            <KhmerWriter userTier="free" />
          </main>
        </div>
      );
    }

    if (!user) {
      return <Login onLogin={handleLogin} onBackToScanner={() => setShowFreeWriter(true)} />;
    }

    return (
      <div className="min-h-screen flex animate-fade-in" style={{ background: 'var(--background)' }}>
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ zIndex: 50 }}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="sidebar-header">
              <div className="sidebar-header-content">
                <div className="icon-circle shrink-0">
                  <AngkorWatLogo className="icon-lg" />
                </div>
                <div className="min-w-0">
                  <h2 className="sidebar-title font-bold text-[1.1rem] truncate">
                    Khmer AI Writer
                  </h2>
                  <div className="sidebar-subtitle flex items-center gap-2 mt-1">
                    {getTierIcon(user.tier)}
                    <span className="text-xs capitalize truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {user.tier} Plan
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="icon-sm" /> : <ChevronLeft className="icon-sm" />}
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navigationItems.map((item) => {
                if (!item.available) return null;
                
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                const button = (
                  <button
                    onClick={() => handleViewChange(item.id)}
                    className={`sidebar-item w-full text-left group ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="icon-md shrink-0" />
                    <span className="sidebar-label">{item.label}</span>
                  </button>
                );

                if (!sidebarCollapsed) {
                  return button;
                }

                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--sidebar-border)' }}>
              {!sidebarCollapsed && (
                <div className="glass-card p-3">
                  <p className="font-semibold text-sm truncate sidebar-footer-text">
                    {user.fullName}
                  </p>
                  <p className="text-xs truncate mt-1 sidebar-footer-text" style={{ color: 'var(--muted-foreground)' }}>
                    {user.email}
                  </p>
                </div>
              )}
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className="btn btn-outline w-full justify-center"
                      aria-label="Logout"
                    >
                      <LogOut className="icon-sm shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    Logout
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={handleLogout}
                  className="btn btn-outline w-full justify-start"
                >
                  <LogOut className="icon-sm shrink-0" />
                  <span className="sidebar-label">Logout</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden nav-container">
            <div className="nav-content">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="toggle-btn"
              >
                {sidebarOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
              </button>
              <div className="flex items-center gap-3">
                {getTierIcon(user.tier)}
                <span className="font-semibold capitalize text-sm">{user.tier}</span>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className={`main-content overflow-auto flex-1 ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="animate-scale-in">
              {currentView === 'dashboard' && <Dashboard userTier={user.tier} onLogout={handleLogout} />}
              {currentView === 'writer' && <KhmerWriter userTier={user.tier} />}
              {currentView === 'team' && (
                <AuthGuard requiredTier="premium" userTier={user.tier} feature="Team Management">
                  <TeamManagement userTier={user.tier} />
                </AuthGuard>
              )}
              {currentView === 'chat' && <ChatAssistant userTier={user.tier} />}
              {currentView === 'api-keys' && (
                <AuthGuard requiredTier="premium" userTier={user.tier} feature="API Keys Management">
                  <ApiKeysManager userTier={user.tier} />
                </AuthGuard>
              )}
              {currentView === 'metrics' && (
                <UserMetrics 
                  userTier={user.tier}
                  onUpgrade={() => setCurrentView('upgrade')}
                />
              )}
              {currentView === 'settings' && (
                <Settings 
                  user={user} 
                  onUpdateProfile={handleUpdateProfile}
                  onUpgrade={() => setCurrentView('upgrade')}
                />
              )}
              {currentView === 'upgrade' && (
                <UpgradePlan 
                  currentTier={user.tier}
                  onCheckout={handleCheckout}
                  onUpgrade={(tier) => console.log('Upgrade selected:', tier)}
                />
              )}
              {currentView === 'checkout' && selectedPlan && (
                <PaymentCheckout
                  selectedPlan={selectedPlan}
                  onBack={() => setCurrentView('upgrade')}
                  onSuccess={handlePaymentSuccess}
                />
              )}
            </div>
          </main>
        </div>

        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden overlay-dark z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    );
  };

  return renderContent();
}
