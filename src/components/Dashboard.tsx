import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Package, DollarSign, FileText, Trash2, Moon, Sun, Undo2, Download, TrendingDown } from 'lucide-react';
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
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss';
  amount: number;
  debit: string;
  credit: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
  partnerName?: string;
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
  const [transactionHistory, setTransactionHistory] = useState<{transactions: Transaction[], cash: number, inventory: InventoryItem[], totalSales: number, partners: Partner[]}[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'purchase' | 'sale' | 'expense' | 'withdrawal' | 'gain' | 'loss'>('purchase');

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
      totalSales,
      partners: [...partners]
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
          // For oil, add to grams and recalculate unit cost
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
          quantity: parseFloat(transactionData.quantity || '1'),
          unitCost: transactionData.unitCost,
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
      
      // Update inventory
      const itemIndex = inventory.findIndex(item => item.name === transactionData.productName);
      if (itemIndex >= 0) {
        const updatedInventory = [...inventory];
        const item = updatedInventory[itemIndex];
        const soldQuantity = parseFloat(transactionData.quantity || '0');
        
        // Update transaction with COGS information
        newTransaction.unitCost = item.unitCost;
        
        if (item.type === 'oil') {
          updatedInventory[itemIndex].grams = (updatedInventory[itemIndex].grams || 0) - soldQuantity;
          updatedInventory[itemIndex].totalValue = (updatedInventory[itemIndex].grams || 0) * updatedInventory[itemIndex].unitCost;
        } else {
          updatedInventory[itemIndex].quantity -= soldQuantity;
          updatedInventory[itemIndex].totalValue = updatedInventory[itemIndex].quantity * updatedInventory[itemIndex].unitCost;
        }
        
        // Handle box deduction if item is boxed
        if (transactionData.isBoxed) {
          const boxIndex = updatedInventory.findIndex(item => item.type === 'box');
          if (boxIndex >= 0) {
            updatedInventory[boxIndex].quantity -= soldQuantity;
            updatedInventory[boxIndex].totalValue = updatedInventory[boxIndex].quantity * updatedInventory[boxIndex].unitCost;
          }
        }
        
        setInventory(updatedInventory.filter(item => 
          (item.quantity > 0 || (item.type === 'oil' && (item.grams || 0) > 0))
        ));
      }
    } else if (transactionData.type === 'expense' || transactionData.type === 'loss') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'gain') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'withdrawal') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
      
      // Update partner capital
      const updatedPartners = partners.map(partner => 
        partner.name === transactionData.partnerName 
          ? { ...partner, capital: parseFloat((partner.capital - transactionData.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
      localStorage.setItem('businessPartners', JSON.stringify(updatedPartners));
    }
    
    setShowTransactionModal(false);
  };

  const handleCreateProduct = (productData: any) => {
    saveCurrentState();
    
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      type: 'create',
      description: `Created ${productData.quantity} ${productData.name} (Cost: $${productData.totalCost.toFixed(2)})`,
      amount: productData.totalCost,
      debit: `Inventory ${productData.name} $${productData.totalCost.toFixed(2)}`,
      credit: `Raw Materials $${productData.totalCost.toFixed(2)}`
    };
    
    setTransactions([...transactions, newTransaction]);
    
    // Update inventory for created product with calculated cost
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: productData.name,
      quantity: parseFloat(productData.quantity),
      unitCost: productData.unitCost,
      totalValue: productData.totalCost,
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
        updatedInventory[oilIndex].totalValue = (updatedInventory[oilIndex].grams || 0) * updatedInventory[oilIndex].unitCost;
      }
    }
    setInventory(updatedInventory.filter(item => 
      (item.quantity > 0 || (item.type === 'oil' && (item.grams || 0) > 0))
    ));
    
    setShowCreateModal(false);
  };

  const handleUndo = () => {
    if (transactionHistory.length > 0) {
      const lastState = transactionHistory[transactionHistory.length - 1];
      setTransactions(lastState.transactions);
      setCash(lastState.cash);
      setInventory(lastState.inventory);
      setTotalSales(lastState.totalSales);
      setPartners(lastState.partners);
      localStorage.setItem('businessPartners', JSON.stringify(lastState.partners));
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Business Dashboard</h1>
              <p className="text-muted-foreground">Track your inventory, cash flow, and transactions</p>
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
                className="border-border"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-accent to-accent/80 text-black">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${cash.toFixed(2)}</div>
                <p className="text-black/70 text-xs">Available cash</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary to-primary/80 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
                <p className="text-white/70 text-xs">Total stock value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-accent/80 to-primary/60 text-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
                <p className="text-muted-foreground text-xs">Cumulative sales</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/80 to-accent/60 text-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(cash + totalInventoryValue).toFixed(2)}</div>
                <p className="text-muted-foreground text-xs">Cash + Inventory</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
            <Button 
              onClick={() => { setTransactionType('purchase'); setShowTransactionModal(true); }}
              className="h-16 bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Purchase
            </Button>
            <Button 
              onClick={() => { setTransactionType('sale'); setShowTransactionModal(true); }}
              className="h-16 bg-accent hover:bg-accent/90 text-black font-semibold"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Sell
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="h-16 bg-primary/80 hover:bg-primary/70 text-white font-semibold"
            >
              <Package className="mr-2 h-5 w-5" />
              Create
            </Button>
            <Button 
              onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}
              className="h-16 bg-accent/80 hover:bg-accent/70 text-black font-semibold"
            >
              <FileText className="mr-2 h-5 w-5" />
              Expenses
            </Button>
            <Button 
              onClick={() => { setTransactionType('withdrawal'); setShowTransactionModal(true); }}
              className="h-16 bg-destructive hover:bg-destructive/90 text-white font-semibold"
            >
              <TrendingDown className="mr-2 h-5 w-5" />
              Withdraw
            </Button>
            <Button 
              onClick={() => { setTransactionType('gain'); setShowTransactionModal(true); }}
              className="h-16 bg-accent/60 hover:bg-accent/50 text-black font-semibold"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Gain
            </Button>
            <Button 
              onClick={() => { setTransactionType('loss'); setShowTransactionModal(true); }}
              className="h-16 bg-primary/60 hover:bg-primary/50 text-white font-semibold"
            >
              <TrendingDown className="mr-2 h-5 w-5" />
              Loss
            </Button>
            <Button 
              onClick={() => setShowFinancialModal(true)}
              className="h-16 bg-gradient-to-r from-primary to-accent text-black font-semibold md:col-span-7"
            >
              <FileText className="mr-2 h-5 w-5" />
              Financial Statements
            </Button>
          </div>

          {/* Current Inventory */}
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Current Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Product</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Quantity</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Unit Cost</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-foreground">{item.name}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {item.type === 'oil' ? `${item.grams}g` : item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">${item.unitCost.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">${item.totalValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No transactions yet. Add your first transaction above!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Description</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Debit</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(-5).reverse().map((transaction) => (
                        <tr key={transaction.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 text-muted-foreground">{transaction.date}</td>
                          <td className="py-3 px-4 text-foreground">{transaction.description}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{transaction.debit}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{transaction.credit}</td>
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
