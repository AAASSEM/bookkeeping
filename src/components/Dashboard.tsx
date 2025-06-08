
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Package, DollarSign, FileText } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { FinancialStatementsModal } from './FinancialStatementsModal';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal';
  amount: number;
  debit: string;
  credit: string;
}

export const Dashboard = () => {
  const [cash, setCash] = useState(1000);
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Titan Oil Bottles',
      quantity: 10,
      unitCost: 135,
      totalValue: 1350
    }
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'purchase' | 'sale' | 'expense' | 'withdrawal'>('purchase');

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  const handleTransaction = (transactionData: any) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      ...transactionData
    };
    
    setTransactions([...transactions, newTransaction]);
    
    // Update cash and inventory based on transaction type
    if (transactionData.type === 'purchase') {
      setCash(prev => prev - transactionData.amount);
      // Update inventory logic here
    } else if (transactionData.type === 'sale') {
      setCash(prev => prev + transactionData.amount);
      // Update inventory logic here
    } else if (transactionData.type === 'expense' || transactionData.type === 'withdrawal') {
      setCash(prev => prev - transactionData.amount);
    }
    
    setShowTransactionModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Business Dashboard</h1>
          <p className="text-slate-600">Track your inventory, cash flow, and transactions</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${cash.toLocaleString()}</div>
              <p className="text-green-100 text-xs">Available cash</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
              <p className="text-blue-100 text-xs">Total stock value</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(cash + totalInventoryValue).toLocaleString()}</div>
              <p className="text-purple-100 text-xs">Cash + Inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => { setTransactionType('purchase'); setShowTransactionModal(true); }}
            className="h-16 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Plus className="mr-2 h-5 w-5" />
            Purchase
          </Button>
          <Button 
            onClick={() => { setTransactionType('sale'); setShowTransactionModal(true); }}
            className="h-16 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <DollarSign className="mr-2 h-5 w-5" />
            Sell
          </Button>
          <Button 
            onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}
            className="h-16 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
          >
            <FileText className="mr-2 h-5 w-5" />
            Expenses
          </Button>
          <Button 
            onClick={() => setShowFinancialModal(true)}
            className="h-16 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            F/S
          </Button>
        </div>

        {/* Current Inventory */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-slate-800">Current Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Product</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Quantity</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Unit Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-600">${item.unitCost}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">${item.totalValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No transactions yet. Add your first transaction above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Debit</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(-5).reverse().map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{transaction.date}</td>
                        <td className="py-3 px-4 text-slate-800">{transaction.description}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{transaction.debit}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{transaction.credit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSubmit={handleTransaction}
        type={transactionType}
        inventory={inventory}
      />

      <FinancialStatementsModal
        isOpen={showFinancialModal}
        onClose={() => setShowFinancialModal(false)}
        inventory={inventory}
        transactions={transactions}
        cash={cash}
      />
    </div>
  );
};
