import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, DollarSign } from 'lucide-react';

interface StatCardsProps {
  t: (key: string) => string;
  cash: number;
  totalInventoryValue: number;
  totalSales: number;
}

export const StatCards = ({ t, cash, totalInventoryValue, totalSales }: StatCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
      <Card className="bg-card text-primary border-default">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('cashBalance')}</CardTitle>
          <DollarSign className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${cash.toFixed(2)}</div>
          <p className="text-secondary text-xs">{t('availableCash')}</p>
        </CardContent>
      </Card>

      <Card className="bg-card text-primary border-default">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('inventoryValue')}</CardTitle>
          <Package className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
          <p className="text-secondary text-xs">{t('totalStockValue')}</p>
        </CardContent>
      </Card>

      <Card className="bg-card text-primary border-default">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('totalSales')}</CardTitle>
          <TrendingUp className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
          <p className="text-secondary text-xs">{t('cumulativeSales')}</p>
        </CardContent>
      </Card>

      <Card className="bg-card text-primary border-default">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('totalAssets')}</CardTitle>
          <TrendingUp className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${(cash + totalInventoryValue).toFixed(2)}</div>
          <p className="text-secondary text-xs">{t('cashPlusInventory')}</p>
        </CardContent>
      </Card>
    </div>
  );
};
