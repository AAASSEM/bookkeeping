import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation, type Language } from '@/utils/translations';
import { FlaskConical, Droplets, Package, ShoppingCart, Banknote, CreditCard, Wallet, UserCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: 'purchase' | 'sale' | 'expense' | 'withdrawal' | 'gain' | 'loss' | 'deposit' | 'payable' | 'receivable';
  inventory: any[];
  partners: { name: string; capital: number }[];
  language: Language;
}

export const TransactionModal = ({ isOpen, onClose, onSubmit, type, inventory, partners, language }: TransactionModalProps) => {
  const { t } = useTranslation(language);
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
    partnerName: '',
    creditorName: '',
    debtorName: '',
    otherPersonName: '',
    customerName: '',
    orderNumber: ''
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

        const paymentMethod = formData.paymentMethod || 'cash';
        const debitAccount = paymentMethod === 'credit'
          ? `Accounts Receivable - ${formData.customerName || 'Customer'} $${totalSaleAmount.toFixed(2)}`
          : `Cash $${totalSaleAmount.toFixed(2)}`;

        return {
          type: 'sale',
          description: `Sold ${quantity} ${item.productName}${item.isBoxed ? ' (boxed)' : ''}${formData.orderNumber ? ` - Order #${formData.orderNumber}` : ''}`,
          amount: totalSaleAmount,
          debit: debitAccount,
          credit: `Revenue $${totalSaleAmount.toFixed(2)}`,
          productName: item.productName,
          quantity: quantity,
          isBoxed: item.isBoxed,
          boxPrice: boxPrice,
          unitCost: selectedProduct.unitCost,
          paymentMethod: paymentMethod,
          customerName: paymentMethod === 'credit' ? formData.customerName : undefined,
          orderNumber: formData.orderNumber || undefined
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

      case 'deposit':
          const depositAmount = parseFloat(formData.amount || '0');
          if (isNaN(depositAmount) || depositAmount <= 0) {
            throw new Error('Invalid deposit amount. Please enter a valid number.');
          }
        transactionData = {
          type: 'deposit',
          description: `Capital deposit by ${formData.partnerName}`,
            amount: depositAmount,
            debit: `Cash $${depositAmount.toFixed(2)}`,
            credit: `${formData.partnerName} Capital $${depositAmount.toFixed(2)}`,
          partnerName: formData.partnerName
        };
        break;

      case 'payable':
          const payableAmount = parseFloat(formData.amount || '0');
          if (isNaN(payableAmount) || payableAmount <= 0) {
            throw new Error('Invalid payable amount. Please enter a valid number.');
          }
          const creditor = formData.creditorName === 'other' ? formData.otherPersonName : formData.creditorName;
        transactionData = {
          type: 'payable',
          description: `Loan received from ${creditor}`,
            amount: payableAmount,
            debit: `Cash $${payableAmount.toFixed(2)}`,
            credit: `Accounts Payable - ${creditor} $${payableAmount.toFixed(2)}`,
          creditorName: creditor
        };
        break;

      case 'receivable':
          const receivableAmount = parseFloat(formData.amount || '0');
          if (isNaN(receivableAmount) || receivableAmount <= 0) {
            throw new Error('Invalid receivable amount. Please enter a valid number.');
          }
          const debtor = formData.debtorName === 'other' ? formData.otherPersonName : formData.debtorName;
        transactionData = {
          type: 'receivable',
          description: `Loan given to ${debtor}`,
            amount: receivableAmount,
            debit: `Accounts Receivable - ${debtor} $${receivableAmount.toFixed(2)}`,
            credit: `Cash $${receivableAmount.toFixed(2)}`,
          debtorName: debtor
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
      partnerName: '',
      creditorName: '',
      debtorName: '',
      otherPersonName: '',
      customerName: '',
      orderNumber: ''
    });
  };

  const getTitle = () => {
    switch (type) {
      case 'purchase': return t('purchaseInventory');
      case 'sale': return t('recordSale');
      case 'expense': return t('recordExpense');
      case 'withdrawal': return t('partnerWithdrawal');
      case 'gain': return t('recordGain');
      case 'loss': return t('recordLoss');
      case 'deposit': return t('recordDeposit');
      case 'payable': return t('accountPayable');
      case 'receivable': return t('accountReceivable');
      default: return t('transaction');
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
      const productTypes = [
        { value: 'bottles', label: t('bottles'), icon: FlaskConical, color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-800' },
        { value: 'oil', label: t('oil'), icon: Droplets, color: 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800' },
        { value: 'box', label: t('box'), icon: Package, color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800' },
        { value: 'other', label: t('other'), icon: ShoppingCart, color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800' }
      ];

      return (
        <>
          <div>
            <Label className="mb-2 block text-sm">{t('productType')}</Label>
            <div className="grid grid-cols-4 gap-2">
              {productTypes.map((product) => {
                const Icon = product.icon;
                const isSelected = formData.productType === product.value;
                return (
                  <button
                    key={product.value}
                    type="button"
                    onClick={() => setFormData({...formData, productType: product.value, productName: '', quantity: '', grams: '', milliliters: ''})}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? `${product.color} ring-2 ring-offset-2 ring-primary`
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgb(0, 0, 0)' }}>
                      {product.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.productType && (
            <div>
              <Label htmlFor="productName">
                {formData.productType === 'other' ? t('productName') : 
                 formData.productType === 'bottles' ? t('bottleName') :
                 formData.productType === 'oil' ? t('oilName') :
                 formData.productType === 'box' ? t('boxName') : t('productName')}
              </Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                placeholder={formData.productType === 'other' ? t('enterProductName') : 
                           formData.productType === 'bottles' ? t('enterProductName') :
                           formData.productType === 'oil' ? t('enterProductName') :
                           formData.productType === 'box' ? t('enterProductName') : t('enterProductName')}
                required
              />
            </div>
          )}

          {formData.productType === 'bottles' && (
            <>
              <div>
                <Label htmlFor="milliliters">{t('millilitersPerBottle')}</Label>
                <Input
                  id="milliliters"
                  type="number"
                  step="0.01"
                  value={formData.milliliters}
                  onChange={(e) => setFormData({...formData, milliliters: e.target.value})}
                  placeholder={t('enterMilliliters')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity">{t('quantityBottles')}</Label>
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
            </>
          )}

          {formData.productType === 'oil' && (
            <div>
              <Label htmlFor="grams">{t('grams')}</Label>
              <Input
                id="grams"
                type="number"
                step="0.01"
                value={formData.grams}
                onChange={(e) => setFormData({...formData, grams: e.target.value})}
                placeholder={t('enterGrams')}
                required
              />
            </div>
          )}

          {(formData.productType === 'box' || formData.productType === 'other') && (
            <div>
              <Label htmlFor="quantity">{t('quantity')}</Label>
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
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">{t('product')}</Label>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeSaleItem(idx)} disabled={saleItems.length === 1}>{t('remove')}</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {createdProducts.map(product => {
                      const isSelected = item.productName === product.name;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            handleSaleItemChange(idx, 'productName', product.name);
                            handleSaleItemChange(idx, 'price', product.sellingPrice?.toString() || '');
                            handleSaleItemChange(idx, 'quantity', '');
                          }}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 ring-2 ring-offset-2 ring-primary'
                              : 'bg-background border-border hover:border-primary/50'
                          }`}
                        >
                          <FlaskConical className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                          <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                            {product.name}
                          </span>
                          <span className="text-[10px] text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                            {t('available')}: {product.quantity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {item.productName && (
                  <>
          <div>
                      <Label>{t('quantity')}</Label>
            <Input
              type="number"
              step="0.01"
                        value={item.quantity}
                        onChange={e => handleSaleItemChange(idx, 'quantity', e.target.value)}
              placeholder={t('enterQuantity')}
                        max={createdProducts.find(p => p.name === item.productName)?.quantity || 0}
              required
            />
          </div>
          <div>
                      <Label>{t('pricePerUnit')}</Label>
            <Input
              type="number"
              step="0.01"
                        value={item.price}
                        disabled
                        className="bg-muted"
            />
          </div>
          <div className="flex items-center space-x-2 mt-3">
            <Checkbox
                        id={`isBoxed-${idx}`}
                        checked={item.isBoxed}
                        onCheckedChange={checked => handleSaleItemChange(idx, 'isBoxed', checked as boolean)}
                        className="border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
                      <Label htmlFor={`isBoxed-${idx}`} className="cursor-pointer select-none">{t('packageInBox')}</Label>
          </div>
                    {item.isBoxed && (
            <div>
                        <Label>{t('boxPrice')}</Label>
              <Input
                type="number"
                step="0.01"
                          value={item.boxPrice}
                          onChange={e => handleSaleItemChange(idx, 'boxPrice', e.target.value)}
                placeholder={t('enterBoxPrice')}
                required
              />
            </div>
          )}
                    <div className="bg-primary/20 p-3 rounded-lg mt-3">
                      <p className="text-sm text-primary-foreground">
                        {t('totalSaleAmount')}: ${(parseFloat(item.quantity || '0') * parseFloat(item.price || '0') + parseFloat(item.boxPrice || '0')).toFixed(2)}
              </p>
            </div>
                  </>
          )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addSaleItem} className="w-full mb-2">+ {t('addAnotherItem')}</Button>
        </>
      );
    } else if (type === 'deposit') {
      return (
        <>
          <div>
            <Label className="mb-2 block text-sm">{t('partner')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {partners.map((partner) => {
                const isSelected = formData.partnerName === partner.name;
                return (
                  <button
                    key={partner.name}
                    type="button"
                    onClick={() => setFormData({...formData, partnerName: partner.name})}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 ring-2 ring-offset-2 ring-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <UserCircle className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                    <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                      {partner.name}
                    </span>
                    <span className="text-[10px] text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                      {t('capital')}: ${partner.capital.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      );
    } else if (type === 'payable') {
      return (
        <>
          <div>
            <Label className="mb-2 block text-sm">{t('creditor')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {partners.map((partner) => {
                const isSelected = formData.creditorName === partner.name;
                return (
                  <button
                    key={partner.name}
                    type="button"
                    onClick={() => setFormData({...formData, creditorName: partner.name, otherPersonName: ''})}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-rose-100 dark:bg-rose-900 border-rose-300 dark:border-rose-700 ring-2 ring-offset-2 ring-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <UserCircle className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                    <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                      {partner.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setFormData({...formData, creditorName: 'other'})}
                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                  formData.creditorName === 'other'
                    ? 'bg-rose-100 dark:bg-rose-900 border-rose-300 dark:border-rose-700 ring-2 ring-offset-2 ring-primary'
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                <UserCircle className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                  {t('other')}
                </span>
              </button>
            </div>
          </div>
          {formData.creditorName === 'other' && (
            <div>
              <Label htmlFor="otherPersonName">{t('creditorName')}</Label>
              <Input
                id="otherPersonName"
                value={formData.otherPersonName}
                onChange={(e) => setFormData({...formData, otherPersonName: e.target.value})}
                placeholder={t('enterCreditorName')}
                required
              />
            </div>
          )}
        </>
      );
    } else if (type === 'receivable') {
      return (
        <>
          <div>
            <Label className="mb-2 block text-sm">{t('debtor')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {partners.map((partner) => {
                const isSelected = formData.debtorName === partner.name;
                return (
                  <button
                    key={partner.name}
                    type="button"
                    onClick={() => setFormData({...formData, debtorName: partner.name, otherPersonName: ''})}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-teal-100 dark:bg-teal-900 border-teal-300 dark:border-teal-700 ring-2 ring-offset-2 ring-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <UserCircle className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                    <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                      {partner.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setFormData({...formData, debtorName: 'other'})}
                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                  formData.debtorName === 'other'
                    ? 'bg-teal-100 dark:bg-teal-900 border-teal-300 dark:border-teal-700 ring-2 ring-offset-2 ring-primary'
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                <UserCircle className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                  {t('other')}
                </span>
              </button>
            </div>
          </div>
          {formData.debtorName === 'other' && (
            <div>
              <Label htmlFor="otherPersonName">{t('debtorName')}</Label>
              <Input
                id="otherPersonName"
                value={formData.otherPersonName}
                onChange={(e) => setFormData({...formData, otherPersonName: e.target.value})}
                placeholder={t('enterDebtorName')}
                required
              />
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={type === 'sale' ? "sm:max-w-2xl max-h-[85vh] overflow-y-auto" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderProductFields()}
          
          {type === 'purchase' && formData.productType && (
            <div>
              <Label htmlFor="price">
                {formData.productType === 'oil' ? t('pricePerGram') : t('pricePerUnitGeneric')}
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder={t('enterAmount')}
                required
              />
            </div>
          )}

          {type === 'purchase' && formData.productType && ((formData.productType === 'oil' && formData.grams && formData.price) || (formData.productType !== 'oil' && formData.quantity && formData.price)) && (
            <div className="bg-primary/20 p-3 rounded-lg">
              <p className="text-sm text-primary-foreground">
                {t('totalCost')}: ${calculatePurchaseTotal().toFixed(2)}
              </p>
            </div>
          )}

          {type === 'sale' && (
            <div>
              <Label htmlFor="orderNumber">{t('orderNumber')}</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                placeholder={t('enterOrderNumber')}
              />
            </div>
          )}

          {(type === 'expense' || type === 'withdrawal' || type === 'gain' || type === 'loss' || type === 'deposit' || type === 'payable' || type === 'receivable') && (
            <>
              {(type === 'expense' || type === 'gain' || type === 'loss') && (
                <div>
                  <Label htmlFor="description">{t('description')}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder={t('enterDescription')}
                    required={type === 'expense'}
                  />
                </div>
              )}

              {type === 'withdrawal' && (
                <div>
                  <Label className="mb-2 block text-sm">{t('partner')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {partners.map((partner) => {
                      const isSelected = formData.partnerName === partner.name;
                      return (
                        <button
                          key={partner.name}
                          type="button"
                          onClick={() => setFormData({...formData, partnerName: partner.name})}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 ring-2 ring-offset-2 ring-primary'
                              : 'bg-background border-border hover:border-primary/50'
                          }`}
                        >
                          <UserCircle className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                          <span className="text-xs font-medium text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                            {partner.name}
                          </span>
                          <span className="text-[10px] text-center" style={{ color: 'rgb(0, 0, 0)' }}>
                            {t('capital')}: ${partner.capital.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="amount">{t('amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder={t('enterAmount')}
                  required
                />
              </div>
            </>
          )}

          {type !== 'deposit' && type !== 'payable' && type !== 'receivable' && type !== 'gain' && type !== 'loss' && type !== 'withdrawal' && (
            <>
              <div>
                <Label className="mb-2 block text-sm">{t('paymentMethod')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'cash', label: t('cash'), icon: Banknote, color: 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800' },
                    { value: 'credit', label: t('credit'), icon: CreditCard, color: 'bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-700 hover:bg-sky-200 dark:hover:bg-sky-800' }
                  ].map((payment) => {
                    const Icon = payment.icon;
                    const isSelected = formData.paymentMethod === payment.value;
                    return (
                      <button
                        key={payment.value}
                        type="button"
                        onClick={() => setFormData({...formData, paymentMethod: payment.value})}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? `${payment.color} ring-2 ring-offset-2 ring-primary`
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className="h-6 w-6" style={{ color: 'rgb(0, 0, 0)' }} />
                        <span className="text-xs font-medium" style={{ color: 'rgb(0, 0, 0)' }}>
                          {payment.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {type === 'sale' && formData.paymentMethod === 'credit' && (
                <div>
                  <Label htmlFor="customerName">{t('customerName')}</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder={t('enterCustomerName')}
                    required
                  />
                </div>
              )}
            </>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              {t('saveTransaction')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
