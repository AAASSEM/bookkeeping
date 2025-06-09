
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, FileText, Package, Calculator, TrendingUp, BookOpen } from 'lucide-react';

interface Partner {
  name: string;
  capital: number;
}

interface FinancialStatementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: any[];
  transactions: any[];
  cash: number;
  partners: Partner[];
}

export const FinancialStatementsModal = ({ isOpen, onClose, inventory, transactions, cash, partners }: FinancialStatementsModalProps) => {
  const [selectedProduct, setSelectedProduct] = useState(inventory[0]?.name || '');

  const calculateTrialBalance = () => {
    const inventoryByType = inventory.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const totalRevenue = transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCogs = transactions
      .filter(t => t.type === 'sale' && t.unitCost)
      .reduce((sum, t) => sum + (t.unitCost * t.quantity), 0);
    
    return {
      cash,
      inventoryByType,
      revenue: totalRevenue,
      expenses: totalExpenses,
      cogs: totalCogs,
      grossProfit: totalRevenue - totalCogs,
      netIncome: totalRevenue - totalCogs - totalExpenses
    };
  };

  const trialBalance = calculateTrialBalance();

  const handleClosing = () => {
    // Calculate net income
    const netIncome = trialBalance.netIncome;
    
    // Add to retained earnings (or partners' capital)
    if (netIncome !== 0) {
      // This would typically close revenue and expense accounts
      // and transfer net income to retained earnings
      alert(`Closing entries would transfer Net Income of $${netIncome.toFixed(2)} to Retained Earnings. Revenue and expense accounts would be reset to zero.`);
    }
  };

  const getSalesLedgerData = () => {
    return transactions
      .filter(t => t.type === 'sale')
      .map(t => ({
        ...t,
        unitPrice: t.quantity ? t.amount / t.quantity : t.amount,
        grossProfit: t.unitCost ? t.amount - (t.unitCost * t.quantity) : t.amount
      }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Financial Statements
            <div className="flex gap-2">
              <Button onClick={handleClosing} variant="outline" size="sm">
                Closing
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="trial-balance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trial-balance" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Trial Balance
            </TabsTrigger>
            <TabsTrigger value="inventory-ledger" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory Ledger
            </TabsTrigger>
            <TabsTrigger value="sales-ledger" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sales Ledger
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
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.cash.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <td className="py-3 px-4 text-slate-700 font-semibold">Inventory (Total)</td>
                        <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                          ${Object.values(trialBalance.inventoryByType).flat().reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      
                      {Object.entries(trialBalance.inventoryByType).map(([type, items]) => (
                        <tr key={type} className="border-b border-slate-100">
                          <td className="py-3 px-4 text-slate-600 pl-8">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            ${items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">-</td>
                        </tr>
                      ))}
                      
                      {inventory.filter(item => item.type === 'other').map(item => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-3 px-4 text-slate-600 pl-8">{item.name}</td>
                          <td className="py-3 px-4 text-right text-slate-600">${item.totalValue.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-slate-600">-</td>
                        </tr>
                      ))}
                      
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Revenue</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.revenue.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Cost of Goods Sold</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.cogs.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-slate-700">Expenses</td>
                        <td className="py-3 px-4 text-right text-slate-700">${trialBalance.expenses.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">-</td>
                      </tr>
                      
                      {partners.map(partner => (
                        <tr key={partner.name} className="border-b border-slate-200">
                          <td className="py-3 px-4 text-slate-700">{partner.name} Capital</td>
                          <td className="py-3 px-4 text-right text-slate-700">-</td>
                          <td className="py-3 px-4 text-right text-slate-700">${partner.capital.toFixed(2)}</td>
                        </tr>
                      ))}
                      
                      <tr className="border-t-2 border-slate-300 font-bold">
                        <td className="py-3 px-4 text-slate-800">Total</td>
                        <td className="py-3 px-4 text-right text-slate-800">
                          ${(trialBalance.cash + 
                            Object.values(trialBalance.inventoryByType).flat().reduce((sum, item) => sum + item.totalValue, 0) + 
                            trialBalance.cogs + 
                            trialBalance.expenses).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-800">
                          ${(trialBalance.revenue + partners.reduce((sum, p) => sum + p.capital, 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Gross Profit</h4>
                    <p className="text-blue-700 text-xl font-bold">${trialBalance.grossProfit.toFixed(2)}</p>
                    <p className="text-blue-600 text-sm">Revenue - COGS</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Net Income</h4>
                    <p className="text-green-700 text-xl font-bold">${trialBalance.netIncome.toFixed(2)}</p>
                    <p className="text-green-600 text-sm">Gross Profit - Expenses</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Total Capital</h4>
                    <p className="text-purple-700 text-xl font-bold">${partners.reduce((sum, p) => sum + p.capital, 0).toFixed(2)}</p>
                    <p className="text-purple-600 text-sm">Partner Investments</p>
                  </div>
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
                        <th className="text-right py-3 px-4 font-bold text-slate-800">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions
                        .filter(t => t.productName === selectedProduct || t.description.includes(selectedProduct))
                        .map((transaction, index) => {
                          const item = inventory.find(i => i.name === selectedProduct);
                          return (
                            <tr key={index} className="border-b border-slate-200">
                              <td className="py-3 px-4 text-slate-700">{transaction.date}</td>
                              <td className="py-3 px-4 text-slate-700">{transaction.description}</td>
                              <td className="py-3 px-4 text-right text-slate-700">
                                {transaction.type === 'purchase' ? transaction.quantity || 0 : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700">
                                {transaction.type === 'sale' ? transaction.quantity || 0 : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700">
                                ${transaction.unitCost ? transaction.unitCost.toFixed(2) : (item?.unitCost.toFixed(2) || '0.00')}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-slate-800">
                                {item ? (item.type === 'oil' ? `${item.grams}g` : item.quantity) : '0'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales-ledger">
            <Card>
              <CardHeader>
                <CardTitle>Sales Ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {getSalesLedgerData().length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No sales recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-300">
                          <th className="text-left py-3 px-4 font-bold text-slate-800">Date</th>
                          <th className="text-left py-3 px-4 font-bold text-slate-800">Product</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">Qty</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">Unit Price</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">Total Sale</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">COGS</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-800">Gross Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSalesLedgerData().map((sale, index) => (
                          <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="py-3 px-4 text-slate-700">{sale.date}</td>
                            <td className="py-3 px-4 text-slate-700">{sale.productName || 'Unknown'}</td>
                            <td className="py-3 px-4 text-right text-slate-700">{sale.quantity || 1}</td>
                            <td className="py-3 px-4 text-right text-slate-700">${sale.unitPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-slate-700">${sale.amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-slate-700">
                              ${sale.unitCost ? (sale.unitCost * sale.quantity).toFixed(2) : '0.00'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-green-700">
                              ${sale.grossProfit.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-green-600 text-sm">Total Sales</p>
                          <p className="text-green-700 text-xl font-bold">
                            ${getSalesLedgerData().reduce((sum, sale) => sum + sale.amount, 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-green-600 text-sm">Total COGS</p>
                          <p className="text-green-700 text-xl font-bold">
                            ${getSalesLedgerData().reduce((sum, sale) => sum + (sale.unitCost ? sale.unitCost * sale.quantity : 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-green-600 text-sm">Total Gross Profit</p>
                          <p className="text-green-700 text-xl font-bold">
                            ${getSalesLedgerData().reduce((sum, sale) => sum + sale.grossProfit, 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
