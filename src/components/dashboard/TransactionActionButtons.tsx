import { Button } from '@/components/ui/button';
import {
  Package,
  DollarSign,
  FileText,
  ShoppingCart,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  UserMinus,
  UserPlus
} from 'lucide-react';

type TransactionFormType =
  | 'purchase'
  | 'sale'
  | 'expense'
  | 'withdrawal'
  | 'gain'
  | 'loss'
  | 'deposit'
  | 'payable'
  | 'receivable';

interface TransactionActionButtonsProps {
  t: (key: string) => string;
  onSelectTransactionType: (type: TransactionFormType) => void;
  onCreateProduct: () => void;
  onOpenFinancialStatements: () => void;
}

export const TransactionActionButtons = ({
  t,
  onSelectTransactionType,
  onCreateProduct,
  onOpenFinancialStatements,
}: TransactionActionButtonsProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <Button
        onClick={() => onSelectTransactionType('purchase')}
        className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
      >
        <ShoppingCart className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('purchase')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('sale')}
        className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
      >
        <DollarSign className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('sell')}
      </Button>
      <Button
        onClick={onCreateProduct}
        className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
      >
        <Package className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('create')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('expense')}
        className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
      >
        <CreditCard className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('expenses')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('deposit')}
        className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
      >
        <ArrowDownCircle className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('deposit')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('withdrawal')}
        className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
      >
        <ArrowUpCircle className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('withdraw')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('gain')}
        className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
      >
        <TrendingUp className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('gain')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('loss')}
        className="h-14 sm:h-16 button-primary font-semibold text-sm sm:text-base"
      >
        <TrendingDown className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('loss')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('payable')}
        className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
      >
        <UserMinus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('accountPayable')}
      </Button>
      <Button
        onClick={() => onSelectTransactionType('receivable')}
        className="h-14 sm:h-16 button-secondary font-semibold text-sm sm:text-base"
      >
        <UserPlus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('accountReceivable')}
      </Button>
      <Button
        onClick={onOpenFinancialStatements}
        className="h-14 sm:h-16 button-primary font-semibold col-span-2 sm:col-span-3 md:col-span-5 text-sm sm:text-base"
      >
        <FileText className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {t('financialStatements')}
      </Button>
    </div>
  );
};
