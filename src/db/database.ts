import Dexie, { Table } from 'dexie';

// TypeScript interfaces for database tables
export interface Transaction {
  id: string;
  date: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss' | 'closing' | 'manual' | 'investing' | 'deposit' | 'payable' | 'receivable';
  description: string;
  amount: number;
  debit: string;
  credit: string;
  paymentMethod?: 'cash' | 'credit' | 'other';
  productName?: string;
  partnerName?: string;
  creditorName?: string;
  debtorName?: string;
  customerName?: string;
  orderNumber?: string;
  note?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  type: 'oil' | 'bottles' | 'box' | 'other' | 'created';
  grams?: number;
  milliliters?: number;
  sellingPrice?: number;
}

export interface Partner {
  id?: string;
  name: string;
  capital: number;
}

export interface AppSettings {
  id?: string;
  darkMode: boolean;
  language: 'en' | 'ar';
  cash: number;
  totalSales: number;
}

// Database class
export class BusinessDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  inventory!: Table<InventoryItem, string>;
  partners!: Table<Partner, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('BusinessDatabase');

    this.version(1).stores({
      transactions: 'id, date, type, productName, partnerName',
      inventory: 'id, name, type',
      partners: 'id, name',
      settings: 'id'
    });
  }
}

// Create and export database instance
export const db = new BusinessDatabase();

// Migration function from localStorage to IndexedDB
export async function migrateFromLocalStorage() {
  try {
    console.log('Checking for migration from localStorage to IndexedDB...');

    // Migrate transactions if not already done
    const existingTransactions = await db.transactions.count();
    const transactionsData = localStorage.getItem('businessTransactions');
    if (existingTransactions === 0 && transactionsData) {
      const transactions = JSON.parse(transactionsData);
      await db.transactions.bulkPut(transactions);
      console.log(`Migrated ${transactions.length} transactions`);
    }

    // Migrate inventory if not already done
    const existingInventory = await db.inventory.count();
    const inventoryData = localStorage.getItem('businessInventory');
    if (existingInventory === 0 && inventoryData) {
      const inventory = JSON.parse(inventoryData);
      await db.inventory.bulkPut(inventory);
      console.log(`Migrated ${inventory.length} inventory items`);
    }

    // Migrate partners if not already done
    const existingPartners = await db.partners.count();
    const partnersData = localStorage.getItem('businessPartners');
    if (existingPartners === 0 && partnersData) {
      const partners = JSON.parse(partnersData);
      await db.partners.bulkPut(partners);
      console.log(`Migrated ${partners.length} partners`);
    }

    // Migrate settings if not already done
    const existingSettings = await db.settings.get('app-settings');
    if (!existingSettings) {
      const darkMode = localStorage.getItem('darkMode') === 'true';
      const language = (localStorage.getItem('language') || 'en') as 'en' | 'ar';
      const cash = parseFloat(localStorage.getItem('businessCash') || '0');
      const totalSales = parseFloat(localStorage.getItem('totalSales') || '0');

      await db.settings.add({
        id: 'app-settings',
        darkMode,
        language,
        cash,
        totalSales
      });
      console.log('Migrated settings');
    }

    console.log('Migration check completed!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Helper functions for CRUD operations
export const dbService = {
  // Transactions
  async getAllTransactions() {
    return await db.transactions.toArray();
  },

  async addTransaction(transaction: Transaction) {
    return await db.transactions.add(transaction);
  },

  async updateTransaction(id: string, changes: Partial<Transaction>) {
    return await db.transactions.update(id, changes);
  },

  async deleteTransaction(id: string) {
    return await db.transactions.delete(id);
  },

  async bulkAddTransactions(transactions: Transaction[]) {
    return await db.transactions.bulkAdd(transactions);
  },

  async bulkUpdateTransactions(transactions: Transaction[]) {
    return await db.transactions.bulkPut(transactions);
  },

  // Inventory
  async getAllInventory() {
    return await db.inventory.toArray();
  },

  async addInventoryItem(item: InventoryItem) {
    return await db.inventory.add(item);
  },

  async updateInventoryItem(id: string, changes: Partial<InventoryItem>) {
    return await db.inventory.update(id, changes);
  },

  async deleteInventoryItem(id: string) {
    return await db.inventory.delete(id);
  },

  async bulkUpdateInventory(items: InventoryItem[]) {
    return await db.inventory.bulkPut(items);
  },

  // Partners
  async getAllPartners() {
    return await db.partners.toArray();
  },

  async addPartner(partner: Partner) {
    return await db.partners.add(partner);
  },

  async updatePartner(id: string, changes: Partial<Partner>) {
    return await db.partners.update(id, changes);
  },

  async deletePartner(id: string) {
    return await db.partners.delete(id);
  },

  async bulkUpdatePartners(partners: Partner[]) {
    return await db.partners.bulkPut(partners);
  },

  // Settings
  async getSettings() {
    const settings = await db.settings.get('app-settings');
    return settings || {
      id: 'app-settings',
      darkMode: false,
      language: 'en' as const,
      cash: 0,
      totalSales: 0
    };
  },

  async updateSettings(changes: Partial<AppSettings>) {
    return await db.settings.update('app-settings', changes);
  },

  // Clear all data (for testing)
  async clearAllData() {
    await db.transactions.clear();
    await db.inventory.clear();
    await db.partners.clear();
    await db.settings.clear();
  },

  // Reset database and force migration from localStorage
  async resetAndMigrate() {
    console.log('Clearing database...');
    await this.clearAllData();
    console.log('Database cleared. Migrating from localStorage...');
    await migrateFromLocalStorage();
    console.log('Migration complete. Please refresh the page.');
  }
};
