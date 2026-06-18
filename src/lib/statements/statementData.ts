import type { Transaction, InventoryItem, Partner } from '@/types';
import { calculateIncomeStatement } from './financialCalculations';

// Helper functions to generate data for Excel sheets
export const generateIncomeStatementData = (transactions: Transaction[]) => {
  const { totalRevenue, totalExpenses, totalGains, totalLosses, totalCOGS, grossProfit, netIncome } = calculateIncomeStatement(transactions);
  const totalprofitability = grossProfit + totalGains;

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

export const generateBalanceSheetData = (inventory: InventoryItem[], cash: number, partners: Partner[], netIncome: number, transactions: Transaction[]) => {
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

export const generateGeneralJournalData = (transactions: Transaction[]) => {
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

export const generateInventoryLedgerData = (inventory: InventoryItem[]) => {
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

export const generateSalesLedgerData = (transactions: Transaction[]) => {
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

export const generateCashFlowStatementData = (transactions: Transaction[], currentCash: number, partners: Partner[]) => {
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

export const generateTrialBalanceData = (transactions: Transaction[], inventory: InventoryItem[], cash: number, partners: Partner[], netIncome: number) => {
  const { totalExpenses, totalGains, totalLosses, grossProfit } = calculateIncomeStatement(transactions);
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
