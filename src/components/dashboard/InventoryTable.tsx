import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InventoryItem } from '@/types';

interface InventoryTableProps {
  t: (key: string) => string;
  inventory: InventoryItem[];
}

export const InventoryTable = ({ t, inventory }: InventoryTableProps) => {
  return (
    <Card className="mb-8 bg-card border-default">
      <CardHeader>
        <CardTitle className="text-primary">{t('currentInventory')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left py-3 px-4 font-semibold text-secondary">{t('product')}</th>
                <th className="text-right py-3 px-4 font-semibold text-secondary">{t('quantity')}</th>
                <th className="text-right py-3 px-4 font-semibold text-secondary">{t('unitCost')}</th>
                <th className="text-right py-3 px-4 font-semibold text-secondary">{t('totalValue')}</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-b border-default table-row-hover">
                  <td className="py-3 px-4 text-primary">{item.name}</td>
                  <td className="py-3 px-4 text-right text-secondary">
                    {item.type === 'oil' ? `${item.grams}g` : item.quantity}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary">${item.unitCost.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary">${item.totalValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
