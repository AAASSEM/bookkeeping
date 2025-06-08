
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, FileText, Package, Calculator } from 'lucide-react';

interface FinancialStatementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: any[];
  transactions: any[];
  cash: number;
}

export const FinancialStatementsModal = ({ isOpen, onClose, inventory, transactions, cash }: FinancialStatementsModalProps) => {
  const [selectedProduct, setSelectedProduct] = useState(inventory[0]?.name || '');

  const calculateTrialBalance = () => {
    const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const totalRevenue = transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      cash,
      inventory: totalInventoryValue,
      revenue: totalRevenue,
      expenses: totalExpenses
    };
  };

  const trialBalance = calculateTrialBalance();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Financial Statements
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="trial-balance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trial-balance" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Trial Balance
            </TabsTrigger>
            <TabsTrigger value="inventory-ledger" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory Ledger
            </TabsTrigger>
            <TabsTrigger value="general-journal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              General Journal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trial-balance">
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="text-left py-3 px-4 font-bold text-slate-800">Account</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Debit</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Cash</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.cash.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Inventory</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.inventory.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Revenue</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.revenue.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Expenses</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.expenses.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      <tr className="border-t-2 border-slate-300 font-bold">
                        <td className="py-3 px-4 text-slate-800">Total</td>
                        <td className="py-3 px-4 text-right text-slate-800">
                          ${(trialBalance.cash + trialBalance.inventory + trialBalance.expenses).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-800">
                          ${trialBalance.revenue.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Profit Summary</h4>
                  <p className="text-green-700">
                    Revenue: ${trialBalance.revenue.toLocaleString()} - Expenses: ${trialBalance.expenses.toLocaleString()} = 
                    <span className="font-bold"> Profit: ${(trialBalance.revenue - trialBalance.expenses).toLocaleString()}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inventory-ledger">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Ledger</CardTitle>
                <div className="mt-4">
                  <select 
                    value={selectedProduct} 
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="border border-slate-300 rounded px-3 py-2"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="text-left py-3 px-4 font-bold text-slate-800">Date</th>
                        <th className="text-left py-3 px-4 font-bold text-slate-800">Description</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Qty In</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Qty Out</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Unit Cost</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Balance (Qty)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">1-Mar</td>
                        <td className="py-3 px-4 text-slate-700">Opening Balance</td>
                        <td className="py-3 px-4 text-right text-slate-700">10</td>
                        <td className="py-3 px-4 text-right text-slate-700">0</td>
                        <td className="py-3 px-4 text-right text-slate-700">$135</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">10</td>
                      </tr>
                      {transactions.filter(t => t.description.includes(selectedProduct)).map((transaction, index) => (
                        <tr key={index} className="border-b border-slate-200">
                          <td className="py-3 px-4 text-slate-700">{transaction.date}</td>
                          <td className="py-3 px-4 text-slate-700">{transaction.description}</td>
                          <td className="py-3 px-4 text-right text-slate-700">
                            {transaction.type === 'purchase' ? '5' : '0'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700">
                            {transaction.type === 'sale' ? '2' : '0'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700">$140</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800">
                            {transaction.type === 'purchase' ? '15' : '13'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general-journal">
            <Card>
              <CardHeader>
                <CardTitle>General Journal</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No transactions recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-300">
                          <th className="text-left py-3 px-4 font-bold text-slate-800">Date</th>
                          <th className="text-left py-3 px-4 font-bold text-slate-800">Description</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">Debit</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction, index) => (
                          <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="py-3 px-4 text-slate-700">{transaction.date}</td>
                            <td className="py-3 px-4 text-slate-700">{transaction.description}</td>
                            <td className="py-3 px-4 text-right text-slate-700">{transaction.debit}</td>
                            <td className="py-3 px-4 text-right text-slate-700">{transaction.credit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
