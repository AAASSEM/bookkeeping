import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  AlertCircle, 
  Check, 
  X, 
  Pencil, 
  Trash2, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  Package,
  DollarSign,
  FileText,
  Moon,
  Sun,
  Undo2,
  TrendingDown
} from 'lucide-react';
import { ManualTransactionModal } from './ManualTransactionModal';
import { TransactionModal } from './TransactionModal';
import { FinancialStatementsModal } from './FinancialStatementsModal';
import * as XLSX from 'xlsx';
import './dashboardTheme.css';
import { CreateProductModal } from './CreateProductModal';
import { PartnerSetupModal } from './PartnerSetupModal';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  type: 'bottles' | 'oil' | 'box' | 'other' | 'created';
  milliliters?: number;
  grams?: number;
  sellingPrice?: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss' | 'closing' | 'manual' | 'investing';
  description: string;
  amount: number;
  debit: string;
  credit: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
  partnerName?: string;
  paymentMethod?: 'cash' | 'credit' | 'other';
}

interface Partner {
  name: string;
  capital: number;
}

// Helper functions to generate data for Excel sheets
const generateIncomeStatementData = (transactions: Transaction[]) => {
  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
  const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
  const totalCOGS = transactions
    .filter(t => t.type === 'sale' && t.unitCost)
    .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalprofitability = grossProfit + totalGains;
  const netIncome = totalprofitability - totalExpenses - totalLosses;

  return [
    ['Revenue'],
    ['Sales Revenue', `$${totalRevenue.toFixed(2)}`],
    [''],
    ['Cost of Goods Sold'],
    ['COGS', `$${totalCOGS.toFixed(2)}`],
    ['Gross Profit', `$${grossProfit.toFixed(2)}`],
    ['Gains', `$${totalGains.toFixed(2)}`],
    ['Total Profitability', `$${totalprofitability.toFixed(2)}`],
    [''],
    ['Operating Expenses'],
    ['Expenses', `$${totalExpenses.toFixed(2)}`],
    ['Losses', `$${totalLosses.toFixed(2)}`],
    [''],
    ['Net Income', `$${netIncome.toFixed(2)}`]
  ];
};

const generateBalanceSheetData = (inventory: InventoryItem[], cash: number, partners: Partner[], netIncome: number) => {
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);

  return [
    ['Assets', ''],
    ['Cash', `$${cash.toFixed(2)}`],
    ['Inventory', `$${totalInventoryValue.toFixed(2)}`],
    ['Total Assets', `$${(cash + totalInventoryValue).toFixed(2)}`],
    [''],
    ['Liabilities & Equity', ''],
    ['Retained Earnings', `$${netIncome.toFixed(2)}`],
    ...partners.map(partner => [`${partner.name} Capital`, `$${partner.capital.toFixed(2)}`]),
    ['Total Liabilities & Equity', `$${(netIncome + totalCapital).toFixed(2)}`]
  ];
};

const generateGeneralJournalData = (transactions: Transaction[]) => {
  return [
    ['Date', 'Description', 'Type', 'Amount', 'Debit', 'Credit'],
    ...transactions.map(t => [
      t.date,
      t.description,
      t.type,
      `$${t.amount.toFixed(2)}`,
      t.debit,
      t.credit
    ])
  ];
};

const generateInventoryLedgerData = (inventory: InventoryItem[]) => {
  return [
    ['Product', 'Type', 'Quantity', 'Unit Cost', 'Total Value'],
    ...inventory.map(item => [
      item.name,
      item.type,
      item.type === 'oil' ? `${item.grams}g` : item.quantity,
      `$${item.unitCost.toFixed(2)}`,
      `$${item.totalValue.toFixed(2)}`
    ])
  ];
};

const generateSalesLedgerData = (transactions: Transaction[]) => {
  const sales = transactions.filter(t => t.type === 'sale');
  return [
    ['Date', 'Product', 'Quantity', 'Unit Price', 'Total Amount'],
    ...sales.map(transaction => {
      const unitPrice = transaction.quantity ? transaction.amount / transaction.quantity : transaction.amount;
      return [
        transaction.date,
        transaction.productName || 'Unknown',
        transaction.quantity || 1,
        `$${unitPrice.toFixed(2)}`,
        `$${transaction.amount.toFixed(2)}`
      ];
    })
  ];
};

