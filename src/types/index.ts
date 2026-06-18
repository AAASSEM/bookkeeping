export type TransactionType =
  | 'purchase'
  | 'sale'
  | 'expense'
  | 'withdrawal'
  | 'create'
  | 'gain'
  | 'loss'
  | 'closing'
  | 'manual'
  | 'investing'
  | 'deposit'
  | 'payable'
  | 'receivable';

export type PaymentMethod = 'cash' | 'credit' | 'other';

export type InventoryItemType = 'oil' | 'bottles' | 'box' | 'other' | 'created';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
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
  paymentMethod?: PaymentMethod;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  type: InventoryItemType;
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
