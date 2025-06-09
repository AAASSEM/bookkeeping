import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateProductModal } from '@/components/CreateProductModal';
import { TransactionModal } from '@/components/TransactionModal';
import { FinancialStatementsModal } from '@/components/FinancialStatementsModal';
import { PartnerModal } from '@/components/PartnerModal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardProps {
  
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([
    { id: 1, name: '50ml Bottles', type: 'bottles', quantity: 50, unitCost: 0.5 },
    { id: 2, name: '100ml Bottles', type: 'bottles', quantity: 30, unitCost: 0.7 },
    { id: 3, name: 'Boxes', type: 'box', quantity: 100, unitCost: 1.0 },
    { id: 4, name: 'Essential Oil X', type: 'oil', grams: 500, unitCost: 0.02 },
    { id: 5, name: 'Carrier Oil Y', type: 'oil', grams: 1000, unitCost: 0.015 }
  ]);
  const [partners, setPartners] = useState<any[]>([
    { name: 'Alice', capital: 5000 },
    { name: 'Bob', capital: 3000 }
  ]);
  const [modalState, setModalState] = useState({ isOpen: false, type: 'purchase' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [financialModalOpen, setFinancialModalOpen] = useState(false);

  const handleTransaction = (transactionData: any) => {
    console.log('Processing transaction:', transactionData);
    
    const newTransaction = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      ...transactionData
    };
    
    setTransactions([...transactions, newTransaction]);
    
    // Update inventory based on transaction type
    if (transactionData.type === 'purchase') {
      const updatedInventory = [...inventory];
      const existingIndex = updatedInventory.findIndex(
        item => item.name === transactionData.productName && item.type === transactionData.productType
      );
      
      if (existingIndex >= 0) {
        if (transactionData.productType === 'oil') {
          updatedInventory[existingIndex].grams += transactionData.grams;
        } else {
          updatedInventory[existingIndex].quantity += transactionData.quantity;
        }
        // Update unit cost with weighted average
        const existingValue = updatedInventory[existingIndex].unitCost * (transactionData.productType === 'oil' ? updatedInventory[existingIndex].grams - transactionData.grams : updatedInventory[existingIndex].quantity - transactionData.quantity);
        const newValue = transactionData.unitCost * (transactionData.productType === 'oil' ? transactionData.grams : transactionData.quantity);
        const totalQuantity = transactionData.productType === 'oil' ? updatedInventory[existingIndex].grams : updatedInventory[existingIndex].quantity;
        updatedInventory[existingIndex].unitCost = (existingValue + newValue) / totalQuantity;
      } else {
        const newItem = {
          id: Date.now(),
          name: transactionData.productName,
          type: transactionData.productType,
          quantity: transactionData.productType === 'oil' ? 1 : transactionData.quantity,
          grams: transactionData.productType === 'oil' ? transactionData.grams : undefined,
          milliliters: transactionData.milliliters,
          unitCost: transactionData.unitCost
        };
        updatedInventory.push(newItem);
      }
      setInventory(updatedInventory);
    } else if (transactionData.type === 'sale') {
      const updatedInventory = [...inventory];
      const productIndex = updatedInventory.findIndex(item => item.name === transactionData.productName);
      
      if (productIndex >= 0) {
        const soldQuantity = parseFloat(transactionData.quantity);
        if (updatedInventory[productIndex].type === 'oil') {
          updatedInventory[productIndex].grams -= soldQuantity;
          if (updatedInventory[productIndex].grams <= 0) {
            updatedInventory.splice(productIndex, 1);
          }
        } else {
          updatedInventory[productIndex].quantity -= soldQuantity;
          if (updatedInventory[productIndex].quantity <= 0) {
            updatedInventory.splice(productIndex, 1);
          }
        }
        
        // Handle box inventory deduction
        if (transactionData.isBoxed && transactionData.boxQuantity > 0) {
          const boxIndex = updatedInventory.findIndex(item => item.type === 'box');
          if (boxIndex >= 0) {
            updatedInventory[boxIndex].quantity -= transactionData.boxQuantity;
            if (updatedInventory[boxIndex].quantity <= 0) {
              updatedInventory.splice(boxIndex, 1);
            }
          }
        }
      }
      setInventory(updatedInventory);
    } else if (transactionData.type === 'withdrawal') {
      // Update partner capital
      const updatedPartners = partners.map(partner => 
        partner.name === transactionData.partnerName 
          ? { ...partner, capital: partner.capital - parseFloat(transactionData.amount) }
          : partner
      );
      setPartners(updatedPartners);
    }
    
    setModalState({ isOpen: false, type: 'purchase' });
  };

  const handleCreateProduct = (productData: any) => {
    console.log('Creating product:', productData);
    
    // Add the new product to inventory
    const newProduct = {
      id: Date.now(),
      name: productData.name,
      type: 'product',
      quantity: parseFloat(productData.quantity),
      unitCost: productData.unitCost,
      totalCost: productData.totalCost
    };
    
    const updatedInventory = [...inventory, newProduct];
    
    // Reduce raw materials from inventory
    const bottlesIndex = updatedInventory.findIndex(item => item.type === 'bottles');
    if (bottlesIndex >= 0 && productData.bottlesUsed > 0) {
      updatedInventory[bottlesIndex].quantity -= parseFloat(productData.bottlesUsed);
      if (updatedInventory[bottlesIndex].quantity <= 0) {
        updatedInventory.splice(bottlesIndex, 1);
      }
    }
    
    const oilIndex = updatedInventory.findIndex(item => item.type === 'oil');
    if (oilIndex >= 0 && productData.oilUsed > 0) {
      updatedInventory[oilIndex].grams -= parseFloat(productData.oilUsed);
      if (updatedInventory[oilIndex].grams <= 0) {
        updatedInventory.splice(oilIndex, 1);
      }
    }
    
    setInventory(updatedInventory);
    
    // Add transaction record
    const productionTransaction = {
      id: Date.now() + 1,
      date: new Date().toLocaleDateString(),
      type: 'production',
      description: `Created ${productData.quantity} units of ${productData.name}`,
      amount: productData.totalCost,
      debit: `Finished Goods $${productData.totalCost.toFixed(2)}`,
      credit: `Raw Materials $${productData.totalCost.toFixed(2)}`,
      productName: productData.name,
      quantity: productData.quantity
    };
    
    setTransactions([...transactions, productionTransaction]);
    setCreateModalOpen(false);
  };

  const handleAddPartner = (partnerData: any) => {
    setPartners([...partners, partnerData]);
    setPartnerModalOpen(false);
  };

  // Calculate total inventory value
  const totalInventoryValue = inventory.reduce((total, item) => {
    const itemValue = item.type === 'oil' ? item.grams * item.unitCost : item.quantity * item.unitCost;
    return total + itemValue;
  }, 0);

  // Calculate total cash on hand (simplified: sum of all debits - sum of all credits)
  const totalCashOnHand = transactions.reduce((total, transaction) => {
    let amount = parseFloat(transaction.amount);
    if (transaction.type === 'purchase' || transaction.type === 'expense' || transaction.type === 'loss') {
      return total - amount;
    } else if (transaction.type === 'sale' || transaction.type === 'gain') {
      return total + amount;
    } else if (transaction.type === 'withdrawal') {
      return total - amount;
    }
    return total;
  }, 0);

  // Calculate total partner capital
  const totalPartnerCapital = partners.reduce((total, partner) => total + partner.capital, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Business Dashboard</h1>
          <div className="flex gap-3">
            <Button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Create Product
            </Button>
            <Button 
              onClick={() => setPartnerModalOpen(true)}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              Add Partner
            </Button>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Button
            onClick={() => setModalState({ isOpen: true, type: 'purchase' })}
            className="h-24 bg-card border border-border hover:bg-accent flex flex-col items-center justify-center text-card-foreground"
            variant="outline"
          >
            <span className="text-lg font-semibold">Purchase</span>
            <span className="text-sm">Buy Inventory</span>
          </Button>
          
          <Button
            onClick={() => setModalState({ isOpen: true, type: 'sale' })}
            className="h-24 bg-card border border-border hover:bg-accent flex flex-col items-center justify-center text-card-foreground"
            variant="outline"
          >
            <span className="text-lg font-semibold">Sale</span>
            <span className="text-sm">Record Sale</span>
          </Button>
          
          <Button
            onClick={() => setModalState({ isOpen: true, type: 'expense' })}
            className="h-24 bg-card border border-border hover:bg-accent flex flex-col items-center justify-center text-card-foreground"
            variant="outline"
          >
            <span className="text-lg font-semibold">Expense</span>
            <span className="text-sm">Record Expense</span>
          </Button>
          
          <Button
            onClick={() => setModalState({ isOpen: true, type: 'withdrawal' })}
            className="h-24 bg-card border border-border hover:bg-accent flex flex-col items-center justify-center text-card-foreground"
            variant="outline"
          >
            <span className="text-lg font-semibold">Withdrawal</span>
            <span className="text-sm">Partner Draw</span>
          </Button>
          
          <Button
            onClick={() => setModalState({ isOpen: true, type: 'gain' })}
            className="h-24 bg-card border border-border hover:bg-accent flex flex-col items-center justify-center text-card-foreground"
            variant="outline"
          >
            <span className="text-lg font-semibold">Gain</span>
            <span className="text-sm">Record Gain</span>
          </Button>
          
          <Button
            onClick={() => setModalState({ isOpen: true, type: 'loss' })}
            className="h-24 bg-card border border-border hover:bg-accent flex flex-col items-center justify-center text-card-foreground"
            variant="outline"
          >
            <span className="text-lg font-semibold">Loss</span>
            <span className="text-sm">Record Loss</span>
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              ${totalInventoryValue.toFixed(2)}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Total Cash on Hand</CardTitle>
            </CardHeader>
            <CardContent>
              ${totalCashOnHand.toFixed(2)}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Total Partner Capital</CardTitle>
            </CardHeader>
            <CardContent>
              ${totalPartnerCapital.toFixed(2)}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-border bg-background text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 border-b-2 border-border bg-background text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 border-b-2 border-border bg-background text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-5 py-3 border-b-2 border-border bg-background text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td className="px-5 py-5 border-b border-border bg-background text-sm">
                      {transaction.date}
                    </td>
                    <td className="px-5 py-5 border-b border-border bg-background text-sm">
                      {transaction.type}
                    </td>
                    <td className="px-5 py-5 border-b border-border bg-background text-sm">
                      {transaction.description}
                    </td>
                    <td className="px-5 py-5 border-b border-border bg-background text-sm">
                      ${transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button onClick={() => setFinancialModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          View Financial Statements
        </Button>

        <CreateProductModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateProduct}
          inventory={inventory}
        />

        <TransactionModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: 'purchase' })}
          onSubmit={handleTransaction}
          type={modalState.type}
          inventory={inventory}
          partners={partners}
        />

        <FinancialStatementsModal
          isOpen={financialModalOpen}
          onClose={() => setFinancialModalOpen(false)}
          transactions={transactions}
          inventory={inventory}
          partners={partners}
        />

        <PartnerModal
          isOpen={partnerModalOpen}
          onClose={() => setPartnerModalOpen(false)}
          onSubmit={handleAddPartner}
        />
      </div>
    </div>
  );
};
