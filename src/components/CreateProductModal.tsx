import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation, type Language } from '@/utils/translations';
import { FlaskConical, Droplets } from 'lucide-react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  inventory: any[];
  language: Language;
}

export const CreateProductModal = ({ isOpen, onClose, onSubmit, inventory, language }: CreateProductModalProps) => {
  const { t } = useTranslation(language);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    bottlesUsed: '',
    oilUsed: '',
    sellingPrice: '',
    bottleType: '',
    oilType: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate cost based on raw materials
    const bottlesItem = inventory.find(item => 
      item.type === 'bottles' && item.name === formData.bottleType
    );
    const oilItem = inventory.find(item => 
      item.type === 'oil' && item.name === formData.oilType
    );
    
    const bottlesUsed = parseFloat(formData.bottlesUsed || '0');
    const oilUsed = parseFloat(formData.oilUsed || '0');
    
    const bottleCost = bottlesItem ? bottlesItem.unitCost * bottlesUsed : 0;
    const oilCost = oilItem ? oilItem.unitCost * oilUsed : 0;
    const totalCost = bottleCost + oilCost;
    const unitCost = totalCost / parseFloat(formData.quantity);
    
    const productData = {
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      bottlesUsed,
      oilUsed,
      totalCost,
      unitCost,
      sellingPrice: parseFloat(formData.sellingPrice),
      type: 'created',
      bottleType: formData.bottleType,
      oilType: formData.oilType
    };
    
    onSubmit(productData);
    setFormData({
      name: '',
      quantity: '',
      bottlesUsed: '',
      oilUsed: '',
      sellingPrice: '',
      bottleType: '',
      oilType: ''
    });
  };

  // Get available bottle types
  const bottleTypes = inventory
    .filter(item => item.type === 'bottles')
    .map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitCost: item.unitCost
    }));

  // Get available oil types
  const oilTypes = inventory
    .filter(item => item.type === 'oil')
    .map(item => ({
      name: item.name,
      grams: item.grams,
      unitCost: item.unitCost
    }));

  // Get selected bottle and oil items
  const selectedBottle = bottleTypes.find(b => b.name === formData.bottleType);
  const selectedOil = oilTypes.find(o => o.name === formData.oilType);
  
  // Calculate estimated cost
  const bottlesUsed = parseFloat(formData.bottlesUsed || '0');
  const oilUsed = parseFloat(formData.oilUsed || '0');
  
  const bottleCost = selectedBottle ? selectedBottle.unitCost * bottlesUsed : 0;
  const oilCost = selectedOil ? selectedOil.unitCost * oilUsed : 0;
  const totalCost = bottleCost + oilCost;
  const unitCost = formData.quantity ? totalCost / parseFloat(formData.quantity) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{t('createProduct')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('productName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={t('enterProductName')}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quantity">{t('quantityToCreate')}</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              placeholder={t('enterQuantity')}
              required
            />
          </div>

              <div>
                <Label className="mb-2 block text-sm">{t('bottleType')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {bottleTypes.map((bottle) => {
                    const isSelected = formData.bottleType === bottle.name;
                    return (
                      <button
                        key={bottle.name}
                        type="button"
                        onClick={() => setFormData({...formData, bottleType: bottle.name})}
                        className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700 ring-2 ring-offset-2 ring-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <FlaskConical className="h-5 w-5" style={{ color: 'rgb(0, 0, 0)' }} />
                        <span className="text-[10px] font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                          {bottle.name}
                        </span>
                        <span className="text-[9px] text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                          {t('available')}: {bottle.quantity}
                        </span>
                      </button>
                    );
                  })}
                </div>
          </div>

          <div>
            <Label htmlFor="bottlesUsed">{t('bottlesUsed')}</Label>
            <Input
              id="bottlesUsed"
              type="number"
              step="0.01"
              value={formData.bottlesUsed}
              onChange={(e) => setFormData({...formData, bottlesUsed: e.target.value})}
                  placeholder={selectedBottle ? `${t('available')}: ${selectedBottle.quantity}` : t('selectBottleFirst')}
                  max={selectedBottle?.quantity}
                  disabled={!formData.bottleType}
            />
          </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm">{t('oilType')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {oilTypes.map((oil) => {
                    const isSelected = formData.oilType === oil.name;
                    return (
                      <button
                        key={oil.name}
                        type="button"
                        onClick={() => setFormData({...formData, oilType: oil.name})}
                        className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700 ring-2 ring-offset-2 ring-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <Droplets className="h-5 w-5" style={{ color: 'rgb(0, 0, 0)' }} />
                        <span className="text-[10px] font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                          {oil.name}
                        </span>
                        <span className="text-[9px] text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                          {t('available')}: {oil.grams}g
                        </span>
                      </button>
                    );
                  })}
                </div>
          </div>

          <div>
            <Label htmlFor="oilUsed">{t('oilUsed')}</Label>
            <Input
              id="oilUsed"
              type="number"
              step="0.01"
              value={formData.oilUsed}
              onChange={(e) => setFormData({...formData, oilUsed: e.target.value})}
                  placeholder={selectedOil ? `${t('available')}: ${selectedOil.grams}g` : t('selectOilFirst')}
                  max={selectedOil?.grams}
                  disabled={!formData.oilType}
                />
              </div>

              <div>
                <Label htmlFor="sellingPrice">{t('sellingPricePerUnit')}</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                  placeholder={t('enterSellingPrice')}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="bg-primary/20 p-3 rounded-lg space-y-2">
            <p className="text-sm text-primary-foreground">
              {t('thisWillCreate')} {formData.quantity || 0} {t('unitsOf')} "{formData.name}" {t('using')} {formData.bottlesUsed || 0} {formData.bottleType || t('bottles')} {t('and')} {formData.oilUsed || 0}{t('gOfOil')}.
            </p>
            <div className="text-sm text-primary-foreground font-semibold">
              <p>{t('costBreakdown')}</p>
              <p>• {t('bottles')}: ${bottleCost.toFixed(2)}</p>
              <p>• {t('oil')}: ${oilCost.toFixed(2)}</p>
              <p>• {t('totalCost')}: ${totalCost.toFixed(2)}</p>
              <p>• {t('costPerUnit')}: ${unitCost.toFixed(2)}</p>
              <p>• {t('sellingPricePerUnit')}: ${formData.sellingPrice || '0.00'}</p>
              <p>• {t('potentialProfitPerUnit')}: ${(parseFloat(formData.sellingPrice || '0') - unitCost).toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              {t('createProduct')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
