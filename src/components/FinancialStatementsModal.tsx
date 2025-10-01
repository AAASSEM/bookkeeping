import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import './financialStatementsScrollbar.css';
import { Transaction } from '@/types';
import { useTranslation, type Language } from '@/utils/translations';

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
  onClosingEntries: (entries: Transaction[]) => void;
  language: Language;
}

export const FinancialStatementsModal = ({ isOpen, onClose, inventory, transactions, cash, partners, onClosingEntries, language }: FinancialStatementsModalProps) => {
  const { t } = useTranslation(language);
  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalGains = transactions.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0);
  const totalLosses = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate COGS for sold items
  const totalCOGS = transactions
    .filter(t => t.type === 'sale' && t.unitCost)
    .reduce((sum, t) => sum + (t.unitCost! * (t.quantity || 1)), 0);

  // Calculate net income once at the top level
  const grossProfit = totalRevenue - totalCOGS;
  const totalprofitability = grossProfit + totalGains;
  const netIncome = totalprofitability - totalExpenses - totalLosses;

  // Group inventory by type for detailed breakdown
  const inventoryByType = inventory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCapital = partners.reduce((sum, p) => sum + p.capital, 0);

  // Cash Flow Statement calculation
  const totalInitialCapital = partners.reduce((sum, p) => sum + p.capital, 0);
  
  const renderCashFlowStatement = () => {
    // OPERATING ACTIVITIES
    const cashFromSales = transactions
      .filter(t => t.type === 'sale' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const cashFromGains = transactions
      .filter(t => t.type === 'gain' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Purchases (only cash paid out)
    const cashPaidForPurchases = transactions
      .filter(t => t.type === 'purchase' )
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
    const beginningCashBalance = cash - netChangeInCash;

    console.log('All transactions:', transactions);
    console.log('Purchase transactions:', transactions.filter(t => t.type === 'purchase'));

    return (
      <div className="space-y-4">
        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">{t('cashFlowFromOperatingActivities')}</h3>
          <div className="flex justify-between">
            <span>{t('cashFromSales')}</span>
            <span>${(Number(cashFromSales) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('cashFromGains')}</span>
            <span>${(Number(cashFromGains) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('cashPaidForPurchases')}</span>
            <span>${(Number(cashPaidForPurchases) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('cashPaidForExpenses')}</span>
            <span>${(Number(cashPaidForExpenses) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('cashPaidForLosses')}</span>
            <span>${(Number(cashPaidForLosses) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold mt-2">
            <span>{t('netCashFlowFromOperatingActivities')}</span>
            <span>${(Number(netCashFromOperatingActivities) || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">{t('cashFlowFromInvestingActivities')}</h3>
          <div className="flex justify-between">
            <span>{t('noInvestingActivities')}</span>
            <span>${(Number(netCashFromInvestingActivities) || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">{t('cashFlowFromFinancingActivities')}</h3>
          <div className="flex justify-between">
            <span>{t('capitalContributions')}</span>
            <span>${(Number(cashFromCapitalContributions) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('cashPaidForWithdrawals')}</span>
            <span>${(Number(cashPaidForWithdrawals) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold mt-2">
            <span>{t('netCashFlowFromFinancingActivities')}</span>
            <span>${(Number(netCashFromFinancingActivities) || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between">
            <span>{t('beginningCashBalance')}</span>
            <span>${(Number(beginningCashBalance) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2">
            <span>{t('netChangeInCash')}</span>
            <span>${(Number(netChangeInCash) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2">
            <span>{t('endingCashBalance')}</span>
            <span>${(Number(cash) || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleClose = () => {
    // Perform closing entries
    const closingDate = new Date().toLocaleDateString();
    
    // Create closing entries using the netIncome calculated at the top
    const closingEntries: Transaction[] = [
      // Close Net Income to Income Summary
      {
        id: `closing-net-income-${Date.now()}`,
        date: closingDate,
        type: 'closing',
        description: 'Closing Entry - Net Income to Income Summary',
        amount: Math.abs(netIncome),
        debit: netIncome > 0 ? 'Net Income' : 'Income Summary',
        credit: netIncome > 0 ? 'Income Summary' : 'Net Income'
      },
      // Close Income Summary to Partner Capital
      {
        id: `closing-income-summary-${Date.now()}`,
        date: closingDate,
        type: 'closing',
        description: 'Closing Entry - Income Summary to Partner Capital',
        amount: Math.abs(netIncome),
        debit: netIncome > 0 ? 'Income Summary' : 'Partner Capital',
        credit: netIncome > 0 ? 'Partner Capital' : 'Income Summary'
      }
    ];

    // Log closing entries
    console.log(`Closing entries for ${closingDate}:`);
    console.log(`Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Gains: $${totalGains.toFixed(2)}`);
    console.log(`Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`Losses: $${totalLosses.toFixed(2)}`);
    console.log(`Net Income: $${netIncome.toFixed(2)}`);
    console.log(`Closing completed - books are closed for the period`);
    
    // Pass closing entries to parent component
    onClosingEntries(closingEntries);
    onClose();
  };

  const renderTrialBalance = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-4">{t('account')}</th>
            <th className="text-right py-2 px-4">{t('debit')}</th>
            <th className="text-right py-2 px-4">{t('credit')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2 px-4">{t('cash')}</td>
            <td className="text-right py-2 px-4">${cash.toFixed(2)}</td>
            <td className="text-right py-2 px-4">-</td>
          </tr>
          
          {/* Detailed Inventory Breakdown */}
          <tr className="border-b font-semibold">
            <td className="py-2 px-4">{t('inventory')} ({t('total')})</td>
            <td className="text-right py-2 px-4">${totalInventoryValue.toFixed(2)}</td>
            <td className="text-right py-2 px-4">-</td>
          </tr>
          
          {Object.entries(inventoryByType).map(([type, items]) => (
            <React.Fragment key={type}>
              <tr className="border-b bg-slate-50 dark:bg-slate-800">
                <td className="py-2 pl-4 font-medium">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </td>
                <td className="text-right py-2 px-4">
                  ${items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                </td>
                <td className="text-right py-2 px-4">-</td>
              </tr>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pl-8 text-sm text-slate-600 dark:text-slate-400">
                    {item.name}
                  </td>
                  <td className="text-right py-2 px-4 text-sm">
                    ${item.totalValue.toFixed(2)}
                  </td>
                  <td className="text-right py-2 px-4">-</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          <tr className="border-b">
            <td className="py-2 px-4">{t('grossProfit')}</td>
            <td className="text-right py-2 px-4">-</td>
            <td className="text-right py-2 px-4">${grossProfit.toFixed(2)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-4">{t('expenses')}</td>
            <td className="text-right py-2 px-4">${totalExpenses.toFixed(2)}</td>
            <td className="text-right py-2 px-4">-</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-4">{t('losses')}</td>
            <td className="text-right py-2 px-4">${totalLosses.toFixed(2)}</td>
            <td className="text-right py-2 px-4">-</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-4">{t('gains')}</td>
            <td className="text-right py-2 px-4">-</td>
            <td className="text-right py-2 px-4">${totalGains.toFixed(2)}</td>
          </tr>
          {partners.map((partner) => (
            <tr key={partner.name} className="border-b">
              <td className="py-2 px-4">{partner.name} {t('capital')}</td>
              <td className="text-right py-2 px-4">-</td>
              <td className="text-right py-2 px-4">${partner.capital.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="border-t-2 font-bold">
            <td className="py-2 px-4">{t('total')}</td>
            <td className="text-right py-2 px-4">
              ${(cash + totalInventoryValue + totalExpenses + totalLosses).toFixed(2)}
            </td>
            <td className="text-right py-2 px-4">
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
        <h3 className="font-semibold mb-2">{t('revenue')}</h3>
        <div className="flex justify-between">
          <span>{t('salesRevenue')}</span>
          <span>${totalRevenue.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">{t('costOfGoodsSold')}</h3>
        <div className="flex justify-between">
          <span>{t('cogs')}</span>
          <span>${totalCOGS.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>{t('grossProfit')}</span>
          <span>${grossProfit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('gains')}</span>
          <span>${totalGains.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('totalProfitability')}</span>
          <span><h3>${totalprofitability.toFixed(2)}</h3></span>
        </div>
      </div>
      
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">{t('operatingExpenses')}</h3>
        <div className="flex justify-between">
          <span>{t('expenses')}</span>
          <span>${totalExpenses.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('losses')}</span>
          <span>${totalLosses.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between font-bold">
          <span>{t('netIncome')}</span>
          <span>${netIncome.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h3 className="font-semibold mb-4">{t('assets')}</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>{t('cash')}</span>
            <span>${cash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('inventory')}</span>
            <span>${totalInventoryValue.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 font-semibold">
            <div className="flex justify-between">
            <span>{t('totalAssets')}</span>
            <span>${(cash + totalInventoryValue).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-4">{t('liabilitiesEquity')}</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>{t('retainedEarnings')}</span>
            <span>${netIncome.toFixed(2)}</span>
          </div>
          {partners.map((partner) => (
            <div key={partner.name} className="flex justify-between">
              <span>{partner.name} {t('capital')}</span>
              <span>${partner.capital.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold">
          <div className="flex justify-between">
              <span>{t('totalLiabilitiesEquity')}</span>
              <span>${(netIncome + totalCapital).toFixed(2)}</span>
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
            <th className="text-left py-2">{t('date')}</th>
            <th className="text-left py-2">{t('description')}</th>
            <th className="text-left py-2">{t('type')}</th>
            <th className="text-right py-2">{t('amount')}</th>
            <th className="text-right py-2">{t('debit')}</th>
            <th className="text-right py-2">{t('credit')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b">
              <td className="py-2 px-4">{transaction.date}</td>
              <td className="py-2 px-4">{transaction.description}</td>
              <td className="py-2 px-4">{transaction.type}</td>
              <td className="text-right py-2 px-4">${transaction.amount.toFixed(2)}</td>
              <td className="text-right py-2 px-4">{transaction.debit}</td>
              <td className="text-right py-2 px-4">{transaction.credit}</td>
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
            <th className="text-left py-2">{t('product')}</th>
            <th className="text-left py-2">{t('type')}</th>
            <th className="text-right py-2">{t('quantity')}</th>
            <th className="text-right py-2">{t('unitCost')}</th>
            <th className="text-right py-2">{t('totalValue')}</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 px-4">{item.name}</td>
              <td className="py-2 px-4">{item.type}</td>
              <td className="text-right py-2 px-4">
                {item.type === 'oil' ? `${item.grams}g` : item.quantity}
              </td>
              <td className="text-right py-2 px-4">${item.unitCost.toFixed(2)}</td>
              <td className="text-right py-2 px-4">${item.totalValue.toFixed(2)}</td>
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
            <th className="text-left py-2">{t('date')}</th>
            <th className="text-left py-2">{t('product')}</th>
            <th className="text-right py-2">{t('quantity')}</th>
            <th className="text-right py-2">{t('unitPrice')}</th>
            <th className="text-right py-2">{t('totalAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions
            .filter(t => t.type === 'sale')
            .map((transaction) => {
              const unitPrice = transaction.quantity ? transaction.amount / transaction.quantity : transaction.amount;
              return (
                <tr key={transaction.id} className="border-b">
                  <td className="py-2 px-4">{transaction.date}</td>
                  <td className="py-2 px-4">{transaction.productName || t('unknown')}</td>
                  <td className="text-right py-2 px-4">{transaction.quantity || 1}</td>
                  <td className="text-right py-2 px-4">${unitPrice.toFixed(2)}</td>
                  <td className="text-right py-2 px-4">${transaction.amount.toFixed(2)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('financialStatements')}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="trial-balance" className="w-full">
          <TabsList>
            <TabsTrigger value="trial-balance">{t('trialBalance')}</TabsTrigger>
            <TabsTrigger value="income-statement">{t('incomeStatement')}</TabsTrigger>
            <TabsTrigger value="balance-sheet">{t('balanceSheet')}</TabsTrigger>
            <TabsTrigger value="general-journal">{t('generalJournal')}</TabsTrigger>
            <TabsTrigger value="inventory-ledger">{t('inventoryLedger')}</TabsTrigger>
            <TabsTrigger value="sales-ledger">{t('salesLedger')}</TabsTrigger>
            <TabsTrigger value="cash-flow">{t('cashFlowStatement')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trial-balance">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderTrialBalance()}
            </div>
          </TabsContent>
          
          <TabsContent value="income-statement">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderIncomeStatement()}
            </div>
          </TabsContent>
          
          <TabsContent value="balance-sheet">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderBalanceSheet()}
            </div>
          </TabsContent>
          
          <TabsContent value="general-journal">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderGeneralJournal()}
            </div>
          </TabsContent>
          
          <TabsContent value="inventory-ledger">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderInventoryLedger()}
            </div>
          </TabsContent>
          
          <TabsContent value="sales-ledger">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderSalesLedger()}
            </div>
          </TabsContent>
          
          <TabsContent value="cash-flow">
            <div className="bg-card rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {renderCashFlowStatement()}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
