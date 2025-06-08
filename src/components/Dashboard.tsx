import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Package, DollarSign, FileText, Trash2, Moon, Sun } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { FinancialStatementsModal } from './FinancialStatementsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const [darkMode, setDarkMode] = useState(false);
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

  const handleClearData = () => {
    setCash(1000);
    setInventory([
      {
        id: '1',
        name: 'Titan Oil Bottles',
        quantity: 10,
        unitCost: 135,
        totalValue: 1350
      }
    ]);
    setTransactions([]);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Business Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-300">Track your inventory, cash flow, and transactions</p>
            </div>
            <div className="flex gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete all transactions and reset your data to the initial state. 
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData}>
                      Clear Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                className="border-slate-300 dark:border-slate-600"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white dark:from-green-600 dark:to-green-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${cash.toLocaleString()}</div>
                <p className="text-green-100 text-xs">Available cash</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white dark:from-blue-600 dark:to-blue-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
                <p className="text-blue-100 text-xs">Total stock value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white dark:from-purple-600 dark:to-purple-700">
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
              className="h-16 bg-blue-600 hover:bg-blue-700 text-white font-semibold dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <Plus className="mr-2 h-5 w-5" />
              Purchase
            </Button>
            <Button 
              onClick={() => { setTransactionType('sale'); setShowTransactionModal(true); }}
              className="h-16 bg-green-600 hover:bg-green-700 text-white font-semibold dark:bg-green-700 dark:hover:bg-green-800"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Sell
            </Button>
            <Button 
              onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}
              className="h-16 bg-orange-600 hover:bg-orange-700 text-white font-semibold dark:bg-orange-700 dark:hover:bg-orange-800"
            >
              <FileText className="mr-2 h-5 w-5" />
              Expenses
            </Button>
            <Button 
              onClick={() => setShowFinancialModal(true)}
              className="h-16 bg-purple-600 hover:bg-purple-700 text-white font-semibold dark:bg-purple-700 dark:hover:bg-purple-800"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              F/S
            </Button>
          </div>

          {/* Current Inventory */}
          <Card className="mb-8 bg-card dark:bg-slate-800 border-border dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Current Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Product</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Quantity</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Unit Cost</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-100">{item.name}</td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">${item.unitCost}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-100">${item.totalValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-card dark:bg-slate-800 border-border dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No transactions yet. Add your first transaction above!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Description</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Debit</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(-5).reverse().map((transaction) => (
                        <tr key={transaction.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{transaction.date}</td>
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-100">{transaction.description}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{transaction.debit}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{transaction.credit}</td>
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
    </div>
  );
};
