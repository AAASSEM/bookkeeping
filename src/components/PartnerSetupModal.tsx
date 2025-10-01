
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';
import { useTranslation, type Language } from '@/utils/translations';

interface Partner {
  name: string;
  capital: string;
}

interface PartnerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (partners: { name: string; capital: number }[]) => void;
  language: Language;
}

export const PartnerSetupModal = ({ isOpen, onClose, onSubmit, language }: PartnerSetupModalProps) => {
  const { t } = useTranslation(language);
  const [partners, setPartners] = useState<Partner[]>([{ name: '', capital: '' }]);

  const addPartner = () => {
    setPartners([...partners, { name: '', capital: '' }]);
  };

  const removePartner = (index: number) => {
    if (partners.length > 1) {
      setPartners(partners.filter((_, i) => i !== index));
    }
  };

  const updatePartner = (index: number, field: keyof Partner, value: string) => {
    const updated = [...partners];
    updated[index][field] = value;
    setPartners(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPartners = partners
      .filter(p => p.name.trim() && p.capital.trim())
      .map(p => ({ name: p.name.trim(), capital: parseFloat(p.capital) }));
    
    if (validPartners.length > 0) {
      onSubmit(validPartners);
      // Modal will close automatically after successful submission
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('setupPartners')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">Enter the partners and their initial capital amounts:</p>
          
          {partners.map((partner, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor={`name-${index}`}>{t('partnerName')}</Label>
                <Input
                  id={`name-${index}`}
                  value={partner.name}
                  onChange={(e) => updatePartner(index, 'name', e.target.value)}
                  placeholder={t('enterPartnerName')}
                  required
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`capital-${index}`}>{t('initialCapital')}</Label>
                <Input
                  id={`capital-${index}`}
                  type="number"
                  step="0.01"
                  value={partner.capital}
                  onChange={(e) => updatePartner(index, 'capital', e.target.value)}
                  placeholder={t('enterInitialCapital')}
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removePartner(index)}
                disabled={partners.length === 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addPartner} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t('addPartner')}
          </Button>
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {t('setupBusiness')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
