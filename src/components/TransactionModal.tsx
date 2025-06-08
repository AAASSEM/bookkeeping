
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal';
  inventory: any[];
}

export const TransactionModal = ({ isOpen, onClose, onSubmit, type, inventory }: TransactionModalProps) => {
  const [formData, setFormData] = useState({
    productType: '',
    productName: '',
    quantity: '',
    milliliters: '',
    grams: '',
    price: '',
    description: '',
    amount: '',
    paymentMethod: 'cash',
    isBoxed: false,
    boxPrice: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let transactionData;
    
    switch (type) {
      case 'purchase':
        const totalAmount = parseFloat(formData.quantity) * parseFloat(formData.price);
        transactionData = {
          type: 'purchase',
          description: `Purchased ${formData.quantity} ${formData.productType} - ${formData.productName}`,
          amount: totalAmount,
          debit: `Inventory $${totalAmount.toFixed(2)}`,
          credit: `Cash $${totalAmount.toFixed(2)}`,
          productType: formData.productType,
          productName: formData.productName,
          quantity: parseFloat(formData.quantity),
          milliliters: formData.milliliters ? parseFloat(formData.milliliters) : undefined,
          grams: formData.grams ? parseFloat(formData.grams) : undefined
        };
        break;
      case 'sale':
        const saleAmount = parseFloat(formData.quantity) * parseFloat(formData.price);
        const boxAmount = formData.isBoxed ? parseFloat(formData.boxPrice || '0') : 0;
        const totalSaleAmount = saleAmount + boxAmount;
        transactionData = {
          type: 'sale',
          description: `Sold ${formData.quantity} ${formData.productName}${formData.isBoxed ? ' (boxed)' : ''}`,
          amount: totalSaleAmount,
          debit: `Cash $${totalSaleAmount.toFixed(2)}`,
          credit: `Revenue $${totalSaleAmount.toFixed(2)}`,
          productName: formData.productName,
          quantity: parseFloat(formData.quantity)
        };
        break;
      case 'expense':
        transactionData = {
          type: 'expense',
          description: formData.description,
          amount: parseFloat(formData.amount),
          debit: `Expenses $${parseFloat(formData.amount).toFixed(2)}`,
          credit: `Cash $${parseFloat(formData.amount).toFixed(2)}`
        };
        break;
      case 'withdrawal':
        transactionData = {
          type: 'withdrawal',
          description: 'Owner withdrawal',
          amount: parseFloat(formData.amount),
          debit: `Capital $${parseFloat(formData.amount).toFixed(2)}`,
          credit: `Cash $${parseFloat(formData.amount).toFixed(2)}`
        };
        break;
    }
    
    onSubmit(transactionData);
    setFormData({
      productType: '',
      productName: '',
      quantity: '',
      milliliters: '',
      grams: '',
      price: '',
      description: '',
      amount: '',
      paymentMethod: 'cash',
      isBoxed: false,
      boxPrice: ''
    });
  };

  const getTitle = () => {
    switch (type) {
      case 'purchase': return 'Purchase Inventory';
      case 'sale': return 'Record Sale';
      case 'expense': return 'Record Expense';
      case 'withdrawal': return 'Owner Withdrawal';
      default: return 'Transaction';
    }
  };

  const renderProductFields = () => {
    if (type === 'purchase') {
      return (
        <>
          <div>
            <Label htmlFor="productType">Product Type</Label>
            <Select value={formData.productType} onValueChange={(value) => setFormData({...formData, productType: value, productName: ''})}>
              <SelectTrigger>
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottles">Bottles</SelectItem>
                <SelectItem value="oil">Oil</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.productType && (
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                placeholder="Enter product name"
                required
              />
            </div>
          )}

          {formData.productType === 'bottles' && (
            <>
              <div>
                <Label htmlFor="milliliters">Milliliters per bottle</Label>
                <Input
                  id="milliliters"
                  type="number"
                  value={formData.milliliters}
                  onChange={(e) => setFormData({...formData, milliliters: e.target.value})}
                  placeholder="Enter milliliters"
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity (bottles)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="Enter quantity"
                  required
                />
              </div>
            </>
          )}

          {formData.productType === 'oil' && (
            <div>
              <Label htmlFor="grams">Grams</Label>
              <Input
                id="grams"
                type="number"
                value={formData.grams}
                onChange={(e) => setFormData({...formData, grams: e.target.value})}
                placeholder="Enter grams"
                required
              />
            </div>
          )}

          {(formData.productType === 'box' || formData.productType === 'other') && (
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="Enter quantity"
                required
              />
            </div>
          )}
        </>
      );
    }

    if (type === 'sale') {
      return (
        <>
          <div>
            <Label htmlFor="product">Product</Label>
            <Select value={formData.productName} onValueChange={(value) => setFormData({...formData, productName: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name} ({item.quantity} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="quantity">Quantity</Label>
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
            <Label htmlFor="price">Price per Unit</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              placeholder="Enter price"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isBoxed"
              checked={formData.isBoxed}
              onCheckedChange={(checked) => setFormData({...formData, isBoxed: checked as boolean})}
            />
            <Label htmlFor="isBoxed">Item Boxed/Packaged?</Label>
          </div>

          {formData.isBoxed && (
            <div>
              <Label htmlFor="boxPrice">Box/Package Price</Label>
              <Input
                id="boxPrice"
                type="number"
                step="0.01"
                value={formData.boxPrice}
                onChange={(e) => setFormData({...formData, boxPrice: e.target.value})}
                placeholder="Enter box price"
                required
              />
            </div>
          )}
          
          {formData.quantity && formData.price && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-700">
                Total Sale: ${(parseFloat(formData.quantity) * parseFloat(formData.price) + (formData.isBoxed ? parseFloat(formData.boxPrice || '0') : 0)).toFixed(2)}
              </p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {getTitle()}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderProductFields()}
          
          {type === 'purchase' && formData.productType && (
            <div>
              <Label htmlFor="price">Price per Unit</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="Enter price"
                required
              />
            </div>
          )}

          {type === 'purchase' && formData.quantity && formData.price && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                Total Cost: ${(parseFloat(formData.quantity || '0') * parseFloat(formData.price)).toFixed(2)}
              </p>
            </div>
          )}
          
          {(type === 'expense' || type === 'withdrawal') && (
            <>
              {type === 'expense' && (
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="e.g., Shipping, Office supplies"
                    required
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Enter amount"
                  required
                />
              </div>
            </>
          )}
          
          <div>
            <Label htmlFor="payment">Payment Method</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              Save Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
