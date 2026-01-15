import { useState } from 'react';
import { Shield, Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/button';
import { apiClient } from '../../lib/api';
import { AngkorWatLogo } from '../AngkorWatLogo';

export type UserTier = 'free' | 'premium' | 'business';

interface ModernLoginProps {
  onLogin: (userData: any, token: string) => void;
  onBackToScanner?: () => void;
}

export function ModernLogin({ onLogin, onBackToScanner }: ModernLoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (!email || !password) {
        throw new Error('Please fill in all required fields');
      }

      if (!isLogin && !name) {
        throw new Error('Please enter your full name');
      }

      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      let data;
      if (isLogin) {
        data = await apiClient.login(email.toLowerCase().trim(), password);
      } else {
        data = await apiClient.register({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password
        });
      }

      if (data?.token) {
        apiClient.setToken(data.token);
        onLogin(data.user, data.token);
      } else {
        throw new Error(isLogin ? 'Invalid credentials' : 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Login failed' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setIsLoading(true);

    try {
      if (!forgotEmail || !forgotEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      await apiClient.forgotPassword(forgotEmail.toLowerCase().trim());
      setResetSuccess('Password reset link sent! Check your email.');
      setForgotEmail('');
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const signUpHighlights = [
    'Instant Khmer writing suggestions so every sentence feels polished',
    'Secure workspaces with optional premium insights',
    'Priority access to upgrades, chat, and APIs as your needs grow'
  ];
  const cardWidthClass = isLogin ? 'max-w-md' : 'max-w-[950px]';

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Liquid Bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="floating-bubble bubble-delay-0 w-20 h-20 top-[10%] left-[15%]"></div>
        <div className="floating-bubble bubble-delay-2 w-16 h-16 top-[25%] right-[20%]"></div>
        <div className="floating-bubble bubble-delay-4 w-24 h-24 bottom-[30%] left-[10%]"></div>
        <div className="floating-bubble bubble-delay-1 w-12 h-12 top-[60%] right-[15%]"></div>
        <div className="floating-bubble bubble-delay-3 w-32 h-32 bottom-[10%] right-[25%]"></div>
      </div>
      
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className={`w-full ${cardWidthClass} glass-card p-8 sm:p-10 water-ripple`}>
          <div className="text-center mb-8 sm:mb-10">
              <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="p-5 gradient-bg-ocean rounded-full shadow-2xl">
                  <AngkorWatLogo className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 status-online"></div>
              </div>
            </div>
            
            <div className="flex justify-center mb-8">
              <div className="floating-nav p-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 water-ripple ${
                    isLogin
                      ? 'bg-card text-foreground shadow-xl transform scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <User className="h-4 w-4" />
                    Sign In
                  </div>
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 water-ripple ${
                    !isLogin
                      ? 'bg-card text-foreground shadow-xl transform scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Sparkles className="h-4 w-4" />
                    Sign Up
                  </div>
                </button>
              </div>
            </div>
            
            <h2 className="ios-title mb-3 font-bold">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="ios-body text-muted-foreground leading-relaxed">
              {isLogin ? 'Sign in to your secure account' : 'Create your digital workspace'}
            </p>
            {!isLogin && (
              <div className="text-left text-sm text-muted-foreground mt-5 space-y-2">
                <div className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">
                  Why join Khmer AI Writer?
                </div>
                <ul className="space-y-1">
                  {signUpHighlights.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-8 p-5 glass-card bg-error/10 border-error/20 rounded-2xl">
              <div className="text-sm text-error font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-error rounded-full"></div>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {!isLogin && (
              <div>
                <label className="ios-caption text-muted-foreground mb-4 font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="water-ripple"
                />
              </div>
            )}

            <div>
              <label className="ios-caption text-muted-foreground mb-4 font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="water-ripple"
              />
            </div>

            <div>
              <label className="ios-caption text-muted-foreground mb-4 font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="water-ripple pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-300 p-2 rounded-xl hover:bg-card water-ripple"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {isLogin && (
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="ios-caption text-muted-foreground mb-1 font-semibold">
                  Account Level
                </label>
                <p className="text-sm text-muted-foreground">
                  New accounts always start on the Free plan. After you log in, use the dashboard’s upgrade flow to purchase Premium or Business access.
                </p>
                <p className="text-xs text-muted-foreground">
                  The plan tiles were removed so you can sign up quickly; the full upgrade experience lives inside the authenticated dashboard.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="ios-button w-full h-16 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed water-ripple"
            >
              {isLoading ? (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center">
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </button>

            {onBackToScanner && (
              <button
                type="button"
                onClick={onBackToScanner}
                className="ios-button-secondary w-full h-16 text-lg font-semibold water-ripple"
              >
                <div className="flex items-center gap-3 justify-center">
                  <Shield className="h-5 w-5" />
                  Back to Free Writer
                </div>
              </button>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">
              Your data is protected with enterprise-grade security
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md glass-card p-8 relative">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setResetSuccess('');
                setForgotEmail('');
              }}
              aria-label="Close reset password dialog"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 gradient-bg-ocean rounded-full">
                  <Lock className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="ios-headline text-foreground mb-2">Reset Password</h3>
              <p className="ios-body text-muted-foreground">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {resetSuccess && (
              <div className="mb-6 p-4 glass-card bg-success/10 border-success/20 rounded-2xl">
                <div className="text-sm text-success font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>{resetSuccess}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 glass-card bg-error/10 border-error/20 rounded-2xl">
                <div className="text-sm text-error font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-error rounded-full"></div>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="ios-caption text-muted-foreground mb-3 font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="water-ripple"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="ios-button w-full h-14 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setForgotEmail('');
                }}
                className="ios-button-secondary w-full h-14"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
