import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualTransaction: (data: { description: string, debit: string, credit: string, amount: number, isClosingEntry: boolean }) => void;
  onExport: () => void;
  onResetAfterClosing: () => void;
  netIncome: number;
  partners: { name: string; capital: number; }[];
}

export const ManualTransactionModal = ({ 
  isOpen, 
  onClose, 
  onManualTransaction, 
  onExport, 
  onResetAfterClosing,
  netIncome,
  partners 
}: ManualTransactionModalProps) => {
  const [error, setError] = useState('');

  const calculatePartnerShares = () => {
    const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);
    return partners.map(partner => ({
      name: partner.name,
      share: (partner.capital / totalCapital) * Math.abs(netIncome)
    }));
  };

  const handleClosingProcess = async () => {
    try {
      const partnerShares = calculatePartnerShares();
      
      // Create the closing entry
      const closingEntry = {
        description: "Closing Entry - Transfer Net Income to Capital",
        debit: `Net Income $${Math.abs(netIncome).toFixed(2)}`,
        credit: partnerShares.map(p => `${p.name} Capital $${p.share.toFixed(2)}`).join(', '),
        amount: Math.abs(netIncome),
        isClosingEntry: true
      };

      // Submit the closing entry
      onManualTransaction(closingEntry);

      // Export the data
      await onExport();
      
      // Show confirmation dialog for reset
      const confirmed = window.confirm(
        "Are you sure you want to create the closing entry and reset the system? This action cannot be undone."
      );
      
      if (confirmed) {
        onResetAfterClosing();
        onClose();
      }
    } catch (error) {
      console.error('Error during closing process:', error);
      alert('Error during closing process. Please try again.');
    }
  };

  const partnerShares = calculatePartnerShares();
  const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Closing Entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">This will create a closing entry to transfer the net income to partners' capital accounts based on their capital contribution ratios.</p>
            <p className="font-medium">Net Income: ${netIncome.toFixed(2)}</p>
            <p className="font-medium">Total Capital: ${totalCapital.toFixed(2)}</p>
            <p className="font-medium">Partners' Shares:</p>
            <ul className="list-disc pl-4">
              {partnerShares.map(partner => (
                <li key={partner.name}>
                  {partner.name}: ${partner.share.toFixed(2)} ({(partner.share / Math.abs(netIncome) * 100).toFixed(1)}%)
                </li>
              ))}
            </ul>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleClosingProcess} variant="destructive">
            Complete Closing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 