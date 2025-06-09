import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from 'xlsx';

interface FinancialStatementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
  inventory: any[];
  partners: { name: string; capital: number }[];
}

export const FinancialStatementsModal = ({ isOpen, onClose, transactions, inventory, partners }: FinancialStatementsModalProps) => {
  const [closingEntries, setClosingEntries] = useState<any[]>([]);

  const calculateRevenue = () => {
    return transactions
      .filter(transaction => transaction.type === 'sale')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const calculateExpenses = () => {
    return transactions
      .filter(transaction => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const calculateCostOfGoodsSold = () => {
    return transactions
      .filter(transaction => transaction.type === 'production')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const calculateNetIncome = () => {
    const revenue = calculateRevenue();
    const expenses = calculateExpenses();
    const costOfGoodsSold = calculateCostOfGoodsSold();
    return revenue - expenses - costOfGoodsSold;
  };

  const calculateTotalAssets = () => {
    let inventoryValue = inventory.reduce((sum, item) => {
      if (item.type === 'oil') {
        return sum + (item.grams * item.unitCost);
      } else if (item.type !== 'box') {
        return sum + (item.quantity * item.unitCost);
      } else {
        return sum + 0;
      }
    }, 0);

    const cashBalance = transactions.reduce((sum, transaction) => {
      if (transaction.credit && transaction.credit.includes('Cash')) {
        return sum + transaction.amount;
      } else if (transaction.debit && transaction.debit.includes('Cash')) {
        return sum - transaction.amount;
      }
      return sum;
    }, 0);

    return inventoryValue + cashBalance;
  };

  const calculateTotalLiabilitiesAndEquity = () => {
    let totalEquity = partners.reduce((sum, partner) => sum + partner.capital, 0);
    const netIncome = calculateNetIncome();
    totalEquity += netIncome;
    return totalEquity;
  };

  const generateIncomeStatementData = () => {
    return [
      { label: 'Revenue', value: calculateRevenue() },
      { label: 'Cost of Goods Sold', value: calculateCostOfGoodsSold() },
      { label: 'Gross Profit', value: calculateRevenue() - calculateCostOfGoodsSold() },
      { label: 'Expenses', value: calculateExpenses() },
      { label: 'Net Income', value: calculateNetIncome() },
    ];
  };

  const generateBalanceSheetData = () => {
    return [
      { label: 'Total Assets', value: calculateTotalAssets() },
      { label: 'Total Liabilities & Equity', value: calculateTotalLiabilitiesAndEquity() },
    ];
  };

  const handleCloseBooks = () => {
    const netIncome = calculateNetIncome();

    // Create closing entries
    const newClosingEntries = [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        type: 'closing',
        description: 'Close Revenue to Retained Earnings',
        amount: calculateRevenue(),
        debit: `Revenue $${calculateRevenue().toFixed(2)}`,
        credit: `Retained Earnings $${calculateRevenue().toFixed(2)}`
      },
      {
        id: Date.now() + 1,
        date: new Date().toLocaleDateString(),
        type: 'closing',
        description: 'Close Expenses to Retained Earnings',
        amount: calculateExpenses(),
        debit: `Retained Earnings $${calculateExpenses().toFixed(2)}`,
        credit: `Expenses $${calculateExpenses().toFixed(2)}`
      },
      {
        id: Date.now() + 2,
        date: new Date().toLocaleDateString(),
        type: 'closing',
        description: 'Close Cost of Goods Sold to Retained Earnings',
        amount: calculateCostOfGoodsSold(),
        debit: `Retained Earnings $${calculateCostOfGoodsSold().toFixed(2)}`,
        credit: `Cost of Goods Sold $${calculateCostOfGoodsSold().toFixed(2)}`
      }
    ];

    setClosingEntries(newClosingEntries);
    alert('Books closed! Closing entries generated.');
  };

  const exportToExcel = () => {
    const incomeStatementData = generateIncomeStatementData();
    const balanceSheetData = generateBalanceSheetData();

    const wb = XLSX.utils.book_new();

    const incomeStatementWS = XLSX.utils.json_to_sheet(
      incomeStatementData.map(item => ({ Label: item.label, Value: item.value }))
    );
    XLSX.utils.book_append_sheet(wb, incomeStatementWS, 'Income Statement');

    const balanceSheetWS = XLSX.utils.json_to_sheet(
      balanceSheetData.map(item => ({ Label: item.label, Value: item.value }))
    );
    XLSX.utils.book_append_sheet(wb, balanceSheetWS, 'Balance Sheet');

    XLSX.writeFile(wb, 'financial_statements.xlsx');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Financial Statements
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="income" className="w-full">
          <TabsList>
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
          </TabsList>
          <TabsContent value="income">
            <h2 className="text-xl font-semibold mb-4">Income Statement</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>Revenue:</div>
              <div>${calculateRevenue().toFixed(2)}</div>
              <div>Cost of Goods Sold:</div>
              <div>${calculateCostOfGoodsSold().toFixed(2)}</div>
              <div>Gross Profit:</div>
              <div>${(calculateRevenue() - calculateCostOfGoodsSold()).toFixed(2)}</div>
              <div>Expenses:</div>
              <div>${calculateExpenses().toFixed(2)}</div>
              <div>Net Income:</div>
              <div>${calculateNetIncome().toFixed(2)}</div>
            </div>
          </TabsContent>
          <TabsContent value="balance">
            <h2 className="text-xl font-semibold mb-4">Balance Sheet</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>Total Assets:</div>
              <div>${calculateTotalAssets().toFixed(2)}</div>
              <div>Total Liabilities & Equity:</div>
              <div>${calculateTotalLiabilitiesAndEquity().toFixed(2)}</div>
            </div>
          </TabsContent>
          <TabsContent value="transactions">
            <h2 className="text-xl font-semibold mb-4">Transactions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{transaction.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{transaction.type}</td>
                      <td className="px-6 py-4">{transaction.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${transaction.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">{transaction.debit}</td>
                      <td className="px-6 py-4">{transaction.credit}</td>
                    </tr>
                  ))}
                  {closingEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{entry.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{entry.type}</td>
                      <td className="px-6 py-4">{entry.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${entry.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">{entry.debit}</td>
                      <td className="px-6 py-4">{entry.credit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="inventory">
            <h2 className="text-xl font-semibold mb-4">Inventory</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === 'oil' ? item.grams : item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">${item.unitCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="partners">
            <h2 className="text-xl font-semibold mb-4">Partners</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capital
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {partners.map((partner) => (
                    <tr key={partner.name}>
                      <td className="px-6 py-4 whitespace-nowrap">{partner.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${partner.capital.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-3 pt-4">
          <Button onClick={handleCloseBooks} variant="outline" className="flex-1">
            Close Books
          </Button>
          <Button onClick={exportToExcel} className="flex-1 bg-primary hover:bg-primary/90">
            Export to Excel
          </Button>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
