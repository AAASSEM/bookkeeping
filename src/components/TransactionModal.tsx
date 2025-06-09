
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'gain' | 'loss';
  inventory: any[];
  partners: { name: string; capital: number }[];
}

export const TransactionModal = ({ isOpen, onClose, onSubmit, type, inventory, partners }: TransactionModalProps) => {
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
    boxPrice: '',
    partnerName: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let transactionData;
    
    switch (type) {
      case 'purchase':
        let totalAmount = 0;
        let quantity = 0;
        
        if (formData.productType === 'oil') {
          quantity = parseFloat(formData.grams);
          totalAmount = quantity * parseFloat(formData.price);
        } else {
          quantity = parseFloat(formData.quantity);
          totalAmount = quantity * parseFloat(formData.price);
        }
        
        transactionData = {
          type: 'purchase',
          description: `Purchased ${formData.productType === 'oil' ? formData.grams + 'g' : formData.quantity} ${formData.productType} - ${formData.productName}`,
          amount: totalAmount,
          debit: `Inventory $${totalAmount.toFixed(2)}`,
          credit: `Cash $${totalAmount.toFixed(2)}`,
          productType: formData.productType,
          productName: formData.productName,
          quantity: formData.productType === 'oil' ? 1 : quantity,
          grams: formData.productType === 'oil' ? parseFloat(formData.grams) : undefined,
          milliliters: formData.milliliters ? parseFloat(formData.milliliters) : undefined,
          unitCost: parseFloat(formData.price)
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
          quantity: parseFloat(formData.quantity),
          isBoxed: formData.isBoxed,
          boxQuantity: formData.isBoxed ? parseFloat(formData.quantity) : 0
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
          description: `Capital withdrawal by ${formData.partnerName}`,
          amount: parseFloat(formData.amount),
          debit: `${formData.partnerName} Capital $${parseFloat(formData.amount).toFixed(2)}`,
          credit: `Cash $${parseFloat(formData.amount).toFixed(2)}`,
          partnerName: formData.partnerName
        };
        break;
      case 'gain':
        transactionData = {
          type: 'gain',
          description: formData.description || 'Business gain',
          amount: parseFloat(formData.amount),
          debit: `Cash $${parseFloat(formData.amount).toFixed(2)}`,
          credit: `Gain $${parseFloat(formData.amount).toFixed(2)}`
        };
        break;
      case 'loss':
        transactionData = {
          type: 'loss',
          description: formData.description || 'Business loss',
          amount: parseFloat(formData.amount),
          debit: `Loss $${parseFloat(formData.amount).toFixed(2)}`,
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
      boxPrice: '',
      partnerName: ''
    });
  };

  const getTitle = () => {
    switch (type) {
      case 'purchase': return 'Purchase Inventory';
      case 'sale': return 'Record Sale';
      case 'expense': return 'Record Expense';
      case 'withdrawal': return 'Partner Withdrawal';
      case 'gain': return 'Record Gain';
      case 'loss': return 'Record Loss';
      default: return 'Transaction';
    }
  };

  const calculatePurchaseTotal = () => {
    if (formData.productType === 'oil' && formData.grams && formData.price) {
      return parseFloat(formData.grams) * parseFloat(formData.price);
    } else if (formData.quantity && formData.price) {
      return parseFloat(formData.quantity) * parseFloat(formData.price);
    }
    return 0;
  };

  const renderProductFields = () => {
    if (type === 'purchase') {
      return (
        <>
          <div>
            <Label htmlFor="productType">Product Type</Label>
            <Select value={formData.productType} onValueChange={(value) => setFormData({...formData, productType: value, productName: '', quantity: '', grams: '', milliliters: ''})}>
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
              <Label htmlFor="productName">
                {formData.productType === 'other' ? 'Product Name' : `${formData.productType.charAt(0).toUpperCase() + formData.productType.slice(0, -1)} Name`}
              </Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                placeholder={`Enter ${formData.productType === 'other' ? 'product' : formData.productType.slice(0, -1)} name`}
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
                  step="0.01"
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
                  step="0.01"
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
                step="0.01"
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
                step="0.01"
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
                    {item.name} ({item.type === 'oil' ? `${item.grams}g` : `${item.quantity} units`} available)
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
              step="0.01"
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
            <div className="bg-secondary/20 p-3 rounded-lg">
              <p className="text-sm text-secondary-foreground">
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
          <DialogTitle>
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderProductFields()}
          
          {type === 'purchase' && formData.productType && (
            <div>
              <Label htmlFor="price">
                Price per {formData.productType === 'oil' ? 'Gram' : 'Unit'}
              </Label>
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

          {type === 'purchase' && formData.productType && ((formData.productType === 'oil' && formData.grams && formData.price) || (formData.productType !== 'oil' && formData.quantity && formData.price)) && (
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm text-primary">
                Total Cost: ${calculatePurchaseTotal().toFixed(2)}
              </p>
            </div>
          )}
          
          {(type === 'expense' || type === 'withdrawal' || type === 'gain' || type === 'loss') && (
            <>
              {(type === 'expense' || type === 'gain' || type === 'loss') && (
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder={type === 'expense' ? "e.g., Shipping, Office supplies" : `Enter ${type} description`}
                    required={type === 'expense'}
                  />
                </div>
              )}

              {type === 'withdrawal' && (
                <div>
                  <Label htmlFor="partner">Partner</Label>
                  <Select value={formData.partnerName} onValueChange={(value) => setFormData({...formData, partnerName: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((partner) => (
                        <SelectItem key={partner.name} value={partner.name}>
                          {partner.name} (Capital: ${partner.capital.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              Save Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
