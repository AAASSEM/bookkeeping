import { useState, useEffect, useCallback } from 'react';
import './dashboardTheme.css';
import { ManualTransactionModal } from './ManualTransactionModal';
import { TransactionModal } from './TransactionModal';
import { FinancialStatementsModal } from './FinancialStatementsModal';
import { CreateProductModal } from './CreateProductModal';
import { PartnerSetupModal } from './PartnerSetupModal';
import { useTranslation } from '@/utils/translations';
import { exportFinancialStatements } from '@/lib/statements/excelExport';
import { calculateIncomeStatement } from '@/lib/statements/financialCalculations';
import { useBookkeeping } from '@/hooks/useBookkeeping';
import { useTransactionActions } from '@/hooks/useTransactionActions';
import type { Transaction } from '@/types';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { StatCards } from './dashboard/StatCards';
import { TransactionActionButtons } from './dashboard/TransactionActionButtons';
import { InventoryTable } from './dashboard/InventoryTable';
import { RecentTransactionsTable } from './dashboard/RecentTransactionsTable';
import { EditTransactionsDialog } from './dashboard/EditTransactionsDialog';
import { ExportStatusDialogs } from './dashboard/ExportStatusDialogs';

export const Dashboard = () => {
  const {
    darkMode,
    language,
    isLoading,
    cash, setCash,
    totalSales, setTotalSales,
    inventory, setInventory,
    transactions, setTransactions,
    partners, setPartners,
    toggleDarkMode,
    toggleLanguage,
    clearAllData,
    resetAfterClosingEntry,
  } = useBookkeeping();

  const { t } = useTranslation(language);

  // UI state (modal visibility, in-flight edit, export dialogs)
  const [showPartnerSetup, setShowPartnerSetup] = useState(false);
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

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const incomeStatement = calculateIncomeStatement(transactions);

  const {
    transactionHistory,
    handlePartnerSetup,
    handleDeletePartner,
    handleTransaction,
    handleCreateProduct,
    handleUndo,
    handleDeleteTransaction,
    handleUpdateNote,
    handleManualTransaction,
    handleSaveEdit,
    handleClosingEntries,
  } = useTransactionActions({
    transactions,
    cash,
    inventory,
    partners,
    totalSales,
    setTransactions,
    setCash,
    setInventory,
    setPartners,
    setTotalSales,
    setShowPartnerSetup,
    setShowTransactionModal,
    setShowCreateModal,
    setShowManualModal,
    setEditingTransaction,
  });

  // Check if partners are set up (after loading)
  useEffect(() => {
    if (!isLoading && partners.length === 0) {
      setShowPartnerSetup(true);
    }
  }, [isLoading, partners.length]);

  const handleExportData = useCallback((additionalTransactions?: Transaction[]) => {
    try {
      exportFinancialStatements({ transactions, inventory, cash, partners, additionalTransactions });
      setShowExportSuccessDialog(true);
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setShowExportErrorDialog(true);
    }
  }, [transactions, inventory, cash, partners]);

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
          <DashboardHeader
            t={t}
            darkMode={darkMode}
            language={language}
            undoDisabled={transactionHistory.length === 0}
            onUndo={handleUndo}
            onOpenClosingEntries={() => setShowManualModal(true)}
            onExport={() => handleExportData()}
            onAddPartner={() => setShowPartnerSetup(true)}
            onClearData={clearAllData}
            onToggleDarkMode={toggleDarkMode}
            onToggleLanguage={toggleLanguage}
          />

          <StatCards
            t={t}
            cash={cash}
            totalInventoryValue={totalInventoryValue}
            totalSales={totalSales}
          />

          <TransactionActionButtons
            t={t}
            onSelectTransactionType={(type) => { setTransactionType(type); setShowTransactionModal(true); }}
            onCreateProduct={() => setShowCreateModal(true)}
            onOpenFinancialStatements={() => setShowFinancialModal(true)}
          />

          <InventoryTable t={t} inventory={inventory} />

          <RecentTransactionsTable
            t={t}
            language={language}
            transactions={transactions}
            onEditTransactions={() => setShowEditTransactionsModal(true)}
            onUpdateNote={handleUpdateNote}
            onDeleteTransaction={handleDeleteTransaction}
          />
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
          netIncome={incomeStatement.netIncome}
          totalRevenue={incomeStatement.totalRevenue}
          totalCOGS={incomeStatement.totalCOGS}
          totalLosses={incomeStatement.totalLosses}
          totalGains={incomeStatement.totalGains}
          partners={partners}
          language={language}
        />

        <EditTransactionsDialog
          t={t}
          open={showEditTransactionsModal}
          onOpenChange={(open) => {
            setShowEditTransactionsModal(open);
            if (!open) {
              setEditingTransaction(null);
            }
          }}
          transactions={transactions}
          editingTransaction={editingTransaction}
          setEditingTransaction={setEditingTransaction}
          onSave={handleSaveEdit}
        />

        <ExportStatusDialogs
          t={t}
          showSuccess={showExportSuccessDialog}
          onSuccessOpenChange={setShowExportSuccessDialog}
          showError={showExportErrorDialog}
          onErrorOpenChange={setShowExportErrorDialog}
          exportErrorMessage={exportErrorMessage}
        />
      </div>
    </div>
  );
};
