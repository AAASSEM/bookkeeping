import { useState, useEffect, useRef } from 'react';
import { dbService, migrateFromLocalStorage } from '@/db/database';
import type { Transaction, InventoryItem, Partner } from '@/types';
import type { Language } from '@/utils/translations';

// Owns all bookkeeping domain state plus its persistence to IndexedDB (via dbService)
// and the legacy localStorage mirror. Returns raw React setters so callers can keep using
// functional updaters (setX(prev => ...)).
export function useBookkeeping() {
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

  // Track if initial load is complete
  const isInitialLoadRef = useRef(true);

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

  return {
    // State
    darkMode,
    language,
    isLoading,
    cash,
    cashFlow,
    totalSales,
    inventory,
    transactions,
    partners,

    // Raw setters (support functional updaters)
    setDarkMode,
    setLanguage,
    setCash,
    setCashFlow,
    setTotalSales,
    setInventory,
    setTransactions,
    setPartners,

    // Helpers
    toggleDarkMode,
    toggleLanguage,
    clearAllData,
    resetAfterClosingEntry,
  };
}
