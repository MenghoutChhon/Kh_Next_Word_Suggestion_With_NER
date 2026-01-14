import { KhmerWriter } from '../writer/KhmerWriter';

interface ScannerDashboardProps {
  onScanComplete: (message: string) => void;
}

export function ScannerDashboard({ onScanComplete }: ScannerDashboardProps) {
  return (
    <div className="space-y-4">
      <KhmerWriter userTier="free" />
      <button
        className="ios-button-secondary water-ripple"
        onClick={() => onScanComplete('Writer ready')}
      >
        Ready
      </button>
    </div>
  );
}
