export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss' | 'closing' | 'manual' | 'investing';
  amount: number;
  debit: string;
  credit: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
  partnerName?: string;
  paymentMethod?: 'cash' | 'credit' | 'other';
} 