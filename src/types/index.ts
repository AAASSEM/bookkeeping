export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'create' | 'gain' | 'loss' | 'closing' | 'manual' | 'investing' | 'deposit' | 'payable' | 'receivable';
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
  paymentMethod?: 'cash' | 'credit' | 'other';
} 