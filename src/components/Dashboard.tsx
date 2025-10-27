import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  AlertCircle,
  Check,
  X,
  Pencil,
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
  TrendingDown,
  Settings,
  Languages,
  ShoppingCart,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  UserMinus,
  UserPlus
} from 'lucide-react';
import { ManualTransactionModal } from './ManualTransactionModal';
import { TransactionModal } from './TransactionModal';
import { FinancialStatementsModal } from './FinancialStatementsModal';
import * as XLSX from 'xlsx-js-style';
import './dashboardTheme.css';
import { CreateProductModal } from './CreateProductModal';
import { PartnerSetupModal } from './PartnerSetupModal';
import { useTranslation, type Language } from '@/utils/translations';
import { formatDate } from '@/utils/dateFormatter';
import {
  ExcelColors,
  createHeaderStyle,
  createTitleStyle,
  createSubtotalStyle,
  createTotalStyle,
  createDateStyle,
  createAmountStyle,
  createDataStyle,
  applyCellStyle,
  applyRangeStyle
} from '@/utils/excelStyles';
import { dbService, migrateFromLocalStorage } from '@/db/database';

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
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss' | 'closing' | 'manual' | 'investing' | 'deposit' | 'payable' | 'receivable';
  description: string;
  amount: number;
  debit: string;
  credit: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
  partnerName?: string;
  creditorName?: string;
  debtorName?: string;
  customerName?: string;
  orderNumber?: string;
  note?: string;
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
    ['Income Statement', ''],
    [''],
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

const generateBalanceSheetData = (inventory: InventoryItem[], cash: number, partners: Partner[], netIncome: number, transactions: Transaction[]) => {
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);

  // Calculate Accounts Receivable (grouped by debtor)
  const accountsReceivableMap: Record<string, number> = {};
  // Include both 'receivable' type and credit sales
  transactions.filter(t => t.type === 'receivable').forEach(t => {
    // Try to extract name from debitName field or from debit string
    let debtor = t.debtorName;
    if (!debtor && t.debit) {
      const match = t.debit.match(/Accounts Receivable - (.+?) \$/);
      debtor = match ? match[1] : 'Unknown';
    }
    debtor = debtor || 'Unknown';
    accountsReceivableMap[debtor] = (accountsReceivableMap[debtor] || 0) + t.amount;
  });
  transactions.filter(t => t.type === 'sale' && t.paymentMethod === 'credit').forEach(t => {
    // Try to extract name from customerName field or from debit string
    let customer = t.customerName;
    if (!customer && t.debit) {
      const match = t.debit.match(/Accounts Receivable - (.+?) \$/);
      customer = match ? match[1] : 'Customer';
    }
    customer = customer || 'Customer';
    accountsReceivableMap[customer] = (accountsReceivableMap[customer] || 0) + t.amount;
  });
  const totalAccountsReceivable = Object.values(accountsReceivableMap).reduce((sum, val) => sum + val, 0);

  // Calculate Accounts Payable (grouped by creditor)
  const accountsPayableMap: Record<string, number> = {};
  // Include both 'payable' type transactions and credit purchases
  transactions.filter(t => t.type === 'payable').forEach(t => {
    // Try to extract name from creditorName field or from credit string
    let creditor = t.creditorName;
    if (!creditor && t.credit) {
      const match = t.credit.match(/Accounts Payable - (.+?) \$/);
      creditor = match ? match[1] : 'Unknown';
    }
    creditor = creditor || 'Unknown';
    accountsPayableMap[creditor] = (accountsPayableMap[creditor] || 0) + t.amount;
  });
  // Also include credit purchases in accounts payable
  transactions.filter(t => t.type === 'purchase' && t.paymentMethod === 'credit').forEach(t => {
    // Try to extract name from creditorName field or from credit string
    let creditor = t.creditorName;
    if (!creditor && t.credit) {
      const match = t.credit.match(/Accounts Payable - (.+?) \$/);
      creditor = match ? match[1] : 'Supplier';
    }
    creditor = creditor || 'Supplier';
    accountsPayableMap[creditor] = (accountsPayableMap[creditor] || 0) + t.amount;
  });
  const totalAccountsPayable = Object.values(accountsPayableMap).reduce((sum, val) => sum + val, 0);

  const totalAssets = cash + totalInventoryValue + totalAccountsReceivable;
  const totalLiabilitiesEquity = totalAccountsPayable + netIncome + totalCapital;

  // Side-by-side layout: Assets | Liabilities & Equity
  const data: any[][] = [];

  // Title row
  data.push(['Balance Sheet', '', '', '']);
  data.push([]); // Empty row

  // Headers
  data.push(['ASSETS', '', 'LIABILITIES & EQUITY', '']);

  // Assets side
  let assetRowIndex = 3;
  data.push(['Cash', cash, 'Accounts Payable', totalAccountsPayable]);
  assetRowIndex++;

  data.push(['Inventory', totalInventoryValue, '', '']);
  assetRowIndex++;

  // Add Accounts Receivable breakdown
  if (totalAccountsReceivable > 0) {
    data.push(['Accounts Receivable', totalAccountsReceivable, '', '']);
    assetRowIndex++;
    Object.entries(accountsReceivableMap).forEach(([debtor, amount]) => {
      data.push([`  ${debtor}`, amount, '', '']);
      assetRowIndex++;
    });
  }

  // Liabilities & Equity side (add after assets to align properly)
  // Add Accounts Payable breakdown
  if (totalAccountsPayable > 0 && Object.keys(accountsPayableMap).length > 1) {
    Object.entries(accountsPayableMap).forEach(([creditor, amount], index) => {
      if (index === 0) return; // Skip first one as it's already in the header row
      if (data[assetRowIndex - Object.keys(accountsPayableMap).length + index + 1]) {
        data[assetRowIndex - Object.keys(accountsPayableMap).length + index + 1][2] = `  ${creditor}`;
        data[assetRowIndex - Object.keys(accountsPayableMap).length + index + 1][3] = amount;
      } else {
        data.push(['', '', `  ${creditor}`, amount]);
      }
    });
  }

  // Add Retained Earnings
  const retainedEarningsRow = data.length;
  data.push(['', '', 'Retained Earnings', netIncome]);

  // Add partner capital rows
  partners.forEach((partner) => {
    data.push(['', '', `${partner.name} Capital`, partner.capital]);
  });

  // Total rows
  data.push(['Total Assets', totalAssets, 'Total Liabilities & Equity', totalLiabilitiesEquity]);

  return data;
};

