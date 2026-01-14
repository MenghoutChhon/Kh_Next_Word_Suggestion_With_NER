'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Smartphone,
  Key,
  Copy,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import { useToast } from './ui/toast';
import { apiClient } from '../lib/api';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [loading, setLoading] = useState(false);
  const [mfaData, setMfaData] = useState<{
    secret?: string;
    qrCode?: string;
    backupCodes?: string[];
  }>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const { toast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await apiClient.setupMFA();
      if (response.success) {
        setMfaData({
          secret: response.secret,
          qrCode: response.qrCode,
          backupCodes: response.backupCodes
        });
        setStep('verify');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.verifyAndEnableMFA(verificationCode);
      if (response.success) {
        toast.success('MFA enabled successfully!');
        setStep('backup');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (mfaData.secret) {
      navigator.clipboard.writeText(mfaData.secret);
      setCopiedSecret(true);
      toast.success('Secret key copied to clipboard');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyBackupCodes = () => {
    if (mfaData.backupCodes) {
      navigator.clipboard.writeText(mfaData.backupCodes.join('\n'));
      setCopiedCodes(true);
      toast.success('Backup codes copied to clipboard');
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    if (mfaData.backupCodes) {
      const blob = new Blob(
        [`Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${mfaData.backupCodes.join('\n')}\n\nKeep these codes safe! Each code can only be used once.`],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mfa-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup codes downloaded');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="glass-card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" />
            Setup Two-Factor Authentication
          </CardTitle>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-card"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'setup' ? 'bg-primary text-white' : 'bg-success text-white'
              }`}>
                {step === 'setup' ? '1' : <CheckCircle className="h-5 w-5" />}
              </div>
              <span className="text-foreground font-medium">Setup</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'verify' ? 'bg-primary text-white' : 
                step === 'backup' ? 'bg-success text-white' : 
                'bg-card text-muted-foreground'
              }`}>
                {step === 'backup' ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span className={`font-medium ${
                step === 'setup' ? 'text-muted-foreground' : 'text-foreground'
              }`}>Verify</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'backup' ? 'bg-primary text-white' : 'bg-card text-muted-foreground'
              }`}>
                3
              </div>
              <span className={`font-medium ${
                step !== 'backup' ? 'text-muted-foreground' : 'text-foreground'
              }`}>Backup Codes</span>
            </div>
          </div>

          {/* Step 1: Setup */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="flex gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Before you begin</p>
                  <p className="mb-3">You'll need an authenticator app on your phone. We recommend:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Google Authenticator (iOS/Android)</li>
                    <li>Microsoft Authenticator (iOS/Android)</li>
                    <li>Authy (iOS/Android)</li>
                    <li>1Password (iOS/Android/Desktop)</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-foreground font-medium">What is Two-Factor Authentication?</h3>
                <p className="text-muted-foreground text-sm">
                  Two-factor authentication (2FA) adds an extra layer of security to your account. 
                  In addition to your password, you'll need to enter a verification code from your 
                  authenticator app when signing in.
                </p>
              </div>

              <Button
                onClick={handleSetup}
                disabled={loading}
                className="ios-button w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Begin Setup
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 'verify' && mfaData.qrCode && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-foreground font-medium">Scan QR Code</h3>
                <p className="text-muted-foreground text-sm">
                  Open your authenticator app and scan this QR code:
                </p>
                
                {/* QR Code */}
                <div className="flex justify-center p-6 bg-white rounded-xl">
                  <img 
                    src={mfaData.qrCode} 
                    alt="MFA QR Code" 
                    className="w-64 h-64"
                  />
                </div>

                {/* Manual Entry */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={mfaData.secret}
                      readOnly
                      className="glass-card font-mono"
                    />
                    <Button
                      onClick={copySecret}
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-foreground hover:bg-card"
                    >
                      {copiedSecret ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Verification Input */}
              <div className="space-y-4 border-t border-border pt-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Enter Verification Code</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app:
                  </p>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="glass-card text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={loading || verificationCode.length !== 6}
                  className="ios-button w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify and Enable
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 'backup' && mfaData.backupCodes && (
            <div className="space-y-6">
              <div className="flex gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Save Your Backup Codes</p>
                  <p>
                    These codes can be used to access your account if you lose access to your 
                    authenticator app. Each code can only be used once. Store them in a safe place!
                  </p>
                </div>
              </div>

              {/* Backup Codes */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-4 bg-card rounded-xl border border-border">
                  {mfaData.backupCodes.map((code, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-3 bg-card rounded-lg"
                    >
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <code className="text-foreground font-mono text-sm">{code}</code>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={copyBackupCodes}
                    variant="ghost"
                    className="flex-1 ios-button-secondary"
                  >
                    {copiedCodes ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-success" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Codes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadBackupCodes}
                    variant="ghost"
                    className="flex-1 ios-button-secondary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <Button
                onClick={onComplete}
                className="ios-button w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                I've Saved My Backup Codes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MFASetup;
