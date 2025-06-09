import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Package, DollarSign, FileText, Trash2, Moon, Sun, Undo2, Download } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { FinancialStatementsModal } from './FinancialStatementsModal';
import { CreateProductModal } from './CreateProductModal';
import { PartnerSetupModal } from './PartnerSetupModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  type: 'bottles' | 'oil' | 'box' | 'other';
  milliliters?: number;
  grams?: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create';
  amount: number;
  debit: string;
  credit: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
}

interface Partner {
  name: string;
  capital: number;
}

export const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [cash, setCash] = useState(0.0);
  const [totalSales, setTotalSales] = useState(0.0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showPartnerSetup, setShowPartnerSetup] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<{transactions: Transaction[], cash: number, inventory: InventoryItem[], totalSales: number}[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'purchase' | 'sale' | 'expense' | 'withdrawal'>('purchase');

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  useEffect(() => {
    // Check if partners are set up on first use
    const hasPartners = localStorage.getItem('businessPartners');
    if (!hasPartners) {
      setShowPartnerSetup(true);
    } else {
      setPartners(JSON.parse(hasPartners));
    }
  }, []);

  const handlePartnerSetup = (partnerData: Partner[]) => {
    setPartners(partnerData);
    localStorage.setItem('businessPartners', JSON.stringify(partnerData));
    
    // Add initial capital transactions
    const capitalTransactions = partnerData.map(partner => ({
      id: `capital-${Date.now()}-${Math.random()}`,
      date: new Date().toLocaleDateString(),
      type: 'purchase' as const,
      description: `Initial capital from ${partner.name}`,
      amount: partner.capital,
      debit: `Cash $${partner.capital.toFixed(2)}`,
      credit: `${partner.name} Capital $${partner.capital.toFixed(2)}`
    }));
    
    setTransactions(capitalTransactions);
    setCash(partnerData.reduce((sum, p) => sum + p.capital, 0));
    setShowPartnerSetup(false); // Close the modal after setup
  };

  const saveCurrentState = () => {
    setTransactionHistory(prev => [...prev, {
      transactions: [...transactions],
      cash,
      inventory: [...inventory],
      totalSales
    }]);
  };

  const handleTransaction = (transactionData: any) => {
    saveCurrentState();
    
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      ...transactionData
    };
    
    setTransactions([...transactions, newTransaction]);
    
    // Update cash and inventory based on transaction type
    if (transactionData.type === 'purchase') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
      
      const existingItemIndex = inventory.findIndex(item => 
        item.name === transactionData.productName && item.type === transactionData.productType
      );
      
      if (existingItemIndex >= 0) {
        const updatedInventory = [...inventory];
        const existingItem = updatedInventory[existingItemIndex];
        
        if (transactionData.productType === 'oil') {
          // For oil, add to grams
          const newGrams = (existingItem.grams || 0) + parseFloat(transactionData.grams || '0');
          const newTotalValue = existingItem.totalValue + transactionData.amount;
          updatedInventory[existingItemIndex] = {
            ...existingItem,
            grams: newGrams,
            unitCost: newTotalValue / newGrams,
            totalValue: newTotalValue
          };
        } else {
          // For other products, add to quantity
          const newTotalQuantity = existingItem.quantity + parseFloat(transactionData.quantity || '0');
          const newTotalValue = existingItem.totalValue + transactionData.amount;
          updatedInventory[existingItemIndex] = {
            ...existingItem,
            quantity: newTotalQuantity,
            unitCost: newTotalValue / newTotalQuantity,
            totalValue: newTotalValue
          };
        }
        setInventory(updatedInventory);
      } else {
        const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: transactionData.productName,
          quantity: parseFloat(transactionData.quantity || '0'),
          unitCost: transactionData.amount / parseFloat(transactionData.quantity || transactionData.grams || '1'),
          totalValue: transactionData.amount,
          type: transactionData.productType,
          milliliters: transactionData.milliliters ? parseFloat(transactionData.milliliters) : undefined,
          grams: transactionData.grams ? parseFloat(transactionData.grams) : undefined
        };
        setInventory([...inventory, newItem]);
      }
    } else if (transactionData.type === 'sale') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
      setTotalSales(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
      
      // Calculate COGS and update inventory
      const itemIndex = inventory.findIndex(item => item.name === transactionData.productName);
      if (itemIndex >= 0) {
        const updatedInventory = [...inventory];
        const item = updatedInventory[itemIndex];
        const soldQuantity = parseFloat(transactionData.quantity || '0');
        const cogs = item.unitCost * soldQuantity;
        
        // Update transaction with COGS information
        newTransaction.unitCost = item.unitCost;
        
        updatedInventory[itemIndex].quantity -= soldQuantity;
        updatedInventory[itemIndex].totalValue = updatedInventory[itemIndex].quantity * updatedInventory[itemIndex].unitCost;
        setInventory(updatedInventory.filter(item => item.quantity > 0));
      }
    } else if (transactionData.type === 'expense' || transactionData.type === 'withdrawal') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
    }
    
    setShowTransactionModal(false);
  };

  const handleCreateProduct = (productData: any) => {
    saveCurrentState();
    
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      type: 'create',
      description: `Created ${productData.quantity} ${productData.name}`,
      amount: 0,
      debit: `Inventory ${productData.name}`,
      credit: `Raw Materials`
    };
    
    setTransactions([...transactions, newTransaction]);
    
    // Update inventory for created product
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: productData.name,
      quantity: parseFloat(productData.quantity),
      unitCost: 0,
      totalValue: 0,
      type: 'other'
    };
    setInventory([...inventory, newItem]);
    
    // Reduce raw materials from inventory
    const updatedInventory = [...inventory];
    if (productData.bottlesUsed > 0) {
      const bottleIndex = updatedInventory.findIndex(item => item.type === 'bottles');
      if (bottleIndex >= 0) {
        updatedInventory[bottleIndex].quantity -= parseFloat(productData.bottlesUsed);
        updatedInventory[bottleIndex].totalValue = updatedInventory[bottleIndex].quantity * updatedInventory[bottleIndex].unitCost;
      }
    }
    if (productData.oilUsed > 0) {
      const oilIndex = updatedInventory.findIndex(item => item.type === 'oil');
      if (oilIndex >= 0) {
        updatedInventory[oilIndex].grams = (updatedInventory[oilIndex].grams || 0) - parseFloat(productData.oilUsed);
      }
    }
    setInventory(updatedInventory.filter(item => item.quantity > 0 && (item.grams === undefined || item.grams > 0)));
    
    setShowCreateModal(false);
  };

  const handleUndo = () => {
    if (transactionHistory.length > 0) {
      const lastState = transactionHistory[transactionHistory.length - 1];
      setTransactions(lastState.transactions);
      setCash(lastState.cash);
      setInventory(lastState.inventory);
      setTotalSales(lastState.totalSales);
      setTransactionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleClearData = () => {
    setCash(0.0);
    setTotalSales(0.0);
    setInventory([]);
    setTransactions([]);
    setTransactionHistory([]);
    localStorage.removeItem('businessPartners');
    setPartners([]);
    setShowPartnerSetup(true);
  };

  const showPartnerSetupModal = () => {
    setShowPartnerSetup(true);
  };

  const exportToExcel = () => {
    // Create comprehensive CSV content with all financial statements
    let csvContent = "BUSINESS FINANCIAL STATEMENTS\n\n";
    
    // Trial Balance
    csvContent += "TRIAL BALANCE\n";
    csvContent += "Account,Debit,Credit\n";
    csvContent += `Cash,${cash.toFixed(2)},\n`;
    
    // Detailed inventory breakdown
    const inventoryByType = inventory.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);
    
    Object.entries(inventoryByType).forEach(([type, items]) => {
      csvContent += `${type.charAt(0).toUpperCase() + type.slice(1)},${items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)},\n`;
    });
    
    const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    csvContent += `Revenue,,${totalRevenue.toFixed(2)}\n`;
    csvContent += `Expenses,${totalExpenses.toFixed(2)},\n`;
    csvContent += "\n";
    
    // General Journal
    csvContent += "GENERAL JOURNAL\n";
    csvContent += "Date,Description,Type,Amount,Debit,Credit\n";
    transactions.forEach(transaction => {
      csvContent += `${transaction.date},"${transaction.description}",${transaction.type},${transaction.amount.toFixed(2)},"${transaction.debit}","${transaction.credit}"\n`;
    });
    csvContent += "\n";
    
    // Sales Ledger
    csvContent += "SALES LEDGER\n";
    csvContent += "Date,Product,Quantity,Unit Price,Total Amount\n";
    transactions.filter(t => t.type === 'sale').forEach(transaction => {
      const unitPrice = transaction.quantity ? transaction.amount / transaction.quantity : transaction.amount;
      csvContent += `${transaction.date},"${transaction.productName || 'Unknown'}",${transaction.quantity || 1},${unitPrice.toFixed(2)},${transaction.amount.toFixed(2)}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial_statements.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
              <Button
                onClick={handleUndo}
                disabled={transactionHistory.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              
              <Button
                onClick={exportToExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              
              <Button
                onClick={showPartnerSetupModal}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Partner
              </Button>
              
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white dark:from-green-600 dark:to-green-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${cash.toFixed(2)}</div>
                <p className="text-green-100 text-xs">Available cash</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white dark:from-blue-600 dark:to-blue-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
                <p className="text-blue-100 text-xs">Total stock value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white dark:from-orange-600 dark:to-orange-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
                <p className="text-orange-100 text-xs">Cumulative sales</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white dark:from-purple-600 dark:to-purple-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(cash + totalInventoryValue).toFixed(2)}</div>
                <p className="text-purple-100 text-xs">Cash + Inventory</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
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
              onClick={() => setShowCreateModal(true)}
              className="h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              <Package className="mr-2 h-5 w-5" />
              Create
            </Button>
            <Button 
              onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}
              className="h-16 bg-orange-600 hover:bg-orange-700 text-white font-semibold dark:bg-orange-700 dark:hover:bg-orange-800"
            >
              <FileText className="mr-2 h-5 w-5" />
              Expenses
            </Button>
            <Button 
              onClick={() => { setTransactionType('withdrawal'); setShowTransactionModal(true); }}
              className="h-16 bg-red-600 hover:bg-red-700 text-white font-semibold dark:bg-red-700 dark:hover:bg-red-800"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Withdraw
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
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                          {item.type === 'oil' ? `${item.grams}g` : item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">${item.unitCost.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-100">${item.totalValue.toFixed(2)}</td>
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
        <PartnerSetupModal
          isOpen={showPartnerSetup}
          onClose={() => setShowPartnerSetup(false)}
          onSubmit={handlePartnerSetup}
        />

        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          onSubmit={handleTransaction}
          type={transactionType}
          inventory={inventory}
          partners={partners}
        />

        <CreateProductModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProduct}
          inventory={inventory}
        />

        <FinancialStatementsModal
          isOpen={showFinancialModal}
          onClose={() => setShowFinancialModal(false)}
          inventory={inventory}
          transactions={transactions}
          cash={cash}
          partners={partners}
        />
      </div>
    </div>
  );
};
