import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import './financialStatementsScrollbar.css';

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
  description: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss' | 'closing' | 'manual';
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

interface FinancialStatementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  transactions: Transaction[];
  cash: number;
  partners: Partner[];
}

export const FinancialStatementsModal = ({ isOpen, onClose, inventory, transactions, cash, partners }: FinancialStatementsModalProps) => {
  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Calculate COGS for sold items
  const totalCOGS = transactions
    .filter(t => t.type === 'sale' && t.unitCost)
    .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);

  const grossProfit = totalRevenue - totalCOGS;

  // Group inventory by type for detailed breakdown
  const inventoryByType = inventory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);

  const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
  const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);

  // Cash Flow Statement calculation
  const totalInitialCapital = partners.reduce((sum, p) => sum + p.capital, 0);
  const totalCashIn = transactions.filter(t => t.type === 'sale' || t.type === 'gain').reduce((sum, t) => sum + t.amount, 0) + totalInitialCapital;
  const totalCashOut = transactions.filter(t => t.type === 'purchase' || t.type === 'expense' || t.type === 'loss' || t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
  const netCashFlow = totalCashIn - totalCashOut;

  const retainedEarnings = grossProfit + totalGains - totalExpenses;

  const handleClose = () => {
    // Perform closing entries
    const closingDate = new Date().toLocaleDateString();
    console.log(`Closing entries for ${closingDate}:`);
    console.log(`Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`Net Income: $${netIncome.toFixed(2)}`);
    console.log(`Closing completed - books are closed for the period`);
    
    onClose();
  };

  const renderTrialBalance = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Account</th>
            <th className="text-right py-2">Debit</th>
            <th className="text-right py-2">Credit</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2">Cash</td>
            <td className="text-right py-2">${cash.toFixed(2)}</td>
            <td className="text-right py-2">-</td>
          </tr>
          
          {/* Detailed Inventory Breakdown */}
          <tr className="border-b font-semibold">
            <td className="py-2">Inventory (Total)</td>
            <td className="text-right py-2">${totalInventoryValue.toFixed(2)}</td>
            <td className="text-right py-2">-</td>
          </tr>
          
          {Object.entries(inventoryByType).map(([type, items]) => (
            <React.Fragment key={type}>
              <tr className="border-b bg-slate-50 dark:bg-slate-800">
                <td className="py-2 pl-4 font-medium">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </td>
                <td className="text-right py-2">
                  ${items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                </td>
                <td className="text-right py-2">-</td>
              </tr>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pl-8 text-sm text-slate-600 dark:text-slate-400">
                    {item.name}
                  </td>
                  <td className="text-right py-2 text-sm">
                    ${item.totalValue.toFixed(2)}
                  </td>
                  <td className="text-right py-2">-</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          <tr className="border-b">
            <td className="py-2">Gross Profit</td>
            <td className="text-right py-2">-</td>
            <td className="text-right py-2">${grossProfit.toFixed(2)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">Expenses</td>
            <td className="text-right py-2">${totalExpenses.toFixed(2)}</td>
            <td className="text-right py-2">-</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">Losses</td>
            <td className="text-right py-2">${totalLosses.toFixed(2)}</td>
            <td className="text-right py-2">-</td>
          </tr>
          <tr className="border-b">
            <td className="py-2">Gains</td>
            <td className="text-right py-2">-</td>
            <td className="text-right py-2">${totalGains.toFixed(2)}</td>
          </tr>
          {partners.map((partner) => (
            <tr key={partner.name} className="border-b">
              <td className="py-2">{partner.name} Capital</td>
              <td className="text-right py-2">-</td>
              <td className="text-right py-2">${partner.capital.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="border-t-2 font-bold">
            <td className="py-2">Total</td>
            <td className="text-right py-2">
              ${(cash + totalInventoryValue + totalExpenses + totalLosses).toFixed(2)}
            </td>
            <td className="text-right py-2">
              ${(grossProfit + totalCapital + totalGains).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderIncomeStatement = () => (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Revenue</h3>
        <div className="flex justify-between">
          <span>Sales Revenue</span>
          <span>${totalRevenue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Gains</span>
          <span>${transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Cost of Goods Sold</h3>
        <div className="flex justify-between">
          <span>COGS</span>
          <span>${totalCOGS.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold mt-2">
          <span>Gross Profit</span>
          <span>${grossProfit.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Operating Expenses</h3>
        <div className="flex justify-between">
          <span>Total Expenses</span>
          <span>${totalExpenses.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="font-bold text-lg">
        <div className="flex justify-between">
          <span>Net Income</span>
          <span>${netIncome.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h3 className="font-semibold mb-4">Assets</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Cash</span>
            <span>${cash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Inventory</span>
            <span>${totalInventoryValue.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 font-semibold">
            <div className="flex justify-between">
              <span>Total Assets</span>
              <span>${(cash + totalInventoryValue).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-4">Liabilities & Equity</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Retained Earnings</span>
            <span>${retainedEarnings.toFixed(2)}</span>
          </div>
          {partners.map((partner) => (
            <div key={partner.name} className="flex justify-between">
              <span>{partner.name} Capital</span>
              <span>${partner.capital.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold">
            <div className="flex justify-between">
              <span>Total Liabilities & Equity</span>
              <span>${(retainedEarnings + totalCapital).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGeneralJournal = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Description</th>
            <th className="text-left py-2">Type</th>
            <th className="text-right py-2">Amount</th>
            <th className="text-right py-2">Debit</th>
            <th className="text-right py-2">Credit</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b">
              <td className="py-2">{transaction.date}</td>
              <td className="py-2">{transaction.description}</td>
              <td className="py-2">{transaction.type}</td>
              <td className="text-right py-2">${transaction.amount.toFixed(2)}</td>
              <td className="text-right py-2">{transaction.debit}</td>
              <td className="text-right py-2">{transaction.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderInventoryLedger = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Product</th>
            <th className="text-left py-2">Type</th>
            <th className="text-right py-2">Quantity</th>
            <th className="text-right py-2">Unit Cost</th>
            <th className="text-right py-2">Total Value</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.name}</td>
              <td className="py-2">{item.type}</td>
              <td className="text-right py-2">
                {item.type === 'oil' ? `${item.grams}g` : item.quantity}
              </td>
              <td className="text-right py-2">${item.unitCost.toFixed(2)}</td>
              <td className="text-right py-2">${item.totalValue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSalesLedger = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Product</th>
            <th className="text-right py-2">Quantity</th>
            <th className="text-right py-2">Unit Price</th>
            <th className="text-right py-2">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions
            .filter(t => t.type === 'sale')
            .map((transaction) => {
              const unitPrice = transaction.quantity ? transaction.amount / transaction.quantity : transaction.amount;
              return (
                <tr key={transaction.id} className="border-b">
                  <td className="py-2">{transaction.date}</td>
                  <td className="py-2">{transaction.productName || 'Unknown'}</td>
                  <td className="text-right py-2">{transaction.quantity || 1}</td>
                  <td className="text-right py-2">${unitPrice.toFixed(2)}</td>
                  <td className="text-right py-2">${transaction.amount.toFixed(2)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );

  const renderCashFlowStatement = () => (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Cash Inflows</h3>
        <div className="flex justify-between">
          <span>Sales</span>
          <span>${transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Gains</span>
          <span>${transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold mt-2">
          <span>Total Inflows (Operating)</span>
          <span>${(totalCashIn - totalInitialCapital).toFixed(2)}</span>
        </div>
      </div>
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Investing Activities</h3>
        <div className="flex justify-between">
          <span>Initial Capital (Partners)</span>
          <span>${totalInitialCapital.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold mt-2">
          <span>Total Investing Inflows</span>
          <span>${totalInitialCapital.toFixed(2)}</span>
        </div>
      </div>
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Cash Outflows</h3>
        <div className="flex justify-between">
          <span>Purchases</span>
          <span>${transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Expenses</span>
          <span>${transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Losses</span>
          <span>${transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Withdrawals</span>
          <span>${transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold mt-2">
          <span>Total Outflows</span>
          <span>${totalCashOut.toFixed(2)}</span>
        </div>
      </div>
      <div className="font-bold text-lg flex justify-between">
        <span>Net Cash Flow</span>
        <span>${netCashFlow.toFixed(2)}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Financial Statements</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="trial-balance" className="w-full">
          <TabsList>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="general-journal">General Journal</TabsTrigger>
            <TabsTrigger value="inventory-ledger">Inventory Ledger</TabsTrigger>
            <TabsTrigger value="sales-ledger">Sales Ledger</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow Statement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trial-balance" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderTrialBalance()}
            </div>
          </TabsContent>
          
          <TabsContent value="income-statement" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderIncomeStatement()}
            </div>
          </TabsContent>
          
          <TabsContent value="balance-sheet" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderBalanceSheet()}
            </div>
          </TabsContent>
          
          <TabsContent value="general-journal" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderGeneralJournal()}
            </div>
          </TabsContent>
          
          <TabsContent value="inventory-ledger" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderInventoryLedger()}
            </div>
          </TabsContent>
          
          <TabsContent value="sales-ledger" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderSalesLedger()}
            </div>
          </TabsContent>
          
          <TabsContent value="cash-flow" className="mt-4">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderCashFlowStatement()}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
