
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
    
    // Calculate cost based on raw materials
    const bottlesItem = inventory.find(item => item.type === 'bottles');
    const oilItem = inventory.find(item => item.type === 'oil');
    
    const bottlesUsed = parseFloat(formData.bottlesUsed || '0');
    const oilUsed = parseFloat(formData.oilUsed || '0');
    
    const bottleCost = bottlesItem ? bottlesItem.unitCost * bottlesUsed : 0;
    const oilCost = oilItem ? oilItem.unitCost * oilUsed : 0;
    const totalCost = bottleCost + oilCost;
    
    const productData = {
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      bottlesUsed,
      oilUsed,
      totalCost,
      unitCost: totalCost / parseFloat(formData.quantity)
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
  
  // Calculate estimated cost
  const bottlesItem = inventory.find(item => item.type === 'bottles');
  const oilItem = inventory.find(item => item.type === 'oil');
  
  const bottlesUsed = parseFloat(formData.bottlesUsed || '0');
  const oilUsed = parseFloat(formData.oilUsed || '0');
  
  const bottleCost = bottlesItem ? bottlesItem.unitCost * bottlesUsed : 0;
  const oilCost = oilItem ? oilItem.unitCost * oilUsed : 0;
  const totalCost = bottleCost + oilCost;
  const unitCost = formData.quantity ? totalCost / parseFloat(formData.quantity) : 0;

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
              step="0.01"
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
              step="0.01"
              value={formData.bottlesUsed}
              onChange={(e) => setFormData({...formData, bottlesUsed: e.target.value})}
              placeholder={`Available: ${availableBottles} (Cost: $${bottlesItem?.unitCost.toFixed(2) || '0.00'} each)`}
              max={availableBottles}
            />
          </div>
          
          <div>
            <Label htmlFor="oilUsed">Oil Used (grams)</Label>
            <Input
              id="oilUsed"
              type="number"
              step="0.01"
              value={formData.oilUsed}
              onChange={(e) => setFormData({...formData, oilUsed: e.target.value})}
              placeholder={`Available: ${availableOil}g (Cost: $${oilItem?.unitCost.toFixed(2) || '0.00'} per gram)`}
              max={availableOil}
            />
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <p className="text-sm text-blue-700">
              This will create {formData.quantity || 0} units of "{formData.name}" using {formData.bottlesUsed || 0} bottles and {formData.oilUsed || 0}g of oil.
            </p>
            <div className="text-sm text-blue-800 font-semibold">
              <p>Cost Breakdown:</p>
              <p>• Bottles: ${bottleCost.toFixed(2)}</p>
              <p>• Oil: ${oilCost.toFixed(2)}</p>
              <p>• Total Cost: ${totalCost.toFixed(2)}</p>
              <p>• Cost per Unit: ${unitCost.toFixed(2)}</p>
            </div>
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
