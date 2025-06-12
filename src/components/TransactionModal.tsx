import { useState } from 'react';
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
  // For multi-product sale
  const [saleItems, setSaleItems] = useState([
    { productName: '', quantity: '', isBoxed: false, boxPrice: '', price: '' }
  ]);
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

  const handleSaleItemChange = (idx: number, field: string, value: any) => {
    setSaleItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const addSaleItem = () => setSaleItems(items => [...items, { productName: '', quantity: '', isBoxed: false, boxPrice: '', price: '' }]);
  const removeSaleItem = (idx: number) => setSaleItems(items => items.length > 1 ? items.filter((_, i) => i !== idx) : items);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let transactionData;
    if (type === 'sale') {
      console.log('Sale Items before processing:', saleItems);
      
      // Validate that at least one product is selected
      if (saleItems.length === 0 || !saleItems[0].productName) {
        throw new Error('Please select at least one product to sell');
      }

      // Process each sale item
      transactionData = saleItems.map(item => {
        console.log('Processing sale item:', item);
        
        const selectedProduct = inventory.find(p => p.name === item.productName && p.type === 'created');
        console.log('Selected product found:', selectedProduct);
        
        if (!selectedProduct) {
          throw new Error(`Product "${item.productName}" not found in inventory`);
        }
        
        if (typeof selectedProduct.sellingPrice !== 'number' || isNaN(selectedProduct.sellingPrice)) {
          throw new Error(`Please set a selling price for ${item.productName}`);
        }
        
        const quantity = parseFloat(item.quantity || '0');
        const sellingPrice = selectedProduct.sellingPrice;
        const boxPrice = item.isBoxed ? parseFloat(item.boxPrice || '0') : 0;
        
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for ${item.productName}. Please enter a valid number greater than 0.`);
        }
        
        if (selectedProduct.quantity < quantity) {
          throw new Error(`Not enough ${item.productName} in stock. Available: ${selectedProduct.quantity}`);
        }
        
        if (item.isBoxed) {
          if (isNaN(boxPrice) || boxPrice < 0) {
            throw new Error(`Invalid box price for ${item.productName}. Please enter a valid number.`);
          }
          
          const boxItem = inventory.find(p => p.type === 'box');
          if (!boxItem || boxItem.quantity < quantity) {
            throw new Error(`Not enough boxes in stock. Available: ${boxItem?.quantity || 0}`);
          }
        }
        
        const saleAmount = quantity * sellingPrice;
        const totalSaleAmount = saleAmount + boxPrice;
        
        console.log('Calculated amounts:', {
          quantity,
          sellingPrice,
          boxPrice,
          saleAmount,
          totalSaleAmount
        });
        
        if (isNaN(totalSaleAmount) || totalSaleAmount <= 0) {
          throw new Error(`Invalid sale amount calculated for ${item.productName}. Please check the input values.`);
        }
        
        return {
          type: 'sale',
          description: `Sold ${quantity} ${item.productName}${item.isBoxed ? ' (boxed)' : ''}`,
          amount: totalSaleAmount,
          debit: `Cash $${totalSaleAmount.toFixed(2)}`,
          credit: `Revenue $${totalSaleAmount.toFixed(2)}`,
          productName: item.productName,
          quantity: quantity,
          isBoxed: item.isBoxed,
          boxPrice: boxPrice,
          unitCost: selectedProduct.unitCost,
          paymentMethod: formData.paymentMethod || 'cash'
        };
      });
      
      console.log('Final transaction data:', transactionData);
    } else {
    switch (type) {
      case 'purchase':
          console.log('Purchase formData before processing:', formData);
          
          // Safely parse all numeric values with defaults
          const quantity = formData.productType === 'oil' 
            ? parseFloat(formData.grams || '0')
            : parseFloat(formData.quantity || '0');
          const price = parseFloat(formData.price || '0');
          
          // Calculate total amount with safe defaults
          const totalAmount = quantity * price;
          
          console.log('Calculated purchase amounts:', {
            quantity,
            price,
            totalAmount
          });
          
          // Validate calculated amount
          if (isNaN(totalAmount) || totalAmount <= 0) {
            console.error('Invalid purchase amount calculated:', {
              quantity,
              price,
              totalAmount
            });
            throw new Error('Invalid purchase amount calculated. Please check the input values.');
        }
        
        transactionData = {
          type: 'purchase',
          description: `Purchased ${formData.productType === 'oil' ? formData.grams + 'g' : formData.quantity} ${formData.productType} - ${formData.productName}`,
          amount: totalAmount,
          debit: `Inventory $${totalAmount.toFixed(2)}`,
          credit: `Cash $${totalAmount.toFixed(2)}`,
          productType: formData.productType,
          productName: formData.productName,
          quantity: formData.productType === 'oil' ? parseFloat(formData.grams || '0') : quantity,
          grams: formData.productType === 'oil' ? parseFloat(formData.grams || '0') : undefined,
          milliliters: formData.milliliters ? parseFloat(formData.milliliters || '0') : undefined,
          unitCost: price
        };
        break;
          
      case 'expense':
          const expenseAmount = parseFloat(formData.amount || '0');
          if (isNaN(expenseAmount) || expenseAmount <= 0) {
            throw new Error('Invalid expense amount. Please enter a valid number.');
          }
        transactionData = {
          type: 'expense',
          description: formData.description,
            amount: expenseAmount,
            debit: `Expenses $${expenseAmount.toFixed(2)}`,
            credit: `Cash $${expenseAmount.toFixed(2)}`
        };
        break;
          
      case 'withdrawal':
          const withdrawalAmount = parseFloat(formData.amount || '0');
          if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            throw new Error('Invalid withdrawal amount. Please enter a valid number.');
          }
        transactionData = {
          type: 'withdrawal',
          description: `Capital withdrawal by ${formData.partnerName}`,
            amount: withdrawalAmount,
            debit: `${formData.partnerName} Capital $${withdrawalAmount.toFixed(2)}`,
            credit: `Cash $${withdrawalAmount.toFixed(2)}`,
          partnerName: formData.partnerName
        };
        break;
          
      case 'gain':
          const gainAmount = parseFloat(formData.amount || '0');
          if (isNaN(gainAmount) || gainAmount <= 0) {
            throw new Error('Invalid gain amount. Please enter a valid number.');
          }
        transactionData = {
          type: 'gain',
          description: formData.description || 'Business gain',
            amount: gainAmount,
            debit: `Cash $${gainAmount.toFixed(2)}`,
            credit: `Gain $${gainAmount.toFixed(2)}`
        };
        break;
          
      case 'loss':
          const lossAmount = parseFloat(formData.amount || '0');
          if (isNaN(lossAmount) || lossAmount <= 0) {
            throw new Error('Invalid loss amount. Please enter a valid number.');
          }
        transactionData = {
          type: 'loss',
          description: formData.description || 'Business loss',
            amount: lossAmount,
            debit: `Loss $${lossAmount.toFixed(2)}`,
            credit: `Cash $${lossAmount.toFixed(2)}`
        };
        break;
    }
    }
    
    console.log('Submitting transaction data:', transactionData);
    onSubmit(transactionData);
    
    // Reset form data
    setSaleItems([{ productName: '', quantity: '', isBoxed: false, boxPrice: '', price: '' }]);
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
    } else if (type === 'sale') {
      const createdProducts = inventory.filter(item => item.type === 'created');
      return (
        <>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {saleItems.map((item, idx) => (
              <div key={idx} className="border p-2 mb-2 rounded-md bg-muted/30">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Select Product</Label>
                    <Select
                      value={item.productName}
                      onValueChange={value => {
                        const selectedProduct = createdProducts.find(p => p.name === value);
                        handleSaleItemChange(idx, 'productName', value);
                        handleSaleItemChange(idx, 'price', selectedProduct?.sellingPrice?.toString() || '');
                        handleSaleItemChange(idx, 'quantity', '');
                      }}
                    >
              <SelectTrigger>
                        <SelectValue placeholder="Select a product to sell" />
              </SelectTrigger>
              <SelectContent>
                        {createdProducts.map(product => (
                          <SelectItem key={product.id} value={product.name}>
                            {product.name} (Available: {product.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
                  <Button type="button" variant="destructive" onClick={() => removeSaleItem(idx)} disabled={saleItems.length === 1}>Remove</Button>
                </div>
                {item.productName && (
                  <>
          <div>
                      <Label>Quantity</Label>
            <Input
              type="number"
              step="0.01"
                        value={item.quantity}
                        onChange={e => handleSaleItemChange(idx, 'quantity', e.target.value)}
              placeholder="Enter quantity"
                        max={createdProducts.find(p => p.name === item.productName)?.quantity || 0}
              required
            />
          </div>
          <div>
                      <Label>Price per Unit</Label>
            <Input
              type="number"
              step="0.01"
                        value={item.price}
                        disabled
                        className="bg-muted"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
                        checked={item.isBoxed}
                        onCheckedChange={checked => handleSaleItemChange(idx, 'isBoxed', checked as boolean)}
            />
                      <Label>Package in Box</Label>
          </div>
                    {item.isBoxed && (
            <div>
                        <Label>Box Price</Label>
              <Input
                type="number"
                step="0.01"
                          value={item.boxPrice}
                          onChange={e => handleSaleItemChange(idx, 'boxPrice', e.target.value)}
                placeholder="Enter box price"
                required
              />
            </div>
          )}
                    <div className="bg-primary/20 p-3 rounded-lg">
                      <p className="text-sm text-primary-foreground">
                        Total Sale Amount: ${(parseFloat(item.quantity || '0') * parseFloat(item.price || '0') + parseFloat(item.boxPrice || '0')).toFixed(2)}
              </p>
            </div>
                  </>
          )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addSaleItem} className="w-full mb-2">+ Add Another Product</Button>
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
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
            <div className="bg-primary/20 p-3 rounded-lg">
              <p className="text-sm text-primary-foreground">
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
                    placeholder={type === 'expense' ? 'e.g., Shipping, Office supplies' : `Describe the ${type}`}
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
