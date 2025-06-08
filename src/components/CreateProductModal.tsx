
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  inventory: any[];
}

export const CreateProductModal = ({ isOpen, onClose, onSubmit, inventory }: CreateProductModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    bottlesUsed: '',
    oilUsed: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      bottlesUsed: parseFloat(formData.bottlesUsed || '0'),
      oilUsed: parseFloat(formData.oilUsed || '0')
    };
    
    onSubmit(productData);
    setFormData({
      name: '',
      quantity: '',
      bottlesUsed: '',
      oilUsed: ''
    });
  };

  const availableBottles = inventory.find(item => item.type === 'bottles')?.quantity || 0;
  const availableOil = inventory.find(item => item.type === 'oil')?.grams || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Create Product
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter product name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quantity">Quantity to Create</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              placeholder="Enter quantity"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="bottlesUsed">Bottles Used</Label>
            <Input
              id="bottlesUsed"
              type="number"
              value={formData.bottlesUsed}
              onChange={(e) => setFormData({...formData, bottlesUsed: e.target.value})}
              placeholder={`Available: ${availableBottles}`}
              max={availableBottles}
            />
          </div>
          
          <div>
            <Label htmlFor="oilUsed">Oil Used (grams)</Label>
            <Input
              id="oilUsed"
              type="number"
              value={formData.oilUsed}
              onChange={(e) => setFormData({...formData, oilUsed: e.target.value})}
              placeholder={`Available: ${availableOil}g`}
              max={availableOil}
            />
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              This will create {formData.quantity || 0} units of "{formData.name}" using {formData.bottlesUsed || 0} bottles and {formData.oilUsed || 0}g of oil.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              Create Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
