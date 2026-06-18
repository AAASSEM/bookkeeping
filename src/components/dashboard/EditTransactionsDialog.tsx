import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/types';

interface EditTransactionsDialogProps {
  t: (key: string) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  editingTransaction: Transaction | null;
  setEditingTransaction: (transaction: Transaction | null) => void;
  onSave: (transaction: Transaction) => void;
}

export const EditTransactionsDialog = ({
  t,
  open,
  onOpenChange,
  transactions,
  editingTransaction,
  setEditingTransaction,
  onSave,
}: EditTransactionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transactions</DialogTitle>
          <DialogDescription>
            {t('clickToEdit')}
          </DialogDescription>
        </DialogHeader>
          <div className="overflow-x-auto">
          <table className="w-full">
              <thead>
              <tr className="border-b border-default">
                <th className="text-left py-3 px-4 font-semibold text-secondary">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-secondary">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-secondary">Amount</th>
                <th className="text-right py-3 px-4 font-semibold text-secondary">Debit</th>
                <th className="text-right py-3 px-4 font-semibold text-secondary">Credit</th>
                </tr>
              </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={`border-b border-default cursor-pointer ${
                    editingTransaction?.id === transaction.id
                      ? 'bg-blue-50 table-row-hover'
                      : 'table-row-hover hover:bg-gray-50'
                  }`}
                  onClick={() => editingTransaction?.id !== transaction.id && setEditingTransaction({...transaction})}
                >
                  <td className="py-3 px-4 text-secondary">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="date"
                        value={editingTransaction.date}
                        onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      transaction.date
                    )}
                  </td>
                  <td className="py-3 px-4 text-primary">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="text"
                        value={editingTransaction.description}
                        onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      transaction.description
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingTransaction.amount}
                        onChange={(e) => {
                          const newAmount = parseFloat(e.target.value);
                          const updatedTransaction = {
                            ...editingTransaction,
                            amount: newAmount,
                            debit: editingTransaction.debit.replace(/\$[\d.]+/, `$${newAmount.toFixed(2)}`),
                            credit: editingTransaction.credit.replace(/\$[\d.]+/, `$${newAmount.toFixed(2)}`)
                          };
                          setEditingTransaction(updatedTransaction);
                        }}
                        className="w-full p-1 border rounded text-right"
                      />
                    ) : (
                      transaction.amount.toFixed(2)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="text"
                        value={editingTransaction.debit}
                        className="w-full p-1 border rounded text-right bg-gray-100"
                        readOnly
                      />
                    ) : (
                      transaction.debit
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="text"
                        value={editingTransaction.credit}
                        className="w-full p-1 border rounded text-right bg-gray-100"
                        readOnly
                      />
                    ) : (
                      transaction.credit
                    )}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingTransaction && (
            <div className="flex gap-2 justify-end p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingTransaction(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => onSave(editingTransaction)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {t('saveChanges')}
              </Button>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
};