const generateCashFlowStatementData = (transactions: Transaction[], currentCash: number, partners: Partner[]) => {
  // OPERATING ACTIVITIES
  const cashFromSales = transactions
    .filter(t => t.type === 'sale' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashFromGains = transactions
    .filter(t => t.type === 'gain' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashPaidForPurchases = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashPaidForExpenses = transactions
    .filter(t => t.type === 'expense' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  
  const cashPaidForLosses = transactions
    .filter(t => t.type === 'loss' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netCashFromOperatingActivities = cashFromSales + cashFromGains - cashPaidForPurchases - cashPaidForExpenses - cashPaidForLosses;

  // INVESTING ACTIVITIES
  const netCashFromInvestingActivities = 0;

  // FINANCING ACTIVITIES
  const cashFromCapitalContributions = transactions
    .filter(t => t.type === 'manual' && t.debit === 'Cash' && t.credit.includes('Capital'))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashPaidForWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netCashFromFinancingActivities = cashFromCapitalContributions - cashPaidForWithdrawals;

  // NET CHANGE IN CASH
  const netChangeInCash = netCashFromOperatingActivities + netCashFromInvestingActivities + netCashFromFinancingActivities;

  // Beginning Cash Balance
  const beginningCashBalance = currentCash - netChangeInCash;

  return [
    ['Cash Flow Statement'],
    [''],
    ['Cash Flow from Operating Activities'],
    ['Cash from Sales', `$${(Number(cashFromSales) || 0).toFixed(2)}`],
    ['Cash from Gains', `$${(Number(cashFromGains) || 0).toFixed(2)}`],
    ['Cash Paid for Purchases', `$${(Number(cashPaidForPurchases) || 0).toFixed(2)}`],
    ['Cash Paid for Expenses', `$${(Number(cashPaidForExpenses) || 0).toFixed(2)}`],
    ['Cash Paid for Losses', `$${(Number(cashPaidForLosses) || 0).toFixed(2)}`],
    ['Net Cash Flow from Operating Activities', `$${(Number(netCashFromOperatingActivities) || 0).toFixed(2)}`],
    [''],
    ['Cash Flow from Investing Activities'],
    ['No investing activities for this period', `$${(Number(netCashFromInvestingActivities) || 0).toFixed(2)}`],
    [''],
    ['Cash Flow from Financing Activities'],
    ['Capital Contributions', `$${(Number(cashFromCapitalContributions) || 0).toFixed(2)}`],
    ['Cash Paid for Withdrawals', `$${(Number(cashPaidForWithdrawals) || 0).toFixed(2)}`],
    ['Net Cash Flow from Financing Activities', `$${(Number(netCashFromFinancingActivities) || 0).toFixed(2)}`],
    [''],
    ['Beginning Cash Balance', `$${(Number(beginningCashBalance) || 0).toFixed(2)}`],
    ['Net Change in Cash', `$${(Number(netChangeInCash) || 0).toFixed(2)}`],
    ['Ending Cash Balance', `$${(Number(currentCash) || 0).toFixed(2)}`]
  ];
};

const generateTrialBalanceData = (transactions: Transaction[], inventory: InventoryItem[], cash: number, partners: Partner[], netIncome: number) => {
  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
  const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
  const totalCOGS = transactions
    .filter(t => t.type === 'sale' && t.unitCost)
    .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  // Group inventory by type
  const inventoryByType = inventory.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const data = [
    ['Account', 'Debit', 'Credit'],
    ['Cash', cash.toFixed(2), '-'],
    ['Inventory (Total)', totalInventoryValue.toFixed(2), '-']
  ];

  // Add inventory breakdown
  Object.entries(inventoryByType).forEach(([type, items]) => {
    const typeTotal = items.reduce((sum, item) => sum + item.totalValue, 0);
    data.push([type.charAt(0).toUpperCase() + type.slice(1), typeTotal.toFixed(2), '-']);
    items.forEach(item => {
      data.push([item.name, item.totalValue.toFixed(2), '-']);
    });
  });

  // Add other accounts
  data.push(
    ['Gross Profit', '-', grossProfit.toFixed(2)],
    ['Expenses', totalExpenses.toFixed(2), '-'],
    ['Losses', totalLosses.toFixed(2), '-'],
    ['Gains', '-', totalGains.toFixed(2)]
  );

  // Add partner capitals
  partners.forEach(partner => {
    data.push([`${partner.name} Capital`, '-', partner.capital.toFixed(2)]);
  });

  // Add totals
  const totalDebits = cash + totalInventoryValue + totalExpenses + totalLosses;
  const totalCredits = grossProfit + totalCapital + totalGains;
  data.push(['Total', totalDebits.toFixed(2), totalCredits.toFixed(2)]);

  return data;
};

export const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [cash, setCash] = useState(() => {
    const savedCash = localStorage.getItem('businessCash');
    return savedCash ? parseFloat(savedCash) : 0.0;
  });
  const [cashFlow, setCashFlow] = useState(() => {
    const savedCashFlow = localStorage.getItem('businessCashFlow');
    return savedCashFlow ? JSON.parse(savedCashFlow) : {
      operatingActivities: { sales: 0, purchases: 0, expenses: 0 },
      investingActivities: { equipment: 0, investments: 0 },
      financingActivities: { capital: 0, withdrawals: 0 }
    };
  });
  const [totalSales, setTotalSales] = useState(() => {
    const savedSales = localStorage.getItem('businessTotalSales');
    return savedSales ? parseFloat(savedSales) : 0.0;
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const savedInventory = localStorage.getItem('businessInventory');
    return savedInventory ? JSON.parse(savedInventory) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedTransactions = localStorage.getItem('businessTransactions');
    return savedTransactions ? JSON.parse(savedTransactions) : [];
  });
  const [partners, setPartners] = useState<Partner[]>(() => {
    const savedPartners = localStorage.getItem('businessPartners');
    return savedPartners ? JSON.parse(savedPartners) : [];
  });
  const [showPartnerSetup, setShowPartnerSetup] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<{transactions: Transaction[], cash: number, inventory: InventoryItem[], totalSales: number, partners: Partner[]}[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'purchase' | 'sale' | 'expense' | 'withdrawal' | 'gain' | 'loss'>('purchase');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditTransactionsModal, setShowEditTransactionsModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  useEffect(() => {
    localStorage.setItem('businessCash', cash.toString());
  }, [cash]);

  useEffect(() => {
    localStorage.setItem('businessTotalSales', totalSales.toString());
  }, [totalSales]);

  useEffect(() => {
    localStorage.setItem('businessInventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('businessTransactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('businessPartners', JSON.stringify(partners));
  }, [partners]);

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
    // Merge new partners with existing ones, avoiding duplicates by name
    const existingNames = new Set(partners.map(p => p.name));
    const newPartners = partnerData.filter(p => !existingNames.has(p.name));
    const updatedPartners = [...partners, ...newPartners];
    setPartners(updatedPartners);
    localStorage.setItem('businessPartners', JSON.stringify(updatedPartners));
    
    // Add initial capital transactions only for new partners
    const capitalTransactions = newPartners.map(partner => ({
      id: `capital-${Date.now()}-${Math.random()}`,
      date: new Date().toLocaleDateString(),
      type: 'investing' as const,
      description: `Initial capital from ${partner.name}`,
      amount: partner.capital,
      debit: `Cash $${partner.capital.toFixed(2)}`,
      credit: `${partner.name} Capital $${partner.capital.toFixed(2)}`,
      paymentMethod: 'cash' as const
    }));
    setTransactions(prev => [...prev, ...capitalTransactions]);
    setCash(prev => prev + newPartners.reduce((sum, p) => sum + p.capital, 0));
    setShowPartnerSetup(false); // Close the modal after setup
  };

  const saveCurrentState = () => {
    // Create deep copies of all state values
    const stateToSave = {
      transactions: transactions.map(t => ({...t})),
      cash: cash,
      inventory: inventory.map(item => ({...item})),
      totalSales: totalSales,
      partners: partners.map(p => ({...p}))
    };
    setTransactionHistory(prev => [...prev, stateToSave]);
  };

  const handleTransaction = useCallback((transactionData: any) => {
    try {
      console.log('Transaction data received from modal:', transactionData);
      
      // Save current state for undo
      saveCurrentState();

      // Handle sale transactions
      if (Array.isArray(transactionData) && transactionData[0]?.type === 'sale') {
        // Process each sale transaction
        transactionData.forEach(saleTx => {
          // Create only the sale transaction
          const saleTransaction: Transaction = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().split('T')[0],
            description: saleTx.description,
            type: 'sale',
            amount: saleTx.amount,
            debit: saleTx.debit,
            credit: saleTx.credit,
            productName: saleTx.productName,
            quantity: saleTx.quantity,
            unitCost: saleTx.unitCost,
            paymentMethod: saleTx.paymentMethod
          };

          console.log('New sale transaction:', saleTransaction);

          // Update cash and total sales
          setCash(prev => parseFloat((prev + saleTx.amount).toFixed(2)));
          setTotalSales(prev => parseFloat((prev + saleTx.amount).toFixed(2)));

          // Update inventory
          setInventory(prev => {
            const updatedInventory = prev.map(item => {
              if (item.name === saleTx.productName) {
                const newQuantity = item.quantity - saleTx.quantity;
                return {
                  ...item,
                  quantity: newQuantity,
                  totalValue: newQuantity * item.unitCost
                };
              }
              return item;
            });

            // If the sale includes boxes, update box inventory
            if (saleTx.isBoxed) {
              return updatedInventory.map(item => {
                if (item.type === 'box') {
                  const newQuantity = item.quantity - saleTx.quantity;
                  return {
                    ...item,
                    quantity: newQuantity,
                    totalValue: newQuantity * item.unitCost
                  };
                }
                return item;
              });
            }

            return updatedInventory;
          });

          // Add only the sale transaction to the journal
          setTransactions(prev => {
            const updatedTransactions = [...prev, saleTransaction];
            localStorage.setItem('businessTransactions', JSON.stringify(updatedTransactions));
            return updatedTransactions;
          });
        });

        setShowTransactionModal(false);
        return;
      }

      // Handle other transaction types...
      console.log('Transaction data received:', transactionData);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        description: transactionData.description,
        type: transactionData.type,
        amount: transactionData.amount,
        debit: transactionData.debit,
        credit: transactionData.credit,
        productName: transactionData.productName,
        quantity: transactionData.quantity,
        unitCost: transactionData.unitCost,
        partnerName: transactionData.partnerName,
        paymentMethod: transactionData.paymentMethod || 'cash' // Default to 'cash' if not specified
      };
      console.log('New transaction created in Dashboard:', newTransaction);

      // Update cash based on transaction type
    if (transactionData.type === 'purchase') {
        // Update cash
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));

        // Update inventory for purchase transactions
        if (transactionData.productName && transactionData.quantity && transactionData.unitCost) {
          setInventory(prev => {
            const existingItem = prev.find(item => item.name === transactionData.productName);
            
            if (existingItem) {
              // Update existing item
              return prev.map(item => {
                if (item.name === transactionData.productName) {
                  if (item.type === 'oil') {
                    // For oil, update grams and calculate total value
                    const newGrams = (item.grams || 0) + transactionData.quantity;
                    const totalValue = newGrams * transactionData.unitCost;
                    return {
                      ...item,
            grams: newGrams,
                      unitCost: transactionData.unitCost,
                      totalValue: totalValue
          };
        } else {
                    // For other items, update quantity
                    const newQuantity = item.quantity + transactionData.quantity;
                    const totalValue = newQuantity * transactionData.unitCost;
                    return {
                      ...item,
                      quantity: newQuantity,
                      unitCost: transactionData.unitCost,
                      totalValue: totalValue
                    };
                  }
                }
                return item;
              });
      } else {
              // Determine item type based on name
              const isOil = transactionData.productName.toLowerCase().includes('oil') || 
                           transactionData.productName.toLowerCase().includes('coco');
              const isBottle = transactionData.productName.toLowerCase().includes('ml');
              
              const itemType = isOil ? 'oil' : (isBottle ? 'bottles' : 'other');
              const totalValue = transactionData.quantity * transactionData.unitCost;

              // Add new item
        const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: transactionData.productName,
                quantity: isOil ? 0 : transactionData.quantity,
          unitCost: transactionData.unitCost,
                totalValue: totalValue,
                type: itemType,
                grams: isOil ? transactionData.quantity : undefined,
                milliliters: isBottle ? parseInt(transactionData.productName) : undefined
              };
              return [...prev, newItem];
            }
          });
      }
    } else if (transactionData.type === 'expense' || transactionData.type === 'loss') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'gain') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'withdrawal') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
      const updatedPartners = partners.map(partner => 
        partner.name === transactionData.partnerName 
          ? { ...partner, capital: parseFloat((partner.capital - transactionData.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
      localStorage.setItem('businessPartners', JSON.stringify(updatedPartners));
    }

      // Add transaction to journal
      setTransactions(prev => {
        const updatedTransactions = [...prev, newTransaction];
        localStorage.setItem('businessTransactions', JSON.stringify(updatedTransactions));
        return updatedTransactions;
      });
    setShowTransactionModal(false);
    } catch (error) {
      console.error('Transaction error:', error);
      alert(error.message);
      if (transactionHistory.length > 0) {
        const lastState = transactionHistory[transactionHistory.length - 1];
        setTransactions(lastState.transactions);
        setCash(lastState.cash);
        setInventory(lastState.inventory);
        setTotalSales(lastState.totalSales);
        setPartners(lastState.partners);
      }
    }
  }, [transactions, cash, totalSales, partners, inventory, transactionHistory]);

  const handleCreateProduct = (productData: any) => {
    try {
    saveCurrentState();
    
      // Validate raw materials first
      const updatedInventory = [...inventory];
      let hasError = false;
      let errorMessage = '';
      
      // Check bottles availability
      if (productData.bottlesUsed > 0) {
        const bottleIndex = updatedInventory.findIndex(item => 
          item.type === 'bottles' && item.name === productData.bottleType
        );
        if (bottleIndex >= 0) {
          if (updatedInventory[bottleIndex].quantity < productData.bottlesUsed) {
            hasError = true;
            errorMessage = `Not enough ${productData.bottleType} bottles available`;
          }
        } else {
          hasError = true;
          errorMessage = `No ${productData.bottleType} bottles found in inventory`;
        }
      }
      
      // Check oil availability
      if (productData.oilUsed > 0) {
        const oilIndex = updatedInventory.findIndex(item => 
          item.type === 'oil' && item.name === productData.oilType
        );
        if (oilIndex >= 0) {
          if ((updatedInventory[oilIndex].grams || 0) < productData.oilUsed) {
            hasError = true;
            errorMessage = `Not enough ${productData.oilType} oil available`;
          }
        } else {
          hasError = true;
          errorMessage = `No ${productData.oilType} oil found in inventory`;
        }
      }

      if (hasError) {
        throw new Error(errorMessage);
      }

      // Create transaction record
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      type: 'create',
        description: `Created ${productData.quantity} ${productData.name} using ${productData.bottlesUsed} ${productData.bottleType} bottles and ${productData.oilUsed}g of ${productData.oilType} (Cost: $${productData.totalCost.toFixed(2)})`,
      amount: productData.totalCost,
      debit: `Inventory ${productData.name} $${productData.totalCost.toFixed(2)}`,
      credit: `Raw Materials $${productData.totalCost.toFixed(2)}`
    };
    
      setTransactions(prev => [...prev, newTransaction]);
    
      // Create new product inventory item
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: productData.name,
      quantity: parseFloat(productData.quantity),
      unitCost: productData.unitCost,
      totalValue: productData.totalCost,
        type: 'created',
        sellingPrice: productData.sellingPrice
    };
    
      // Update raw materials inventory
      if (productData.bottlesUsed > 0) {
        const bottleIndex = updatedInventory.findIndex(item => 
          item.type === 'bottles' && item.name === productData.bottleType
        );
      if (bottleIndex >= 0) {
        updatedInventory[bottleIndex].quantity -= parseFloat(productData.bottlesUsed);
        updatedInventory[bottleIndex].totalValue = updatedInventory[bottleIndex].quantity * updatedInventory[bottleIndex].unitCost;
      }
      }

      if (productData.oilUsed > 0) {
        const oilIndex = updatedInventory.findIndex(item => 
          item.type === 'oil' && item.name === productData.oilType
        );
      if (oilIndex >= 0) {
        updatedInventory[oilIndex].grams = (updatedInventory[oilIndex].grams || 0) - parseFloat(productData.oilUsed);
        updatedInventory[oilIndex].totalValue = (updatedInventory[oilIndex].grams || 0) * updatedInventory[oilIndex].unitCost;
      }
    }
    
      // Add the new created product to inventory
      setInventory([...updatedInventory, newItem]);
    setShowCreateModal(false);
    } catch (error) {
      alert(error.message);
      // Revert state if needed
      if (transactionHistory.length > 0) {
        const lastState = transactionHistory[transactionHistory.length - 1];
        setTransactions(lastState.transactions);
        setCash(lastState.cash);
        setInventory(lastState.inventory);
        setTotalSales(lastState.totalSales);
        setPartners(lastState.partners);
      }
    }
  };

  const handleUndo = () => {
    if (transactionHistory.length > 0) {
      const lastState = transactionHistory[transactionHistory.length - 1];
      // Restore all state values with deep copies
      setTransactions(lastState.transactions.map(t => ({...t})));
      setCash(lastState.cash);
      setInventory(lastState.inventory.map(item => ({...item})));
      setTotalSales(lastState.totalSales);
      setPartners(lastState.partners.map(p => ({...p})));
      localStorage.setItem('businessPartners', JSON.stringify(lastState.partners));
      setTransactionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleManualTransaction = (manualData: { description: string, debit: string, credit: string, amount: number, isClosingEntry: boolean }) => {
    try {
      // Save current state for undo functionality
      setTransactionHistory(prev => [...prev, {
        transactions,
        cash,
        inventory,
        totalSales,
        partners
      }]);

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        type: 'closing',
        description: manualData.description,
        amount: manualData.amount,
        debit: manualData.debit,
        credit: manualData.credit
      };

      // Update cash based on the transaction
      if (manualData.debit.includes('Cash')) {
        setCash(prev => parseFloat((prev - manualData.amount).toFixed(2)));
      } else if (manualData.credit.includes('Cash')) {
        setCash(prev => parseFloat((prev + manualData.amount).toFixed(2)));
      }

      // Update inventory if the transaction involves inventory
      if (manualData.debit.includes('Inventory')) {
        const productName = manualData.debit.split('$')[0].replace('Inventory ', '').trim();
        const existingItemIndex = inventory.findIndex(item => item.name === productName);
        
        if (existingItemIndex >= 0) {
          const updatedInventory = [...inventory];
          const item = updatedInventory[existingItemIndex];
          const amount = manualData.amount;
          
          if (item.type === 'oil') {
            const gramsToAdd = amount / item.unitCost;
            item.grams = (item.grams || 0) + gramsToAdd;
            item.totalValue = item.grams * item.unitCost;
        } else {
            const quantityToAdd = amount / item.unitCost;
            item.quantity += quantityToAdd;
          item.totalValue = item.quantity * item.unitCost;
        }
          
          setInventory(updatedInventory);
        }
      } else if (manualData.credit.includes('Inventory')) {
        const productName = manualData.credit.split('$')[0].replace('Inventory ', '').trim();
        const existingItemIndex = inventory.findIndex(item => item.name === productName);
        
        if (existingItemIndex >= 0) {
          const updatedInventory = [...inventory];
          const item = updatedInventory[existingItemIndex];
          const amount = manualData.amount;
          
          if (item.type === 'oil') {
            const gramsToRemove = amount / item.unitCost;
            if ((item.grams || 0) < gramsToRemove) {
              throw new Error('Not enough inventory available');
            }
            item.grams = (item.grams || 0) - gramsToRemove;
            item.totalValue = item.grams * item.unitCost;
          } else {
            const quantityToRemove = amount / item.unitCost;
            if (item.quantity < quantityToRemove) {
              throw new Error('Not enough inventory available');
            }
            item.quantity -= quantityToRemove;
            item.totalValue = item.quantity * item.unitCost;
          }
          
          setInventory(updatedInventory);
        }
      }

      setTransactions(prev => [...prev, newTransaction]);
      setShowManualModal(false);
    } catch (error) {
      alert(error.message);
      if (transactionHistory.length > 0) {
        const lastState = transactionHistory[transactionHistory.length - 1];
        setTransactions(lastState.transactions);
        setCash(lastState.cash);
        setInventory(lastState.inventory);
        setTotalSales(lastState.totalSales);
        setPartners(lastState.partners);
      }
    }
  };

  const handleExportData = useCallback(() => {
    try {
      // Calculate net income
      const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
      const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
      const totalCOGS = transactions
        .filter(t => t.type === 'sale' && t.unitCost)
        .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = grossProfit - totalExpenses - totalLosses;

      const wb = XLSX.utils.book_new();

      // Income Statement
      const incomeStatementData = generateIncomeStatementData(transactions);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incomeStatementData), "Income Statement");

      // Balance Sheet
      const balanceSheetData = generateBalanceSheetData(inventory, cash, partners, netIncome);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(balanceSheetData), "Balance Sheet");

      // General Journal
      const generalJournalData = generateGeneralJournalData(transactions);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(generalJournalData), "General Journal");

      // Inventory Ledger
      const inventoryLedgerData = generateInventoryLedgerData(inventory);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inventoryLedgerData), "Inventory Ledger");

      // Sales Ledger
      const salesLedgerData = generateSalesLedgerData(transactions);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesLedgerData), "Sales Ledger");

      // Cash Flow Statement
      const cashFlowStatementData = generateCashFlowStatementData(transactions, cash, partners);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cashFlowStatementData), "Cash Flow Statement");

      // Trial Balance
      const trialBalanceData = generateTrialBalanceData(transactions, inventory, cash, partners, netIncome);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trialBalanceData), "Trial Balance");

      // Write the workbook to a file
      XLSX.writeFile(wb, `Financial_Statements_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  }, [transactions, inventory, cash, partners]);

  const resetAfterClosingEntry = () => {
    try {
      // 1. Calculate all the amounts needed for closing
      const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
      const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
      const totalCOGS = transactions
        .filter(t => t.type === 'sale' && t.unitCost)
        .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
      
      const netIncome = totalRevenue - totalCOGS - totalLosses + (totalGains);

      // 2. Create closing entries
      const closingEntries = [];

      // Close Gross Margin to Partner Capitals
      if (netIncome !== 0) {
        const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);
        partners.forEach(partner => {
          const partnerShare = (partner.capital / totalCapital) * netIncome;
          if (partnerShare !== 0) {
            closingEntries.push({
              id: crypto.randomUUID(),
      date: new Date().toLocaleDateString(), 
              description: `Closing Entry - Income Summary to ${partner.name} Capital`,
              type: 'closing',
              amount: Math.abs(partnerShare),
              debit: netIncome > 0 ? `Income Summary $${Math.abs(partnerShare).toFixed(2)}` : `${partner.name} Capital $${Math.abs(partnerShare).toFixed(2)}`,
              credit: netIncome > 0 ? `${partner.name} Capital $${Math.abs(partnerShare).toFixed(2)}` : `Income Summary $${Math.abs(partnerShare).toFixed(2)}`
            });

            // Update partner's capital
            const updatedPartners = partners.map(p => 
              p.name === partner.name 
                ? { ...p, capital: p.capital + partnerShare }
                : p
            );
            setPartners(updatedPartners);
            localStorage.setItem('businessPartners', JSON.stringify(updatedPartners));
          }
        });
      }

      // 3. Add closing entries to transactions for export
      const transactionsWithClosing = [...transactions, ...closingEntries];
      setTransactions(transactionsWithClosing);

      // 4. Clear all transactions after export
      setTransactions([]);
      
      // 5. Update local storage
      localStorage.setItem('businessTransactions', JSON.stringify([]));
      
      // 6. Reset temporary accounts
      setTotalSales(0);
      localStorage.setItem('businessTotalSales', '0');

      // 7. Reset cash flow values for new period
      const currentCashFlow = JSON.parse(localStorage.getItem('businessCashFlow') || '{}');
      const updatedCashFlow = {
        ...currentCashFlow,
        operatingActivities: {
          ...currentCashFlow.operatingActivities,
          purchases: 0,  // Reset purchases to 0
          sales: 0,      // Reset sales to 0
          expenses: 0    // Reset expenses to 0
        }
      };
      setCashFlow(updatedCashFlow);
      localStorage.setItem('businessCashFlow', JSON.stringify(updatedCashFlow));

    } catch (error) {
      console.error('Error resetting after closing:', error);
      alert('Error resetting system. Please try again.');
    }
  };

  const showPartnerSetupModal = () => {
    setShowPartnerSetup(true);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const clearAllData = () => {
    try {
      // Reset all state variables
      setCash(0);
      setTotalSales(0);
      setInventory([]);
      setTransactions([]);
      setPartners([]);
      setCashFlow({
        operatingActivities: { sales: 0, purchases: 0, expenses: 0 },
        investingActivities: { equipment: 0, investments: 0 },
        financingActivities: { capital: 0, withdrawals: 0 }
      });

      // Clear localStorage
      localStorage.removeItem('businessCash');
      localStorage.removeItem('businessTotalSales');
      localStorage.removeItem('businessInventory');
      localStorage.removeItem('businessTransactions');
      localStorage.removeItem('businessPartners');
      localStorage.removeItem('businessCashFlow');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data. Please try again.');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction({...transaction});
  };

  const handleSaveEdit = (updatedTransaction: Transaction) => {
    try {
      // Save current state for undo
      saveCurrentState();

      // Find the old transaction
      const oldTransaction = transactions.find(t => t.id === updatedTransaction.id);
      if (!oldTransaction) return;

      // Update debit and credit based on transaction type and amount
      if (updatedTransaction.type === 'sale') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Sales $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'purchase') {
        updatedTransaction.debit = `Inventory ${updatedTransaction.productName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'expense' || updatedTransaction.type === 'loss') {
        updatedTransaction.debit = `Expense $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'gain') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Gain $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'withdrawal') {
        updatedTransaction.debit = `Partner ${updatedTransaction.partnerName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      }

      // Update the transaction
      const updatedTransactions = transactions.map(t => 
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      setTransactions(updatedTransactions);
      localStorage.setItem('businessTransactions', JSON.stringify(updatedTransactions));

      // Update cash based on transaction type
      if (updatedTransaction.type === 'sale') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        setTotalSales(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'purchase') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'expense' || updatedTransaction.type === 'loss') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'gain') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'withdrawal') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
        const updatedPartners = partners.map(partner => 
          partner.name === updatedTransaction.partnerName 
            ? { ...partner, capital: parseFloat((partner.capital + oldTransaction.amount - updatedTransaction.amount).toFixed(2)) }
          : partner
        );
      setPartners(updatedPartners);
      localStorage.setItem('businessPartners', JSON.stringify(updatedPartners));
      }

      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Error updating transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    try {
      // Save current state for undo
      saveCurrentState();

      // Remove the transaction
      const updatedTransactions = transactions.filter(t => t.id !== transaction.id);
      setTransactions(updatedTransactions);
      localStorage.setItem('businessTransactions', JSON.stringify(updatedTransactions));
      
      // Update all related values
      if (transaction.type === 'sale') {
        // Update cash
        setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
        // Update total sales
        setTotalSales(prev => parseFloat((prev - transaction.amount).toFixed(2)));
        // Update inventory
        if (transaction.productName) {
          const itemIndex = inventory.findIndex(item => item.name === transaction.productName);
          if (itemIndex >= 0) {
        const updatedInventory = [...inventory];
            const item = updatedInventory[itemIndex];
            item.quantity += (transaction.quantity || 0);
          item.totalValue = item.quantity * item.unitCost;
        setInventory(updatedInventory);
            localStorage.setItem('businessInventory', JSON.stringify(updatedInventory));
          }
        }
      } else if (transaction.type === 'purchase') {
        // Update cash
        setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
        // Update inventory
        if (transaction.productName) {
          const itemIndex = inventory.findIndex(item => item.name === transaction.productName);
          if (itemIndex >= 0) {
        const updatedInventory = [...inventory];
            const item = updatedInventory[itemIndex];
            item.quantity -= (transaction.quantity || 0);
          item.totalValue = item.quantity * item.unitCost;
        setInventory(updatedInventory);
            localStorage.setItem('businessInventory', JSON.stringify(updatedInventory));
          }
        }
      } else if (transaction.type === 'expense' || transaction.type === 'loss') {
        // Update cash
        setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
      } else if (transaction.type === 'gain') {
        // Update cash
        setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
      } else if (transaction.type === 'withdrawal') {
        // Update cash
        setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
        // Update partner capital
        const updatedPartners = partners.map(partner => 
          partner.name === transaction.partnerName 
            ? { ...partner, capital: parseFloat((partner.capital + transaction.amount).toFixed(2)) }
            : partner
        );
      setPartners(updatedPartners);
      localStorage.setItem('businessPartners', JSON.stringify(updatedPartners));
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Please try again.');
    }
  };

  const handleClosingEntries = (entries: Transaction[]) => {
    setTransactions(prev => [...prev, ...entries]);
    saveCurrentState();
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2 header-title">Business Dashboard</h1>
              <p className="text-secondary header-subtitle">Track your inventory, cash flow, and transactions</p>
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
                onClick={() => setShowManualModal(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Closing Entries
              </Button>
              <Button
                onClick={handleExportData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export All Statements
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
                    <AlertDialogAction onClick={clearAllData}>
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
          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${cash.toFixed(2)}</div>
              <p className="text-secondary text-xs">Available cash</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
                <p className="text-secondary text-xs">Total stock value</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
                <p className="text-secondary text-xs">Cumulative sales</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${(cash + totalInventoryValue).toFixed(2)}</div>
                <p className="text-secondary text-xs">Cash + Inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
            <Button 
              onClick={() => { setTransactionType('purchase'); setShowTransactionModal(true); }}
              className="h-16 button-primary font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Purchase
          </Button>
            <Button 
              onClick={() => { setTransactionType('sale'); setShowTransactionModal(true); }}
              className="h-16 button-secondary font-semibold"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Sell
          </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="h-16 button-primary font-semibold"
            >
              <Package className="mr-2 h-5 w-5" />
              Create
          </Button>
            <Button 
              onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}
              className="h-16 button-secondary font-semibold"
            >
              <FileText className="mr-2 h-5 w-5" />
              Expenses
          </Button>
            <Button 
              onClick={() => { setTransactionType('withdrawal'); setShowTransactionModal(true); }}
              className="h-16 button-primary font-semibold"
            >
              <TrendingDown className="mr-2 h-5 w-5" />
              Withdraw
          </Button>
            <Button 
              onClick={() => { setTransactionType('gain'); setShowTransactionModal(true); }}
              className="h-16 button-secondary font-semibold"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Gain
          </Button>
            <Button 
              onClick={() => { setTransactionType('loss'); setShowTransactionModal(true); }}
              className="h-16 button-primary font-semibold"
            >
              <TrendingDown className="mr-2 h-5 w-5" />
              Loss
          </Button>
            <Button 
              onClick={() => setShowFinancialModal(true)}
              className="h-16 button-primary font-semibold md:col-span-7"
            >
              <FileText className="mr-2 h-5 w-5" />
              Financial Statements
          </Button>
          </div>

          {/* Current Inventory */}
          <Card className="mb-8 bg-card border-default">
            <CardHeader>
              <CardTitle className="text-primary">Current Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-default">
                      <th className="text-left py-3 px-4 font-semibold text-secondary">Product</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary">Quantity</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary">Unit Cost</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-default table-row-hover">
                        <td className="py-3 px-4 text-primary">{item.name}</td>
                        <td className="py-3 px-4 text-right text-secondary">
                          {item.type === 'oil' ? `${item.grams}g` : item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-secondary">${item.unitCost.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-primary">${item.totalValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-card border-default">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-primary">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-secondary text-center py-4">No transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="text-secondary">
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider">Debit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider">Credit</th>
                        <th className="text-center py-3 px-4 font-semibold text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-primary">
                      {transactions.slice(-10).reverse().map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-row-hover">
                          <td className="px-4 py-2 whitespace-nowrap">{transaction.date}</td>
                          <td className="px-4 py-2 whitespace-nowrap capitalize">{transaction.type}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{transaction.description}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">${transaction.amount.toFixed(2)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">{transaction.debit}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">{transaction.credit}</td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
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
          onClosingEntries={handleClosingEntries}
        />

        <ManualTransactionModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onManualTransaction={handleManualTransaction}
          onExport={handleExportData}
          onResetAfterClosing={resetAfterClosingEntry}
          netIncome={(() => {
            const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
            const totalCOGS = transactions
              .filter(t => t.type === 'sale' && t.unitCost)
              .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
            const grossProfit = totalRevenue - totalCOGS;
            return grossProfit - totalExpenses - totalLosses;
          })()}
          totalRevenue={transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0)}
          totalCOGS={transactions.filter(t => t.type === 'sale' && t.unitCost).reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0)}
          totalLosses={transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0)}
          totalGains={transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0)}
          partners={partners}
        />

        <Dialog open={showEditTransactionsModal} onOpenChange={setShowEditTransactionsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Transactions</DialogTitle>
              <DialogDescription>
                View and manage your transactions. You can edit or delete transactions.
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
                    <th className="text-center py-3 px-4 font-semibold text-secondary">Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-default table-row-hover">
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
                      <td className="py-3 px-4 text-center">
                          {editingTransaction?.id === transaction.id ? (
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                              onClick={() => handleSaveEdit(editingTransaction)}
                                className="text-green-500 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingTransaction(null)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransaction(transaction)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

