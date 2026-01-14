import { KhmerWriter } from '../writer/KhmerWriter';

interface ThreatScannerProps {
  isAuthenticated?: boolean;
  userTier?: string;
}

export function ThreatScanner({ userTier = 'free' }: ThreatScannerProps) {
  return <KhmerWriter userTier={userTier} />;
}
