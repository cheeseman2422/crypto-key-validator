import { useState, useCallback } from 'react';

export interface Artifact {
  id: string;
  type: string;
  raw: string;
  validationStatus: 'valid' | 'invalid' | 'pending';
  source: { type: string; path?: string };
  metadata: { 
    cryptocurrency: { name: string; symbol: string };
    confidence: number;
  };
  balanceInfo?: {
    balance: string;
    currency: string;
  };
  createdAt: Date;
}

export interface Statistics {
  totalArtifacts: number;
  validArtifacts: number;
  artifactsWithBalance: number;
  totalBalance: string;
}

export interface ScanProgress {
  phase: string;
  filesScanned: number;
  totalFiles: number;
  artifactsFound: number;
  validatedArtifacts: number;
  currentFile: string;
}

export interface Toast {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export function useAppState() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalArtifacts: 0,
    validArtifacts: 0,
    artifactsWithBalance: 0,
    totalBalance: 'Offline'
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    phase: 'idle',
    filesScanned: 0,
    totalFiles: 0,
    artifactsFound: 0,
    validatedArtifacts: 0,
    currentFile: ''
  });
  const [toast, setToast] = useState<Toast | null>(null);

  const refreshData = useCallback(async () => {
    try {
      if (!window.cryptoValidator) {
        console.warn('cryptoValidator API not available');
        return;
      }
      
      const [newArtifacts, newStatistics] = await Promise.all([
        window.cryptoValidator.getArtifacts(),
        window.cryptoValidator.getStatistics()
      ]);
      
      setArtifacts(newArtifacts || []);
      setStatistics(newStatistics || {
        totalArtifacts: 0,
        validArtifacts: 0,
        artifactsWithBalance: 0,
        totalBalance: 'Offline'
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
      showToast('error', 'Failed to load data');
    }
  }, []);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Listen to engine events
  const handleScanStarted = useCallback(() => {
    setIsScanning(true);
    setScanProgress(prev => ({ ...prev, phase: 'starting' }));
  }, []);

  const handleScanProgress = useCallback((progress: ScanProgress) => {
    setScanProgress(progress);
  }, []);

  const handleScanCompleted = useCallback(() => {
    setIsScanning(false);
    refreshData();
    showToast('success', 'Scan completed successfully!');
  }, [refreshData, showToast]);

  const handleScanError = useCallback((error: any) => {
    setIsScanning(false);
    showToast('error', `Scan failed: ${error.error || 'Unknown error'}`);
  }, [showToast]);

  const handleArtifactValidated = useCallback((data: any) => {
    // Could update individual artifact status here
    console.log('Artifact validated:', data);
  }, []);

  const handleBalanceFound = useCallback((data: any) => {
    // Balance checking is disabled in offline mode
    console.log('Balance found event received but balance checking is disabled');
  }, []);

  return {
    artifacts,
    statistics,
    isScanning,
    scanProgress,
    toast,
    refreshData,
    showToast,
    hideToast,
    // Event handlers for engine events
    handleScanStarted,
    handleScanProgress,
    handleScanCompleted,
    handleScanError,
    handleArtifactValidated,
    handleBalanceFound
  };
}
