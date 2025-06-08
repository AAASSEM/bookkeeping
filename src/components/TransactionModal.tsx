
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    product: '',
    quantity: '',
    price: '',
    description: '',
    amount: '',
    paymentMethod: 'cash'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let transactionData;
    
    switch (type) {
      case 'purchase':
        transactionData = {
          type: 'purchase',
          description: `Purchased ${formData.quantity} ${formData.product}`,
          amount: parseFloat(formData.quantity) * parseFloat(formData.price),
          debit: `Inventory $${(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)}`,
          credit: `Cash $${(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)}`
        };
        break;
      case 'sale':
        transactionData = {
          type: 'sale',
          description: `Sold ${formData.quantity} ${formData.product}`,
          amount: parseFloat(formData.quantity) * parseFloat(formData.price),
          debit: `Cash $${(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)}`,
          credit: `Revenue $${(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)}`
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
      product: '',
      quantity: '',
      price: '',
      description: '',
      amount: '',
      paymentMethod: 'cash'
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
          {(type === 'purchase' || type === 'sale') && (
            <>
              <div>
                <Label htmlFor="product">Product</Label>
                <Select value={formData.product} onValueChange={(value) => setFormData({...formData, product: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
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
              
              {type === 'sale' && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    Total Sale: ${formData.quantity && formData.price ? (parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2) : '0.00'}
                  </p>
                </div>
              )}
              
              {type === 'purchase' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Total Cost: ${formData.quantity && formData.price ? (parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2) : '0.00'}
                  </p>
                </div>
              )}
            </>
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
