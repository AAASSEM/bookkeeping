import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTranslation, type Language } from '@/utils/translations';
import { formatDate } from '@/utils/dateFormatter';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualTransaction: (data: { description: string, debit: string, credit: string, amount: number, isClosingEntry: boolean }) => void;
  onExport: (closingEntries: any[]) => void;
  onResetAfterClosing: () => void;
  netIncome: number;
  totalRevenue: number;
  totalCOGS: number;
  totalLosses: number;
  totalGains: number;
  partners: { name: string; capital: number; }[];
  language: Language;
}

export const ManualTransactionModal = ({
  isOpen,
  onClose,
  onManualTransaction,
  onExport,
  onResetAfterClosing,
  netIncome,
  totalRevenue,
  totalCOGS,
  totalLosses,
  totalGains,
  partners,
  language
}: ManualTransactionModalProps) => {
  const { t } = useTranslation(language);
  const [error, setError] = useState('');
  const [distributions, setDistributions] = useState<{ [key: string]: number }>({});
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pendingClosingData, setPendingClosingData] = useState<any>(null);

  // Initialize distributions when partners change
  useEffect(() => {
    if (partners.length > 0) {
      const equalShare = 100 / partners.length;
      const initialDistributions = partners.reduce((acc, partner) => ({
        ...acc,
        [partner.name]: equalShare
      }), {});
      setDistributions(initialDistributions);
      setTotalPercentage(100);
    }
  }, [partners]);

  const handleDistributionChange = (partnerName: string, value: string) => {
    const newValue = parseFloat(value) || 0;
    const newDistributions = {
      ...distributions,
      [partnerName]: newValue
    };
    setDistributions(newDistributions);
    
    // Calculate total percentage
    const total = Object.values(newDistributions).reduce((sum, val) => sum + val, 0);
    setTotalPercentage(total);
  };

  const calculatePartnerShares = () => {
    return partners.map(partner => ({
      name: partner.name,
      share: ((distributions?.[partner.name] || 0) / 100) * Math.abs(netIncome)
    }));
  };

  const handleClosingProcess = () => {
    setError(''); // Clear any previous errors

    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError(t('totalDistributionError'));
      return;
    }

    // Show first confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmProceed = async () => {
    setShowConfirmDialog(false);

    try {
      // Record the closing entry itself
      const closingEntry = {
        id: crypto.randomUUID(),
        date: formatDate(),
        description: "Closing Entry - Income Summary to Partner Capitals",
        type: 'closing' as const,
        amount: Math.abs(netIncome),
        debit: netIncome > 0 ? `Income Summary $${Math.abs(netIncome).toFixed(2)}` : `Partner Capitals $${Math.abs(netIncome).toFixed(2)}`,
        credit: netIncome > 0 ? `Partner Capitals $${Math.abs(netIncome).toFixed(2)}` : `Income Summary $${Math.abs(netIncome).toFixed(2)}`
      };

      // Record the distribution entries
      const distributionEntries = partners.map(partner => {
        const share = (Math.abs(netIncome) * (distributions?.[partner.name] || 0) / 100);
        return {
          id: crypto.randomUUID(),
          date: formatDate(),
          description: `Distribution to ${partner.name}`,
          type: 'closing' as const,
          amount: share,
          debit: netIncome > 0 ? `${partner.name} Capital $${share.toFixed(2)}` : `Income Summary $${share.toFixed(2)}`,
          credit: netIncome > 0 ? `Income Summary $${share.toFixed(2)}` : `${partner.name} Capital $${share.toFixed(2)}`,
          partnerName: partner.name
        };
      });

      // Collect all closing entries for export
      const allClosingEntries = [closingEntry, ...distributionEntries];

      // Store pending data
      setPendingClosingData(allClosingEntries);

      // Call onManualTransaction for each entry to update state
      await onManualTransaction({
        description: closingEntry.description,
        debit: closingEntry.debit,
        credit: closingEntry.credit,
        amount: closingEntry.amount,
        isClosingEntry: true
      });

      for (const entry of distributionEntries) {
        await onManualTransaction({
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit,
          amount: entry.amount,
          isClosingEntry: true
        });
      }

      // Show export confirmation dialog
      setShowExportDialog(true);
    } catch (error) {
      console.error('Error during closing process:', error);
      setError(t('errorDuringClosing'));
    }
  };

  const handleConfirmExport = async () => {
    setShowExportDialog(false);
    // Export data with closing entries and reset system
    await onExport(pendingClosingData);
    onResetAfterClosing();
    onClose();
  };

  const handleCancelExport = () => {
    setShowExportDialog(false);
    onClose();
  };

  const partnerShares = calculatePartnerShares();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('closingEntry')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">{t('distributionInstructions')}</p>
              <p className="font-medium mb-4">{t('netIncome')}: ${netIncome.toFixed(2)}</p>

              <div className="space-y-4">
                {partners.map(partner => (
                  <div key={partner.name} className="grid grid-cols-2 gap-4 items-center">
                    <Label htmlFor={partner.name}>{partner.name}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={partner.name}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={distributions?.[partner.name] || 0}
                        onChange={(e) => handleDistributionChange(partner.name, e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-2 bg-muted rounded">
                <p className="font-medium">{t('distributionSummary')}:</p>
                <ul className="list-disc pl-4 mt-2">
                  {partnerShares.map(partner => (
                    <li key={partner.name}>
                      {partner.name}: ${partner.share.toFixed(2)} ({(distributions?.[partner.name] || 0).toFixed(1)}%)
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-medium">
                  {t('total')}: {totalPercentage.toFixed(1)}%
                  {Math.abs(totalPercentage - 100) > 0.01 && (
                    <span className="text-red-500 ml-2">{t('mustEqual100')}</span>
                  )}
                </p>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleClosingProcess}
              variant="destructive"
              disabled={Math.abs(totalPercentage - 100) > 0.01}
            >
              {t('completeClosing')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* First Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('closingEntry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('overallConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmProceed}>
              {t('completeClosing')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Confirmation Dialog */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exportAllStatements')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exportConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExport}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExport}>
              {t('exportAllStatements')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 