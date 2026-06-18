import type { Transaction } from '@/types';

export interface IncomeStatementTotals {
  totalRevenue: number;
  totalExpenses: number;
  totalGains: number;
  totalLosses: number;
  totalCOGS: number;
  grossProfit: number;
  netIncome: number;
}

// Central income-statement math derived from the transaction journal.
// COGS counts only sales that carry a unitCost, valued at unitCost * (quantity || 1).
export const calculateIncomeStatement = (transactions: Transaction[]): IncomeStatementTotals => {
  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
  const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
  const totalCOGS = transactions
    .filter(t => t.type === 'sale' && t.unitCost)
    .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netIncome = grossProfit + totalGains - totalExpenses - totalLosses;

  return { totalRevenue, totalExpenses, totalGains, totalLosses, totalCOGS, grossProfit, netIncome };
};
