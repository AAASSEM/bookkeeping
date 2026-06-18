import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import type { Transaction } from '@/types';
import type { Language } from '@/utils/translations';
import { translateAccountEntry, translateDescription } from '@/utils/transactionText';

interface RecentTransactionsTableProps {
  t: (key: string) => string;
  language: Language;
  transactions: Transaction[];
  onEditTransactions: () => void;
  onUpdateNote: (transactionId: string, note: string) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export const RecentTransactionsTable = ({
  t,
  language,
  transactions,
  onEditTransactions,
  onUpdateNote,
  onDeleteTransaction,
}: RecentTransactionsTableProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const transactionScrollRef = useRef<HTMLDivElement>(null);

  // Always scroll transaction table to the left (start)
  useEffect(() => {
    if (transactionScrollRef.current) {
      transactionScrollRef.current.scrollLeft = 0;
    }
  }, [language, transactions]);

  return (
    <Card className="bg-card border-default">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-primary">{t('recentTransactions')}</CardTitle>
        <Button
          onClick={onEditTransactions}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          {t('editTransactions')}
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-secondary text-center py-4">{t('noTransactions')}</p>
        ) : (
          <div ref={transactionScrollRef} className={`overflow-x-scroll transaction-scroll-container ${language === 'ar' ? 'rtl-mode arabic-text' : 'english-text'}`}>
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('type')}</th>
                  <th>{t('description')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('debit')}</th>
                  <th>{t('credit')}</th>
                  <th>{t('note')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-primary">
                {transactions.slice(-10).reverse().map((transaction) => {
                   const getTypeColor = (type: string) => {
                     const colors: Record<string, string> = {
                       purchase: 'transaction-type-purchase',
                       sale: 'transaction-type-sale',
                       expense: 'transaction-type-expense',
                       withdrawal: 'transaction-type-withdrawal',
                       investing: 'transaction-type-investing',
                       deposit: 'transaction-type-deposit',
                       gain: 'transaction-type-gain',
                       loss: 'transaction-type-loss',
                       payable: 'transaction-type-payable',
                       receivable: 'transaction-type-receivable',
                       create: 'transaction-type-create',
                       closing: 'transaction-type-closing',
                       manual: 'transaction-type-manual'
                     };
                     return colors[type] || 'transaction-type-default';
                   };

                  const capitalizeFirst = (str: string) => {
                    return str.charAt(0).toUpperCase() + str.slice(1);
                  };

                  return (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>
                      <span className={`font-semibold ${getTypeColor(transaction.type)}`}>
                        {capitalizeFirst(t(transaction.type))}
                      </span>
                    </td>
                    <td>{translateDescription(transaction.description, language, t)}</td>
                    <td className="transaction-amount">${transaction.amount.toFixed(2)}</td>
                    <td className="transaction-debit">{translateAccountEntry(transaction.debit, t)}</td>
                    <td className="transaction-credit">{translateAccountEntry(transaction.credit, t)}</td>
                    <td>
                      <input
                        type="text"
                        value={transaction.note || ''}
                        onChange={(e) => onUpdateNote(transaction.id, e.target.value)}
                        placeholder={t('addNote')}
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                      />
                    </td>
                    <td>
                      <AlertDialog open={deleteConfirmId === transaction.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            onClick={() => setDeleteConfirmId(transaction.id)}
                            variant="destructive"
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteTransactionWarning')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                onDeleteTransaction(transaction.id);
                                setDeleteConfirmId(null);
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
