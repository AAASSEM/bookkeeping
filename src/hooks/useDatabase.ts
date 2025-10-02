import { useState, useEffect } from 'react';
import { dbService, migrateFromLocalStorage, Transaction, InventoryItem, Partner } from '@/db/database';

export function useDatabase() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [cash, setCash] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database and load data
  useEffect(() => {
    async function initDatabase() {
      try {
        // Migrate from localStorage if needed
        await migrateFromLocalStorage();

        // Load all data from database
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
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsLoading(false);
      }
    }

    initDatabase();
  }, []);

  // Sync functions
  const syncTransactions = async (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    await dbService.bulkUpdateTransactions(newTransactions);
  };

  const addTransaction = async (transaction: Transaction) => {
    const id = await dbService.addTransaction(transaction);
    const updated = await dbService.getAllTransactions();
    setTransactions(updated);
    return id;
  };

  const updateTransaction = async (id: string, changes: Partial<Transaction>) => {
    await dbService.updateTransaction(id, changes);
    const updated = await dbService.getAllTransactions();
    setTransactions(updated);
  };

  const deleteTransaction = async (id: string) => {
    await dbService.deleteTransaction(id);
    const updated = await dbService.getAllTransactions();
    setTransactions(updated);
  };

  const syncInventory = async (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    await dbService.bulkUpdateInventory(newInventory);
  };

  const syncPartners = async (newPartners: Partner[]) => {
    setPartners(newPartners);
    await dbService.bulkUpdatePartners(newPartners);
  };

  const updateCash = async (newCash: number) => {
    setCash(newCash);
    await dbService.updateSettings({ cash: newCash });
  };

  const updateTotalSales = async (newTotalSales: number) => {
    setTotalSales(newTotalSales);
    await dbService.updateSettings({ totalSales: newTotalSales });
  };

  const updateDarkMode = async (newDarkMode: boolean) => {
    setDarkMode(newDarkMode);
    await dbService.updateSettings({ darkMode: newDarkMode });
  };

  const updateLanguage = async (newLanguage: 'en' | 'ar') => {
    setLanguage(newLanguage);
    await dbService.updateSettings({ language: newLanguage });
  };

  return {
    // State
    transactions,
    inventory,
    partners,
    cash,
    totalSales,
    darkMode,
    language,
    isLoading,

    // Setters with DB sync
    setTransactions: syncTransactions,
    setInventory: syncInventory,
    setPartners: syncPartners,
    setCash: updateCash,
    setTotalSales: updateTotalSales,
    setDarkMode: updateDarkMode,
    setLanguage: updateLanguage,

    // CRUD operations
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
}
