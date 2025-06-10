import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Create Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
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
                <Label htmlFor="bottleType">Bottle Type</Label>
                <Select
                  value={formData.bottleType}
                  onValueChange={(value) => setFormData({...formData, bottleType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bottle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bottleTypes.map((bottle) => (
                      <SelectItem key={bottle.name} value={bottle.name}>
                        {bottle.name} (Available: {bottle.quantity}, Cost: ${bottle.unitCost.toFixed(2)} each)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
          </div>
          
          <div>
            <Label htmlFor="bottlesUsed">Bottles Used</Label>
            <Input
              id="bottlesUsed"
              type="number"
              step="0.01"
              value={formData.bottlesUsed}
              onChange={(e) => setFormData({...formData, bottlesUsed: e.target.value})}
                  placeholder={selectedBottle ? `Available: ${selectedBottle.quantity}` : 'Select bottle type first'}
                  max={selectedBottle?.quantity}
                  disabled={!formData.bottleType}
            />
          </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="oilType">Oil Type</Label>
                <Select
                  value={formData.oilType}
                  onValueChange={(value) => setFormData({...formData, oilType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select oil type" />
                  </SelectTrigger>
                  <SelectContent>
                    {oilTypes.map((oil) => (
                      <SelectItem key={oil.name} value={oil.name}>
                        {oil.name} (Available: {oil.grams}g, Cost: ${oil.unitCost.toFixed(2)} per gram)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
          </div>
          
          <div>
            <Label htmlFor="oilUsed">Oil Used (grams)</Label>
            <Input
              id="oilUsed"
              type="number"
              step="0.01"
              value={formData.oilUsed}
              onChange={(e) => setFormData({...formData, oilUsed: e.target.value})}
                  placeholder={selectedOil ? `Available: ${selectedOil.grams}g` : 'Select oil type first'}
                  max={selectedOil?.grams}
                  disabled={!formData.oilType}
                />
              </div>

              <div>
                <Label htmlFor="sellingPrice">Selling Price per Unit</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                  placeholder="Enter selling price"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="bg-primary/20 p-3 rounded-lg space-y-2">
            <p className="text-sm text-primary-foreground">
              This will create {formData.quantity || 0} units of "{formData.name}" using {formData.bottlesUsed || 0} {formData.bottleType || 'bottles'} and {formData.oilUsed || 0}g of {formData.oilType || 'oil'}.
            </p>
            <div className="text-sm text-primary-foreground font-semibold">
              <p>Cost Breakdown:</p>
              <p>• Bottles: ${bottleCost.toFixed(2)}</p>
              <p>• Oil: ${oilCost.toFixed(2)}</p>
              <p>• Total Cost: ${totalCost.toFixed(2)}</p>
              <p>• Cost per Unit: ${unitCost.toFixed(2)}</p>
              <p>• Selling Price per Unit: ${formData.sellingPrice || '0.00'}</p>
              <p>• Potential Profit per Unit: ${(parseFloat(formData.sellingPrice || '0') - unitCost).toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              Create Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