const generateGeneralJournalData = (transactions: Transaction[]) => {
  const data: any[][] = [];

  // Title row with merge
  data.push(['General Journal', '', '', '', '']);
  data.push([]); // Empty row

  // Header row
  data.push(['Date', 'Description', 'Debit (Dr)', 'Credit (Cr)', 'Note']);

  // Group transactions by date
  const transactionsByDate = transactions.reduce((acc, t) => {
    if (!acc[t.date]) {
      acc[t.date] = [];
    }
    acc[t.date].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Generate journal entries
  Object.entries(transactionsByDate).forEach(([date, txns]) => {
    txns.forEach(t => {
      // Date and Description row with note
      data.push([date, t.description, '', '', t.note || '']);

      // Account entries
      const debitMatch = t.debit.match(/^(.+?)\s*\$(.+)$/);
      const creditMatch = t.credit.match(/^(.+?)\s*\$(.+)$/);

      if (debitMatch) {
        const [, account, amount] = debitMatch;
        data.push(['', account.trim(), `$ ${amount}`, '', '']);
      }

      if (creditMatch) {
        const [, account, amount] = creditMatch;
        data.push(['', `    ${account.trim()}`, '', `$ ${amount}`, '']);  // Indent credit accounts
      }

      // Empty row for spacing
      data.push([]);
    });
  });

  return data;
};

const generateInventoryLedgerData = (inventory: InventoryItem[]) => {
  return [
    ['Inventory Ledger', '', '', '', ''],
    [],
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
    ['Sales Ledger', '', '', '', '', ''],
    [],
    ['Date', 'Product', 'Quantity', 'Unit Cost', 'Unit Price', 'Total Amount'],
    ...sales.map(transaction => {
      const unitPrice = transaction.quantity ? transaction.amount / transaction.quantity : transaction.amount;
      return [
        transaction.date,
        transaction.productName || 'Unknown',
        transaction.quantity || 1,
        `$${(transaction.unitCost || 0).toFixed(2)}`,
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
    .filter(t => t.type === 'purchase' && t.paymentMethod === 'cash')
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

  const cashFromDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashFromLoans = transactions
    .filter(t => t.type === 'payable')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashPaidForWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashPaidForLoansGiven = transactions
    .filter(t => t.type === 'receivable')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netCashFromFinancingActivities = cashFromCapitalContributions + cashFromDeposits + cashFromLoans - cashPaidForWithdrawals - cashPaidForLoansGiven;

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
    ['Partner Deposits', `$${(Number(cashFromDeposits) || 0).toFixed(2)}`],
    ['Loans Received (Accounts Payable)', `$${(Number(cashFromLoans) || 0).toFixed(2)}`],
    ['Cash Paid for Withdrawals', `$${(Number(cashPaidForWithdrawals) || 0).toFixed(2)}`],
    ['Loans Given (Accounts Receivable)', `$${(Number(cashPaidForLoansGiven) || 0).toFixed(2)}`],
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
    ['Trial Balance', '', ''],
    [],
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

  // Calculate Accounts Receivable (grouped by debtor)
  const accountsReceivableMap: Record<string, number> = {};
  // Include both 'receivable' type and credit sales
  transactions.filter(t => t.type === 'receivable').forEach(t => {
    // Try to extract name from debitName field or from debit string
    let debtor = t.debtorName;
    if (!debtor && t.debit) {
      const match = t.debit.match(/Accounts Receivable - (.+?) \$/);
      debtor = match ? match[1] : 'Unknown';
    }
    debtor = debtor || 'Unknown';
    accountsReceivableMap[debtor] = (accountsReceivableMap[debtor] || 0) + t.amount;
  });
  transactions.filter(t => t.type === 'sale' && t.paymentMethod === 'credit').forEach(t => {
    // Try to extract name from customerName field or from debit string
    let customer = t.customerName;
    if (!customer && t.debit) {
      const match = t.debit.match(/Accounts Receivable - (.+?) \$/);
      customer = match ? match[1] : 'Customer';
    }
    customer = customer || 'Customer';
    accountsReceivableMap[customer] = (accountsReceivableMap[customer] || 0) + t.amount;
  });
  const totalAccountsReceivable = Object.values(accountsReceivableMap).reduce((sum, val) => sum + val, 0);

  // Add Accounts Receivable
  if (totalAccountsReceivable > 0) {
    data.push(['Accounts Receivable', totalAccountsReceivable.toFixed(2), '-']);
    Object.entries(accountsReceivableMap).forEach(([debtor, amount]) => {
      data.push([`  ${debtor}`, amount.toFixed(2), '-']);
    });
  }

  // Add other accounts
  data.push(
    ['Gross Profit', '-', grossProfit.toFixed(2)],
    ['Expenses', totalExpenses.toFixed(2), '-'],
    ['Losses', totalLosses.toFixed(2), '-'],
    ['Gains', '-', totalGains.toFixed(2)]
  );

  // Calculate Accounts Payable (grouped by creditor)
  const accountsPayableMap: Record<string, number> = {};
  // Include both 'payable' type transactions and credit purchases
  transactions.filter(t => t.type === 'payable').forEach(t => {
    // Try to extract name from creditorName field or from credit string
    let creditor = t.creditorName;
    if (!creditor && t.credit) {
      const match = t.credit.match(/Accounts Payable - (.+?) \$/);
      creditor = match ? match[1] : 'Unknown';
    }
    creditor = creditor || 'Unknown';
    accountsPayableMap[creditor] = (accountsPayableMap[creditor] || 0) + t.amount;
  });
  // Also include credit purchases in accounts payable
  transactions.filter(t => t.type === 'purchase' && t.paymentMethod === 'credit').forEach(t => {
    // Try to extract name from creditorName field or from credit string
    let creditor = t.creditorName;
    if (!creditor && t.credit) {
      const match = t.credit.match(/Accounts Payable - (.+?) \$/);
      creditor = match ? match[1] : 'Supplier';
    }
    creditor = creditor || 'Supplier';
    accountsPayableMap[creditor] = (accountsPayableMap[creditor] || 0) + t.amount;
  });
  const totalAccountsPayable = Object.values(accountsPayableMap).reduce((sum, val) => sum + val, 0);

  // Add Accounts Payable
  if (totalAccountsPayable > 0) {
    data.push(['Accounts Payable', '-', totalAccountsPayable.toFixed(2)]);
    Object.entries(accountsPayableMap).forEach(([creditor, amount]) => {
      data.push([`  ${creditor}`, '-', amount.toFixed(2)]);
    });
  }

  // Add partner capitals
  partners.forEach(partner => {
    data.push([`${partner.name} Capital`, '-', partner.capital.toFixed(2)]);
  });

  // Add totals
  const totalDebits = cash + totalInventoryValue + totalExpenses + totalLosses + totalAccountsReceivable;
  const totalCredits = grossProfit + totalCapital + totalGains + totalAccountsPayable;
  data.push(['Total', totalDebits.toFixed(2), totalCredits.toFixed(2)]);

  return data;
};

export const Dashboard = () => {
  // Initialize darkMode and language from localStorage for instant loading
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });
  const [isLoading, setIsLoading] = useState(true);

  const { t } = useTranslation(language);

  // Function to translate debit/credit entries
  const translateAccountEntry = (entry: string): string => {
    if (!entry) return entry;
    
    // Replace account names with translations
    let translatedEntry = entry
      .replace(/Cash/g, t('cash'))
      .replace(/Revenue/g, t('revenue'))
      .replace(/Inventory/g, t('inventory'))
      .replace(/Expenses/g, t('expenses'))
      .replace(/Gain/g, t('gain'))
      .replace(/Loss/g, t('loss'))
      .replace(/Income Summary/g, t('incomeSummary'))
      .replace(/Partner Capital/g, t('partnerCapital'));
    
    // Handle partner-specific capital entries (e.g., "John Capital")
    if (entry.includes(' Capital')) {
      const partnerName = entry.split(' Capital')[0];
      if (partnerName && !['Partner', 'Income Summary'].includes(partnerName)) {
        translatedEntry = entry.replace(/ Capital/, ` ${t('capital')}`);
      }
    }
    
    return translatedEntry;
  };

  // Function to translate transaction descriptions
  const translateDescription = (description: string): string => {
    if (!description || language === 'en') return description;
    
    let translatedDesc = description;
    
    // Handle different description patterns
    // Pattern: "Sold X ProductName (boxed)"
    if (description.includes('Sold ')) {
      const soldMatch = description.match(/Sold (\d+(?:\.\d+)?) (.+?)(\s\(boxed\))?$/);
      if (soldMatch) {
        const [, quantity, productName, boxedPart] = soldMatch;
        const boxedText = boxedPart ? ` (${t('boxed')})` : '';
        translatedDesc = `${t('sold')} ${quantity} ${productName}${boxedText}`;
      }
    }
    
    // Pattern: "Purchased X type - ProductName" or "Purchased Xg type - ProductName"
    else if (description.includes('Purchased ')) {
      const purchasedMatch = description.match(/Purchased (.+?) (.+?) - (.+)$/);
      if (purchasedMatch) {
        const [, quantityPart, typePart, productName] = purchasedMatch;
        let translatedQuantity = quantityPart;
        let translatedType = typePart;
        
        // Handle different quantity formats
        if (quantityPart.endsWith('g')) {
          translatedQuantity = quantityPart.replace('g', t('g'));
        }
        
        // Translate product types
        const typeTranslations: { [key: string]: string } = {
          'bottles': t('bottles'),
          'oil': t('oil'),
          'box': t('box'),
          'other': t('other')
        };
        
        if (typeTranslations[typePart]) {
          translatedType = typeTranslations[typePart];
        }
        
        translatedDesc = `${t('purchased')} ${translatedQuantity} ${translatedType} - ${productName}`;
      }
    }
    
    // Pattern: "Capital withdrawal by PartnerName"
    else if (description.includes('Capital withdrawal by ')) {
      const withdrawalMatch = description.match(/Capital withdrawal by (.+)$/);
      if (withdrawalMatch) {
        const [, partnerName] = withdrawalMatch;
        translatedDesc = `${t('capitalWithdrawalBy')} ${partnerName}`;
      }
    }

    // Pattern: "Initial capital from PartnerName"
    else if (description.includes('Initial capital from ')) {
      const capitalMatch = description.match(/Initial capital from (.+)$/);
      if (capitalMatch) {
        const [, partnerName] = capitalMatch;
        translatedDesc = `${t('initialCapitalFrom')} ${partnerName}`;
      }
    }

    // Pattern: "Loan given to PartnerName"
    else if (description.includes('Loan given to ')) {
      const loanMatch = description.match(/Loan given to (.+)$/);
      if (loanMatch) {
        const [, partnerName] = loanMatch;
        translatedDesc = `${t('loanGivenTo')} ${partnerName}`;
      }
    }

    // Pattern: "Loan received from PartnerName"
    else if (description.includes('Loan received from ')) {
      const loanMatch = description.match(/Loan received from (.+)$/);
      if (loanMatch) {
        const [, partnerName] = loanMatch;
        translatedDesc = `${t('loanReceivedFrom')} ${partnerName}`;
      }
    }

    // Pattern: "Income Summary to Partner Capitals"
    else if (description.includes('Income Summary to Partner Capitals')) {
      translatedDesc = t('incomeSummaryToPartnerCapitals');
    }

    // Pattern: "Business loss"
    else if (description === 'loss') {
      translatedDesc = t('loss');
    }

    // Pattern: "Business gain"
    else if (description === 'gain') {
      translatedDesc = t('gain');
    }

    // Pattern: "Business gain" or "Business loss"
    else if (description === 'Business gain') {
      translatedDesc = t('businessGain');
    }
    else if (description === 'Business loss') {
      translatedDesc = t('businessLoss');
    }
    
    // Pattern: "Closing Entry - ..."
    else if (description.includes('Closing Entry')) {
      translatedDesc = description.replace('Closing Entry', t('closingEntry'));
    }
    
    // Pattern: "Distribution to PartnerName"
    else if (description.includes('Distribution to ')) {
      const distributionMatch = description.match(/Distribution to (.+)$/);
      if (distributionMatch) {
        const [, partnerName] = distributionMatch;
        translatedDesc = `${t('distributionTo')} ${partnerName}`;
      }
    }
    
    return translatedDesc;
  };
  const [cash, setCash] = useState(0);
  const [cashFlow, setCashFlow] = useState({
    operatingActivities: { sales: 0, purchases: 0, expenses: 0 },
    investingActivities: { equipment: 0, investments: 0 },
    financingActivities: { capital: 0, withdrawals: 0 }
  });
  const [totalSales, setTotalSales] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showPartnerSetup, setShowPartnerSetup] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<{transactions: Transaction[], cash: number, inventory: InventoryItem[], totalSales: number, partners: Partner[]}[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'purchase' | 'sale' | 'expense' | 'withdrawal' | 'gain' | 'loss' | 'deposit' | 'payable' | 'receivable'>('purchase');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditTransactionsModal, setShowEditTransactionsModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showExportSuccessDialog, setShowExportSuccessDialog] = useState(false);
  const [showExportErrorDialog, setShowExportErrorDialog] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Track if initial load is complete
  const isInitialLoadRef = useRef(true);

  // Ref for transaction table scroll container
  const transactionScrollRef = useRef<HTMLDivElement>(null);

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  // Load data from database on mount
  useEffect(() => {
    async function loadFromDatabase() {
      try {
        // Expose dbService for debugging
        (window as any).dbService = dbService;

        // Migrate from localStorage if needed (only runs once)
        await migrateFromLocalStorage();

        // Load all data
        const [txns, inv, prtrs, settings] = await Promise.all([
          dbService.getAllTransactions(),
          dbService.getAllInventory(),
          dbService.getAllPartners(),
          dbService.getSettings()
        ]);

        setTransactions(txns);
        setInventory(inv);
        setPartners(prtrs);
        setCash(settings.cash);
        setTotalSales(settings.totalSales);
        setDarkMode(settings.darkMode);
        setLanguage(settings.language);
        setIsLoading(false);
        isInitialLoadRef.current = false; // Mark initial load as complete
      } catch (error) {
        console.error('Failed to load from database:', error);
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    }

    loadFromDatabase();
  }, []);

  // Save to database when cash changes
  useEffect(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      dbService.updateSettings({ cash });
    }
  }, [cash, isLoading]);

  // Save to database when totalSales changes
  useEffect(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      dbService.updateSettings({ totalSales });
    }
  }, [totalSales, isLoading]);

  // Save to database when inventory changes
  useEffect(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      dbService.bulkUpdateInventory(inventory);
    }
  }, [inventory, isLoading]);

  // Save to database when transactions change
  useEffect(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      dbService.bulkUpdateTransactions(transactions);
    }
  }, [transactions, isLoading]);

  // Save to database when partners change
  useEffect(() => {
    if (!isLoading && !isInitialLoadRef.current) {
      dbService.bulkUpdatePartners(partners);
    }
  }, [partners, isLoading]);

  // Check if partners are set up (after loading)
  useEffect(() => {
    if (!isLoading && partners.length === 0) {
      setShowPartnerSetup(true);
    }
  }, [isLoading, partners.length]);

  useEffect(() => {
    // Initialize language settings on component mount
    if (language === 'ar') {
      document.body.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl-mode');
    } else {
      document.body.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl-mode');
    }
  }, [language]);

  // Apply dark mode class whenever darkMode state changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Always scroll transaction table to the left (start)
  useEffect(() => {
    if (transactionScrollRef.current) {
      transactionScrollRef.current.scrollLeft = 0;
    }
  }, [language, transactions]);

  const handlePartnerSetup = (partnerData: Partner[]) => {
    // Merge new partners with existing ones, avoiding duplicates by name
    const existingNames = new Set(partners.map(p => p.name));
    const newPartnersWithIds = partnerData
      .filter(p => !existingNames.has(p.name))
      .map(p => ({
        ...p,
        id: `partner-${Date.now()}-${Math.random()}`
      }));
    const updatedPartners = [...partners, ...newPartnersWithIds];
    setPartners(updatedPartners);

    // Add initial capital transactions only for new partners
    const capitalTransactions = newPartnersWithIds.map(partner => ({
      id: `capital-${Date.now()}-${Math.random()}`,
      date: formatDate(),
      type: 'investing' as const,
      description: `Initial capital from ${partner.name}`,
      amount: partner.capital,
      debit: `Cash $${partner.capital.toFixed(2)}`,
      credit: `${partner.name} Capital $${partner.capital.toFixed(2)}`,
      partnerName: partner.name,
      paymentMethod: 'cash' as const
    }));
    setTransactions(prev => [...prev, ...capitalTransactions]);
    setCash(prev => prev + newPartnersWithIds.reduce((sum, p) => sum + p.capital, 0));
    setShowPartnerSetup(false); // Close the modal after setup
  };

  const handleDeletePartner = (partnerName: string) => {
    // Only allow deletion if partner's capital is 0
    const partner = partners.find(p => p.name === partnerName);
    if (partner && partner.capital === 0) {
      setPartners(partners.filter(p => p.name !== partnerName));
    }
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
            date: formatDate(),
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

          // Update cash only if payment method is cash (credit sales go to Accounts Receivable)
          if (saleTx.paymentMethod === 'cash') {
            setCash(prev => parseFloat((prev + saleTx.amount).toFixed(2)));
          }
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
          setTransactions(prev => [...prev, saleTransaction]);
        });

        setShowTransactionModal(false);
        return;
      }

      // Handle other transaction types...
      console.log('Transaction data received:', transactionData);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
        date: formatDate(),
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

      // Update cash based on transaction type
    if (transactionData.type === 'purchase') {
        // Only update cash if it's a cash purchase (not credit)
        if (transactionData.paymentMethod === 'cash') {
          setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
        }

        // Update inventory for purchase transactions
        if (transactionData.productName && transactionData.quantity && transactionData.unitCost) {
          setInventory(prev => {
            const existingItem = prev.find(item => item.name === transactionData.productName);
            
            if (existingItem) {
              // Update existing item
              return prev.map(item => {
                if (item.name === transactionData.productName) {
                  // Check if this is an oil purchase (from productType in transaction)
                  const isOilPurchase = transactionData.productType === 'oil';

                  if (isOilPurchase || item.type === 'oil') {
                    // For oil, update grams and calculate total value
                    const newGrams = (item.grams || 0) + transactionData.quantity;
                    const totalValue = newGrams * transactionData.unitCost;
                    return {
                      ...item,
                      type: 'oil', // Ensure type is set to oil
                      grams: newGrams,
                      unitCost: transactionData.unitCost,
                      totalValue: totalValue,
                      quantity: 0 // Oil doesn't use quantity field
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
              // Use productType from transaction data, with fallback to name detection
              let itemType: 'bottles' | 'oil' | 'box' | 'other' = 'other';

              if (transactionData.productType) {
                // Use the explicit productType from the transaction
                itemType = transactionData.productType;
              } else {
                // Fallback: determine item type based on name
                const isOil = transactionData.productName.toLowerCase().includes('oil') ||
                             transactionData.productName.toLowerCase().includes('coco');
                const isBottle = transactionData.productName.toLowerCase().includes('ml');
                itemType = isOil ? 'oil' : (isBottle ? 'bottles' : 'other');
              }

              const isOil = itemType === 'oil';
              const isBottle = itemType === 'bottles';
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
                milliliters: isBottle && transactionData.milliliters ? transactionData.milliliters : undefined
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
    } else if (transactionData.type === 'deposit') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
      const updatedPartners = partners.map(partner =>
        partner.name === transactionData.partnerName
          ? { ...partner, capital: parseFloat((partner.capital + transactionData.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
    } else if (transactionData.type === 'payable') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'receivable') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
    }

      // Add transaction to journal
      setTransactions(prev => {
        return [...prev, newTransaction];
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
      date: formatDate(),
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
      setTransactionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Save current state for undo
    saveCurrentState();

    // Reverse the transaction effects based on type
    if (transaction.type === 'sale') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
      setTotalSales(prev => parseFloat((prev - transaction.amount).toFixed(2)));
    } else if (transaction.type === 'purchase') {
      // Only refund cash if it was a cash purchase
      if (transaction.paymentMethod === 'cash') {
        setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
      }
      // Update inventory - reduce total value
      const updatedInventory = inventory.map(item => {
        if (item.name === transaction.productName) {
          const newTotalValue = parseFloat((item.totalValue - transaction.amount).toFixed(2));
          let newUnitCost = item.unitCost;
          if (item.type === 'oil' && item.grams && item.grams > 0) {
            newUnitCost = parseFloat((newTotalValue / item.grams).toFixed(2));
          } else if (item.quantity > 0) {
            newUnitCost = parseFloat((newTotalValue / item.quantity).toFixed(2));
          }
          return { ...item, totalValue: newTotalValue, unitCost: newUnitCost };
        }
        return item;
      });
      setInventory(updatedInventory);
    } else if (transaction.type === 'expense' || transaction.type === 'loss') {
      setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
    } else if (transaction.type === 'gain') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
    } else if (transaction.type === 'withdrawal') {
      setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
      const updatedPartners = partners.map(partner =>
        partner.name === transaction.partnerName
          ? { ...partner, capital: parseFloat((partner.capital + transaction.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
    } else if (transaction.type === 'investing' || transaction.type === 'deposit') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
      const partnerName = transaction.partnerName || transaction.credit?.match(/^(.+?)\s+Capital\s+\$/)?.[1];
      if (partnerName) {
        const updatedPartners = partners.map(partner =>
          partner.name === partnerName
            ? { ...partner, capital: parseFloat((partner.capital - transaction.amount).toFixed(2)) }
            : partner
        );
        setPartners(updatedPartners);
      }
    } else if (transaction.type === 'payable') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
    } else if (transaction.type === 'receivable') {
      setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
    }

    // Remove transaction from the list
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleUpdateNote = (transactionId: string, note: string) => {
    setTransactions(prev => prev.map(t =>
      t.id === transactionId ? { ...t, note } : t
    ));
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
        date: formatDate(),
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

      // Update partner capital if this is a closing entry
      if (manualData.isClosingEntry) {
        // Check if this affects a specific partner's capital
        const partnerCapitalMatch = manualData.debit.match(/^(.+?)\sCapital\s\$/);
        const partnerCapitalCreditMatch = manualData.credit.match(/^(.+?)\sCapital\s\$/);

        if (partnerCapitalMatch) {
          // Partner capital is being debited (decreased)
          const partnerName = partnerCapitalMatch[1];
          const updatedPartners = partners.map(p =>
            p.name === partnerName
              ? { ...p, capital: parseFloat((p.capital - manualData.amount).toFixed(2)) }
              : p
          );
          setPartners(updatedPartners);
        } else if (partnerCapitalCreditMatch) {
          // Partner capital is being credited (increased)
          const partnerName = partnerCapitalCreditMatch[1];
          const updatedPartners = partners.map(p =>
            p.name === partnerName
              ? { ...p, capital: parseFloat((p.capital + manualData.amount).toFixed(2)) }
              : p
          );
          setPartners(updatedPartners);
        }
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

  const handleExportData = useCallback((additionalTransactions?: Transaction[]) => {
    try {
      // Use current transactions plus any additional ones (like closing entries)
      const allTransactions = [...transactions, ...(Array.isArray(additionalTransactions) ? additionalTransactions : [])];

      // Calculate net income
      const totalRevenue = allTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalGains = allTransactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
      const totalLosses = allTransactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
      const totalCOGS = allTransactions
        .filter(t => t.type === 'sale' && t.unitCost)
        .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = grossProfit + totalGains - totalExpenses - totalLosses;

      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: false }] };

      // Income Statement with formatting
      const incomeStatementData = generateIncomeStatementData(allTransactions);
      const isSheet = XLSX.utils.aoa_to_sheet(incomeStatementData);

      // Set column widths
      isSheet['!cols'] = [{ wch: 35 }, { wch: 20 }];

      // Merge title (row 1)
      if (!isSheet['!merges']) isSheet['!merges'] = [];
      isSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });

      // Apply formatting
      // Row 1: Title
      applyCellStyle(isSheet, 'A1', createTitleStyle(ExcelColors.deepGreen));

      // Row 3: Revenue header (deep green with white text)
      applyCellStyle(isSheet, 'A3', createHeaderStyle(ExcelColors.deepGreen, 'FFFFFFFF'));
      applyCellStyle(isSheet, 'B3', createHeaderStyle(ExcelColors.deepGreen, 'FFFFFFFF'));

      // Row 4: Sales Revenue (light green with black text)
      applyCellStyle(isSheet, 'A4', createDataStyle(ExcelColors.lightGreen));
      applyCellStyle(isSheet, 'B4', createAmountStyle(ExcelColors.lightGreen));

      // Row 6: COGS header (light red with BLACK text)
      applyCellStyle(isSheet, 'A6', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));
      applyCellStyle(isSheet, 'B6', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));

      // Row 7: COGS amount (light red)
      applyCellStyle(isSheet, 'A7', createDataStyle(ExcelColors.lightRed));
      applyCellStyle(isSheet, 'B7', createAmountStyle(ExcelColors.lightRed));

      // Row 8: Gross Profit (medium green subtotal with BLACK text) - CENTERED
      applyCellStyle(isSheet, 'A8', { ...createSubtotalStyle(ExcelColors.mediumGreen, 'FF000000'), alignment: { horizontal: 'center', vertical: 'center' } });
      applyCellStyle(isSheet, 'B8', { ...createAmountStyle(ExcelColors.mediumGreen), font: { bold: true, color: { rgb: 'FF000000' } } });

      // Row 9: Gains (light green)
      applyCellStyle(isSheet, 'A9', createDataStyle(ExcelColors.lightGreen));
      applyCellStyle(isSheet, 'B9', createAmountStyle(ExcelColors.lightGreen));

      // Row 10: Total Profitability (medium green with BLACK text) - CENTERED
      applyCellStyle(isSheet, 'A10', { ...createSubtotalStyle(ExcelColors.mediumGreen, 'FF000000'), alignment: { horizontal: 'center', vertical: 'center' } });
      applyCellStyle(isSheet, 'B10', { ...createAmountStyle(ExcelColors.mediumGreen), font: { bold: true, color: { rgb: 'FF000000' } } });

      // Row 12: Operating Expenses header (light red with BLACK text)
      applyCellStyle(isSheet, 'A12', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));
      applyCellStyle(isSheet, 'B12', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));

      // Row 13-14: Expenses and Losses (light red)
      applyCellStyle(isSheet, 'A13', createDataStyle(ExcelColors.lightRed));
      applyCellStyle(isSheet, 'B13', createAmountStyle(ExcelColors.lightRed));
      applyCellStyle(isSheet, 'A14', createDataStyle(ExcelColors.lightRed));
      applyCellStyle(isSheet, 'B14', createAmountStyle(ExcelColors.lightRed));

      // Row 16: Net Income (dark green total with white text) - CENTERED
      applyCellStyle(isSheet, 'A16', { ...createTotalStyle(ExcelColors.darkGreen), alignment: { horizontal: 'center', vertical: 'center' } });
      applyCellStyle(isSheet, 'B16', { ...createAmountStyle(ExcelColors.darkGreen), font: { bold: true, color: { rgb: 'FFFFFFFF' } } });

      XLSX.utils.book_append_sheet(wb, isSheet, "Income Statement");

      // Balance Sheet with side-by-side layout and color formatting
      const balanceSheetData = generateBalanceSheetData(inventory, cash, partners, netIncome, transactions);
      const bsSheet = XLSX.utils.aoa_to_sheet(balanceSheetData);

      // Set column widths for side-by-side layout
      bsSheet['!cols'] = [
        { wch: 25 },  // Assets account
        { wch: 18 },  // Assets amount
        { wch: 25 },  // Liabilities/Equity account
        { wch: 18 }   // Liabilities/Equity amount
      ];

      // Merge title (row 1)
      if (!bsSheet['!merges']) bsSheet['!merges'] = [];
      bsSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });

      // Row 1: Title
      applyCellStyle(bsSheet, 'A1', createTitleStyle(ExcelColors.navyBlue));

      // Row 3: Headers - Assets and Liabilities & Equity
      applyCellStyle(bsSheet, 'A3', createHeaderStyle(ExcelColors.navyBlue));
      applyCellStyle(bsSheet, 'B3', createHeaderStyle(ExcelColors.navyBlue));
      applyCellStyle(bsSheet, 'C3', createHeaderStyle(ExcelColors.navyBlue));
      applyCellStyle(bsSheet, 'D3', createHeaderStyle(ExcelColors.navyBlue));

      // Apply formatting to all data rows
      let bsRow = 4;
      while (bsSheet[`A${bsRow}`] || bsSheet[`B${bsRow}`] || bsSheet[`C${bsRow}`] || bsSheet[`D${bsRow}`]) {
        const cellA = bsSheet[`A${bsRow}`];
        const cellC = bsSheet[`C${bsRow}`];

        // Check if this is a total row
        const isAssetTotal = cellA && cellA.v && cellA.v.toString().startsWith('Total');
        const isLiabilityTotal = cellC && cellC.v && cellC.v.toString().startsWith('Total');

        if (isAssetTotal) {
          applyCellStyle(bsSheet, `A${bsRow}`, createTotalStyle(ExcelColors.darkBlue));
          applyCellStyle(bsSheet, `B${bsRow}`, { ...createAmountStyle(ExcelColors.darkBlue), font: { bold: true, color: { rgb: 'FFFFFFFF' } } });
        } else if (cellA && cellA.v) {
          applyCellStyle(bsSheet, `A${bsRow}`, createDataStyle(ExcelColors.lightBlue));
          applyCellStyle(bsSheet, `B${bsRow}`, createAmountStyle(ExcelColors.lightBlue));
        }

        if (isLiabilityTotal) {
          applyCellStyle(bsSheet, `C${bsRow}`, createTotalStyle(ExcelColors.darkOrange));
          applyCellStyle(bsSheet, `D${bsRow}`, { ...createAmountStyle(ExcelColors.darkOrange), font: { bold: true, color: { rgb: 'FFFFFFFF' } } });
        } else if (cellC && cellC.v) {
          applyCellStyle(bsSheet, `C${bsRow}`, createDataStyle(ExcelColors.lightOrange));
          applyCellStyle(bsSheet, `D${bsRow}`, createAmountStyle(ExcelColors.lightOrange));
        }

        bsRow++;
      }

      XLSX.utils.book_append_sheet(wb, bsSheet, "Balance Sheet");

      // General Journal with comprehensive formatting
      const generalJournalData = generateGeneralJournalData(allTransactions);
      const gjSheet = XLSX.utils.aoa_to_sheet(generalJournalData);

      // Set column widths
      gjSheet['!cols'] = [
        { wch: 15 },  // Date column
        { wch: 40 },  // Description/Account column
        { wch: 18 },  // Debit column
        { wch: 18 },  // Credit column
        { wch: 30 }   // Note column
      ];

      // Merge title cell (A1:E1)
      if (!gjSheet['!merges']) gjSheet['!merges'] = [];
      gjSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

      // Apply title style (row 1)
      applyCellStyle(gjSheet, 'A1', createTitleStyle(ExcelColors.darkBlue));

      // Apply header row style (row 3)
      ['A3', 'B3'].forEach(cell => applyCellStyle(gjSheet, cell, createHeaderStyle(ExcelColors.darkBlue)));
      applyCellStyle(gjSheet, 'C3', createHeaderStyle(ExcelColors.mediumBlue));
      applyCellStyle(gjSheet, 'D3', createHeaderStyle(ExcelColors.mediumBlue));
      applyCellStyle(gjSheet, 'E3', createHeaderStyle(ExcelColors.darkBlue));

      // Apply formatting to data rows - get the actual range
      const range = gjSheet['!ref'];
      let maxRow = 4; // Start with header row
      if (range) {
        const rangeEnd = XLSX.utils.decode_range(range);
        maxRow = rangeEnd.e.r + 1; // Add 1 to ensure we style the last row
      }

      // Apply styles to ALL rows in the data range (NO BREAK - continue through empty rows)
      for (let row = 4; row <= maxRow; row++) {
        const cellA = gjSheet[`A${row}`];
        const cellB = gjSheet[`B${row}`];
        const cellC = gjSheet[`C${row}`];
        const cellD = gjSheet[`D${row}`];
        const cellE = gjSheet[`E${row}`];

        if (cellA && cellA.v) {
          // Date entry row - light green background
          applyCellStyle(gjSheet, `A${row}`, createDateStyle(ExcelColors.lightGreen));
          applyCellStyle(gjSheet, `B${row}`, createDataStyle(ExcelColors.lightGreen));
          applyCellStyle(gjSheet, `C${row}`, createDataStyle(ExcelColors.white));
          applyCellStyle(gjSheet, `D${row}`, createDataStyle(ExcelColors.white));
          applyCellStyle(gjSheet, `E${row}`, createDataStyle(ExcelColors.lightGreen));
        } else if (cellB && cellB.v) {
          // Account entry row - light gray background with yellow amounts
          applyCellStyle(gjSheet, `A${row}`, createDataStyle(ExcelColors.veryLightGray));

          // Check if credit account (has indent/spaces) for center alignment
          const accountText = cellB.v.toString();
          const isCredit = accountText.startsWith('    ');
          applyCellStyle(gjSheet, `B${row}`, createDataStyle(ExcelColors.veryLightGray, isCredit ? 'center' : 'left'));

          if (cellC && cellC.v) {
            applyCellStyle(gjSheet, `C${row}`, createAmountStyle(ExcelColors.lightYellow));
          } else {
            applyCellStyle(gjSheet, `C${row}`, createDataStyle(ExcelColors.veryLightGray));
          }
          if (cellD && cellD.v) {
            applyCellStyle(gjSheet, `D${row}`, createAmountStyle(ExcelColors.lightYellow));
          } else {
            applyCellStyle(gjSheet, `D${row}`, createDataStyle(ExcelColors.veryLightGray));
          }
          applyCellStyle(gjSheet, `E${row}`, createDataStyle(ExcelColors.veryLightGray));
        } else {
          // Handle empty rows (spacing rows) - apply white background to all columns
          applyCellStyle(gjSheet, `A${row}`, createDataStyle(ExcelColors.white));
          applyCellStyle(gjSheet, `B${row}`, createDataStyle(ExcelColors.white));
          applyCellStyle(gjSheet, `C${row}`, createDataStyle(ExcelColors.white));
          applyCellStyle(gjSheet, `D${row}`, createDataStyle(ExcelColors.white));
          applyCellStyle(gjSheet, `E${row}`, createDataStyle(ExcelColors.white));
        }
      }

      XLSX.utils.book_append_sheet(wb, gjSheet, "General Journal");

      // Cash Flow Statement with color formatting
      const cashFlowStatementData = generateCashFlowStatementData(allTransactions, cash, partners);
      const cfSheet = XLSX.utils.aoa_to_sheet(cashFlowStatementData);

      // Set column widths
      cfSheet['!cols'] = [
        { wch: 45 },  // Description column
        { wch: 20 }   // Amount column
      ];

      // Merge title cell
      if (!cfSheet['!merges']) cfSheet['!merges'] = [];
      cfSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });

      // Apply title style
      applyCellStyle(cfSheet, 'A1', createTitleStyle(ExcelColors.teal));

      // Apply formatting to rows
      let cfRow = 3;
      let currentActivity = '';
      while (cfSheet[`A${cfRow}`] || cfSheet[`B${cfRow}`]) {
        const cellA = cfSheet[`A${cfRow}`];

        if (cellA && cellA.v) {
          const value = cellA.v.toString();

          // Activity section headers
          if (value.includes('Operating Activities') || value === 'OPERATING ACTIVITIES') {
            applyCellStyle(cfSheet, `A${cfRow}`, createHeaderStyle(ExcelColors.lightTeal, 'FF000000'));
            applyCellStyle(cfSheet, `B${cfRow}`, createHeaderStyle(ExcelColors.lightTeal, 'FF000000'));
            currentActivity = 'operating';
          } else if (value.includes('Investing Activities') || value === 'INVESTING ACTIVITIES') {
            applyCellStyle(cfSheet, `A${cfRow}`, createHeaderStyle(ExcelColors.lightOrange, 'FF000000'));
            applyCellStyle(cfSheet, `B${cfRow}`, createHeaderStyle(ExcelColors.lightOrange, 'FF000000'));
            currentActivity = 'investing';
          } else if (value.includes('Financing Activities') || value === 'FINANCING ACTIVITIES') {
            applyCellStyle(cfSheet, `A${cfRow}`, createHeaderStyle(ExcelColors.lightPurple, 'FF000000'));
            applyCellStyle(cfSheet, `B${cfRow}`, createHeaderStyle(ExcelColors.lightPurple, 'FF000000'));
            currentActivity = 'financing';
          } else if (value.startsWith('Net ') || value.includes('Total') || value.includes('Change in Cash')) {
            // Total/subtotal rows
            applyCellStyle(cfSheet, `A${cfRow}`, createSubtotalStyle(ExcelColors.mediumTeal, 'FF000000'));
            applyCellStyle(cfSheet, `B${cfRow}`, { ...createAmountStyle(ExcelColors.mediumTeal), font: { bold: true, color: { rgb: 'FF000000' } } });
          } else {
            // Regular data rows
            if (currentActivity === 'operating') {
              applyCellStyle(cfSheet, `A${cfRow}`, createDataStyle(ExcelColors.veryLightTeal));
              applyCellStyle(cfSheet, `B${cfRow}`, createAmountStyle(ExcelColors.veryLightTeal));
            } else if (currentActivity === 'investing') {
              applyCellStyle(cfSheet, `A${cfRow}`, createDataStyle(ExcelColors.veryLightOrange));
              applyCellStyle(cfSheet, `B${cfRow}`, createAmountStyle(ExcelColors.veryLightOrange));
            } else if (currentActivity === 'financing') {
              applyCellStyle(cfSheet, `A${cfRow}`, createDataStyle(ExcelColors.veryLightPurple));
              applyCellStyle(cfSheet, `B${cfRow}`, createAmountStyle(ExcelColors.veryLightPurple));
            }
          }
        }
        cfRow++;
      }

      XLSX.utils.book_append_sheet(wb, cfSheet, "Cash Flow Statement");

      // Trial Balance with color formatting
      const trialBalanceData = generateTrialBalanceData(allTransactions, inventory, cash, partners, netIncome);
      const tbSheet = XLSX.utils.aoa_to_sheet(trialBalanceData);

      // Set column widths
      tbSheet['!cols'] = [
        { wch: 35 },  // Account column
        { wch: 18 },  // Debit column
        { wch: 18 }   // Credit column
      ];

      // Merge title (row 1)
      if (!tbSheet['!merges']) tbSheet['!merges'] = [];
      tbSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });

      // Row 1: Title
      applyCellStyle(tbSheet, 'A1', createTitleStyle(ExcelColors.darkBlue));

      // Apply header row style (row 3)
      applyCellStyle(tbSheet, 'A3', createHeaderStyle(ExcelColors.darkBlue));
      applyCellStyle(tbSheet, 'B3', createHeaderStyle(ExcelColors.mediumBlue));
      applyCellStyle(tbSheet, 'C3', createHeaderStyle(ExcelColors.mediumBlue));

      // Apply formatting to data rows
      let tbRow = 4;
      while (tbSheet[`A${tbRow}`]) {
        const cellA = tbSheet[`A${tbRow}`];
        const value = cellA.v?.toString() || '';

        if (value.startsWith('Total') || value.startsWith('TOTAL')) {
          // Total rows - dark blue with white text
          applyCellStyle(tbSheet, `A${tbRow}`, createTotalStyle(ExcelColors.darkBlue));
          applyCellStyle(tbSheet, `B${tbRow}`, createTotalStyle(ExcelColors.darkBlue));
          applyCellStyle(tbSheet, `C${tbRow}`, createTotalStyle(ExcelColors.darkBlue));
        } else {
          // Regular data rows - alternating light gray
          const bgColor = tbRow % 2 === 0 ? ExcelColors.veryLightGray : ExcelColors.white;
          applyCellStyle(tbSheet, `A${tbRow}`, createDataStyle(bgColor));
          applyCellStyle(tbSheet, `B${tbRow}`, createAmountStyle(bgColor));
          applyCellStyle(tbSheet, `C${tbRow}`, createAmountStyle(bgColor));
        }
        tbRow++;
      }

      XLSX.utils.book_append_sheet(wb, tbSheet, "Trial Balance");

      // Inventory Ledger with color formatting
      const inventoryLedgerData = generateInventoryLedgerData(inventory);
      const ilSheet = XLSX.utils.aoa_to_sheet(inventoryLedgerData);

      // Set column widths
      ilSheet['!cols'] = [
        { wch: 25 },  // Item name
        { wch: 15 },  // Type
        { wch: 15 },  // Quantity/Grams
        { wch: 18 },  // Unit Cost
        { wch: 18 }   // Total Value
      ];

      // Merge title (row 1)
      if (!ilSheet['!merges']) ilSheet['!merges'] = [];
      ilSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

      // Row 1: Title
      applyCellStyle(ilSheet, 'A1', createTitleStyle(ExcelColors.darkGreen));

      // Apply header row style (row 3)
      ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell =>
        applyCellStyle(ilSheet, cell, createHeaderStyle(ExcelColors.mediumGreen))
      );

      // Apply formatting to data rows
      let ilRow = 4;
      while (ilSheet[`A${ilRow}`]) {
        const bgColor = ilRow % 2 === 0 ? ExcelColors.lightGreen : ExcelColors.white;
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          if (ilSheet[`${col}${ilRow}`]) {
            applyCellStyle(ilSheet, `${col}${ilRow}`,
              (col === 'D' || col === 'E') ? createAmountStyle(bgColor) : createDataStyle(bgColor)
            );
          }
        });
        ilRow++;
      }

      XLSX.utils.book_append_sheet(wb, ilSheet, "Inventory Ledger");

      // Sales Ledger with color formatting
      const salesLedgerData = generateSalesLedgerData(allTransactions);
      const slSheet = XLSX.utils.aoa_to_sheet(salesLedgerData);

      // Set column widths
      slSheet['!cols'] = [
        { wch: 15 },  // Date
        { wch: 25 },  // Product
        { wch: 15 },  // Quantity
        { wch: 18 },  // Unit Cost
        { wch: 18 },  // Unit Price
        { wch: 18 }   // Total Amount
      ];

      // Merge title (row 1) - from A1 to F1 (6 columns)
      if (!slSheet['!merges']) slSheet['!merges'] = [];
      slSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

      // Row 1: Title
      applyCellStyle(slSheet, 'A1', createTitleStyle(ExcelColors.darkBlue));

      // Apply header row style (row 3)
      ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'].forEach(cell =>
        applyCellStyle(slSheet, cell, createHeaderStyle(ExcelColors.mediumBlue))
      );

      // Apply formatting to data rows
      let slRow = 4;
      while (slSheet[`A${slRow}`] || slSheet[`B${slRow}`] || slSheet[`C${slRow}`] || slSheet[`D${slRow}`] || slSheet[`E${slRow}`] || slSheet[`F${slRow}`]) {
        const cellA = slSheet[`A${slRow}`];
        const value = cellA?.v?.toString() || '';

        if (value.startsWith('Total') || value.startsWith('TOTAL')) {
          // Total rows
          ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
            applyCellStyle(slSheet, `${col}${slRow}`, createTotalStyle(ExcelColors.darkBlue));
          });
        } else {
          // Regular data rows - alternating colors
          const bgColor = slRow % 2 === 0 ? ExcelColors.lightBlue : ExcelColors.white;
          ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
            applyCellStyle(slSheet, `${col}${slRow}`,
              (col === 'D' || col === 'E' || col === 'F') ? createAmountStyle(bgColor) : createDataStyle(bgColor)
            );
          });
        }
        slRow++;
      }

      XLSX.utils.book_append_sheet(wb, slSheet, "Sales Ledger");

      // Write the workbook to a file
      XLSX.writeFile(wb, `Financial_Statements_${formatDate()}.xlsx`, {
        bookType: 'xlsx',
        type: 'binary'
      });

      // Show success dialog
      setShowExportSuccessDialog(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setShowExportErrorDialog(true);
    }
  }, [transactions, inventory, cash, partners]);

  const resetAfterClosingEntry = () => {
    try {
      // NOTE: Closing entries are already created and added by ManualTransactionModal
      // This function only resets the system for the new period

      // 1. Clear all transactions (closing entries were already exported)
      setTransactions([]);
      localStorage.setItem('businessTransactions', JSON.stringify([]));

      // 2. Reset temporary accounts
      setTotalSales(0);
      localStorage.setItem('businessTotalSales', '0');

      // 3. Reset cash flow values for new period
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
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    dbService.updateSettings({ darkMode: newDarkMode });

    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ar' : 'en';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    dbService.updateSettings({ language: newLanguage });

    // Apply RTL for Arabic
    if (newLanguage === 'ar') {
      document.body.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl-mode');
    } else {
      document.body.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl-mode');
    }
  };

  const clearAllData = async () => {
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

      // Clear database
      await dbService.clearAllData();

      // Re-initialize settings
      await dbService.updateSettings({
        cash: 0,
        totalSales: 0,
        darkMode: false,
        language: 'en'
      });

      // Clear localStorage (legacy)
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data. Please try again.');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction({...transaction});
    setShowEditTransactionsModal(true);
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
        updatedTransaction.credit = updatedTransaction.paymentMethod === 'credit'
          ? `Accounts Payable - ${updatedTransaction.creditorName || 'Supplier'} $${updatedTransaction.amount.toFixed(2)}`
          : `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'expense') {
        updatedTransaction.debit = `Expense $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'loss') {
        updatedTransaction.debit = `Loss $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'gain') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Gain $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'withdrawal') {
        updatedTransaction.debit = `Partner ${updatedTransaction.partnerName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'investing') {
        // Extract partner name from old transaction if not present
        const partnerName = updatedTransaction.partnerName || oldTransaction.credit?.match(/^(.+?)\s+Capital\s+\$/)?.[1] || 'Unknown';
        updatedTransaction.partnerName = partnerName;
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `${partnerName} Capital $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'deposit') {
        // Extract partner name from old transaction if not present
        const partnerName = updatedTransaction.partnerName || oldTransaction.credit?.match(/^(.+?)\s+Capital\s+\$/)?.[1] || 'Unknown';
        updatedTransaction.partnerName = partnerName;
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `${partnerName} Capital $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'payable') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Accounts Payable - ${updatedTransaction.creditorName || 'Unknown'} $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'receivable') {
        updatedTransaction.debit = `Accounts Receivable - ${updatedTransaction.debtorName || 'Unknown'} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'create') {
        updatedTransaction.debit = `Inventory ${updatedTransaction.productName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Raw Materials $${updatedTransaction.amount.toFixed(2)}`;
      }

      // Update the transaction
      const updatedTransactions = transactions.map(t =>
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      setTransactions(updatedTransactions);

      // Update cash and inventory based on transaction type
      if (updatedTransaction.type === 'sale') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        setTotalSales(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'purchase') {
        // Handle cash updates based on payment method change
        const wasCashPurchase = oldTransaction.paymentMethod === 'cash';
        const isCashPurchase = updatedTransaction.paymentMethod === 'cash';

        if (wasCashPurchase && !isCashPurchase) {
          // Changed from cash to credit - refund the old amount
          setCash(prev => parseFloat((prev + oldTransaction.amount).toFixed(2)));
        } else if (!wasCashPurchase && isCashPurchase) {
          // Changed from credit to cash - deduct the new amount
          setCash(prev => parseFloat((prev - updatedTransaction.amount).toFixed(2)));
        } else if (wasCashPurchase && isCashPurchase) {
          // Both cash purchases - adjust for amount difference
          setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
        }
        // If both are credit, no cash change needed

        // Update inventory
        const updatedInventory = inventory.map(item => {
          if (item.name === updatedTransaction.productName) {
            const oldValue = oldTransaction.amount;
            const newValue = updatedTransaction.amount;
            const valueDifference = newValue - oldValue;
            const newTotalValue = parseFloat((item.totalValue + valueDifference).toFixed(2));

            // Recalculate unit cost based on new total value
            let newUnitCost = item.unitCost;
            if (item.type === 'oil' && item.grams && item.grams > 0) {
              newUnitCost = parseFloat((newTotalValue / item.grams).toFixed(2));
            } else if (item.quantity > 0) {
              newUnitCost = parseFloat((newTotalValue / item.quantity).toFixed(2));
            }

            return {
              ...item,
              totalValue: newTotalValue,
              unitCost: newUnitCost
            };
          }
          return item;
        });
        setInventory(updatedInventory);
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
      } else if (updatedTransaction.type === 'investing') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        // Extract partner name from credit field - try multiple patterns
        let partnerName = updatedTransaction.partnerName;
        if (!partnerName && updatedTransaction.credit) {
          // Try: "Name Capital $amount"
          const match1 = updatedTransaction.credit.match(/^(.+?)\s+Capital\s+\$/);
          if (match1) partnerName = match1[1];
        }
        console.log('Credit field:', updatedTransaction.credit, 'Extracted partner:', partnerName);

        if (!partnerName) {
          console.error('Cannot determine partner name from transaction');
          return;
        }

        const updatedPartners = partners.map(partner =>
          partner.name === partnerName
            ? { ...partner, capital: parseFloat((partner.capital - oldTransaction.amount + updatedTransaction.amount).toFixed(2)) }
          : partner
        );
        console.log('Updated partners:', updatedPartners);
        setPartners(updatedPartners);
      } else if (updatedTransaction.type === 'deposit') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        const updatedPartners = partners.map(partner =>
          partner.name === updatedTransaction.partnerName
            ? { ...partner, capital: parseFloat((partner.capital - oldTransaction.amount + updatedTransaction.amount).toFixed(2)) }
          : partner
        );
        setPartners(updatedPartners);
      } else if (updatedTransaction.type === 'payable') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'receivable') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'create') {
        // Create transactions don't affect cash, only inventory transformation
        // Update would need complex inventory adjustments - best to prevent editing these
      }

      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Error updating transaction. Please try again.');
    }
  };


  const handleClosingEntries = (entries: Transaction[]) => {
    setTransactions(prev => [...prev, ...entries]);
    saveCurrentState();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2 header-title">{t('businessDashboard')}</h1>
              <p className="text-sm sm:text-base text-secondary header-subtitle">{t('trackInventory')}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={handleUndo}
                disabled={transactionHistory.length === 0}
                variant="outline"
                className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                size="sm"
              >
                <Undo2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('undo')}</span>
              </Button>
              <Button
                onClick={() => setShowManualModal(true)}
                variant="outline"
                className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                size="sm"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">{t('closingEntries')}</span>
              </Button>
              <Button
                onClick={() => handleExportData()}
                variant="outline"
                className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                size="sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">{t('exportAllStatements')}</span>
              </Button>

              <Button
                onClick={showPartnerSetupModal}
                variant="outline"
                className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                size="sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('addPartner')}</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial" size="sm">
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{t('clearData')}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('clearAllData')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('clearDataWarning')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllData} className="bg-red-600 hover:bg-red-700">
                      {t('clearData')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="border-border"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={toggleDarkMode} className="flex items-center gap-2">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? t('lightMode') : t('darkMode')}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={toggleLanguage} className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {language === 'en' ? 'العربية' : 'English'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('cashBalance')}</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${cash.toFixed(2)}</div>
              <p className="text-secondary text-xs">{t('availableCash')}</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('inventoryValue')}</CardTitle>
                <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
                <p className="text-secondary text-xs">{t('totalStockValue')}</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalSales')}</CardTitle>
                <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
                <p className="text-secondary text-xs">{t('cumulativeSales')}</p>
            </CardContent>
          </Card>

          <Card className="bg-card text-primary border-default">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalAssets')}</CardTitle>
                <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${(cash + totalInventoryValue).toFixed(2)}</div>
                <p className="text-secondary text-xs">{t('cashPlusInventory')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Button
              onClick={() => { setTransactionType('purchase'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
            >
              <ShoppingCart className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('purchase')}
          </Button>
            <Button
              onClick={() => { setTransactionType('sale'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
            >
              <DollarSign className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('sell')}
          </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
            >
              <Package className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('create')}
          </Button>
            <Button
              onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
            >
              <CreditCard className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('expenses')}
          </Button>
            <Button
              onClick={() => { setTransactionType('deposit'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
            >
              <ArrowDownCircle className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('deposit')}
          </Button>
            <Button
              onClick={() => { setTransactionType('withdrawal'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
            >
              <ArrowUpCircle className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('withdraw')}
          </Button>
            <Button
              onClick={() => { setTransactionType('gain'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
            >
              <TrendingUp className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('gain')}
          </Button>
            <Button
              onClick={() => { setTransactionType('loss'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
            >
              <TrendingDown className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('loss')}
          </Button>
            <Button
              onClick={() => { setTransactionType('payable'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
            >
              <UserMinus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('accountPayable')}
          </Button>
            <Button
              onClick={() => { setTransactionType('receivable'); setShowTransactionModal(true); }}
              className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
            >
              <UserPlus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('accountReceivable')}
          </Button>
            <Button
              onClick={() => setShowFinancialModal(true)}
              className="h-14 sm:h-16 button-primary font-semibold col-span-2 sm:col-span-3 md:col-span-5 text-sm sm:text-base"
            >
              <FileText className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('financialStatements')}
          </Button>
          </div>

          {/* Current Inventory */}
          <Card className="mb-8 bg-card border-default">
            <CardHeader>
              <CardTitle className="text-primary">{t('currentInventory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-default">
                      <th className="text-left py-3 px-4 font-semibold text-secondary">{t('product')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary">{t('quantity')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary">{t('unitCost')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary">{t('totalValue')}</th>
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
              <CardTitle className="text-primary">{t('recentTransactions')}</CardTitle>
              <Button
                onClick={() => setShowEditTransactionsModal(true)}
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
                          <td>{translateDescription(transaction.description)}</td>
                          <td className="transaction-amount">${transaction.amount.toFixed(2)}</td>
                          <td className="transaction-debit">{translateAccountEntry(transaction.debit)}</td>
                          <td className="transaction-credit">{translateAccountEntry(transaction.credit)}</td>
                          <td>
                            <input
                              type="text"
                              value={transaction.note || ''}
                              onChange={(e) => handleUpdateNote(transaction.id, e.target.value)}
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
                                      handleDeleteTransaction(transaction.id);
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
        </div>

        {/* Modals */}
        <PartnerSetupModal
          isOpen={showPartnerSetup}
          onClose={() => setShowPartnerSetup(false)}
          onSubmit={handlePartnerSetup}
          onDeletePartner={handleDeletePartner}
          language={language}
          existingPartners={partners}
        />

        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          onSubmit={handleTransaction}
          type={transactionType}
          inventory={inventory}
          partners={partners}
          language={language}
        />

        <CreateProductModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProduct}
          inventory={inventory}
          language={language}
        />

        <FinancialStatementsModal
          isOpen={showFinancialModal}
          onClose={() => setShowFinancialModal(false)}
          inventory={inventory}
          transactions={transactions}
          cash={cash}
          partners={partners}
          onClosingEntries={handleClosingEntries}
          language={language}
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
            const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
            const totalCOGS = transactions
              .filter(t => t.type === 'sale' && t.unitCost)
              .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
            const grossProfit = totalRevenue - totalCOGS;
            return grossProfit + totalGains - totalExpenses - totalLosses;
          })()}
          totalRevenue={transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0)}
          totalCOGS={transactions.filter(t => t.type === 'sale' && t.unitCost).reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0)}
          totalLosses={transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0)}
          totalGains={transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0)}
          partners={partners}
          language={language}
        />

        <Dialog open={showEditTransactionsModal} onOpenChange={(open) => {
          setShowEditTransactionsModal(open);
          if (!open) {
            setEditingTransaction(null);
          }
        }}>
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
                    onClick={() => handleSaveEdit(editingTransaction)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {t('saveChanges')}
                  </Button>
                </div>
              )}
          </DialogContent>
        </Dialog>

        {/* Export Success Dialog */}
        <AlertDialog open={showExportSuccessDialog} onOpenChange={setShowExportSuccessDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('exportAllStatements')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('exportSuccessMessage') || 'Financial statements exported successfully!'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowExportSuccessDialog(false)}>
                {t('ok') || 'OK'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Export Error Dialog */}
        <AlertDialog open={showExportErrorDialog} onOpenChange={setShowExportErrorDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('error') || 'Error'}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('exportErrorMessage') || 'Error exporting data. Please try again.'}
                {exportErrorMessage && (
                  <div className="mt-2 text-sm text-destructive">
                    {exportErrorMessage}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowExportErrorDialog(false)}>
                {t('ok') || 'OK'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

