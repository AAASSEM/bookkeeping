import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { formatDate } from '@/utils/dateFormatter';
import type { Transaction, InventoryItem, Partner } from '@/types';

interface TransactionHistoryEntry {
  transactions: Transaction[];
  cash: number;
  inventory: InventoryItem[];
  totalSales: number;
  partners: Partner[];
}

interface TransactionActionsParams {
  transactions: Transaction[];
  cash: number;
  inventory: InventoryItem[];
  partners: Partner[];
  totalSales: number;
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setCash: Dispatch<SetStateAction<number>>;
  setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  setPartners: Dispatch<SetStateAction<Partner[]>>;
  setTotalSales: Dispatch<SetStateAction<number>>;
  setShowPartnerSetup: (open: boolean) => void;
  setShowTransactionModal: (open: boolean) => void;
  setShowCreateModal: (open: boolean) => void;
  setShowManualModal: (open: boolean) => void;
  setEditingTransaction: (transaction: Transaction | null) => void;
}

// All transaction mutation handlers (partners/purchase/sale/create/delete/edit/undo/manual/
// closing), extracted verbatim from the Dashboard. Owns the undo history stack.
export function useTransactionActions({
  transactions,
  cash,
  inventory,
  partners,
  totalSales,
  setTransactions,
  setCash,
  setInventory,
  setPartners,
  setTotalSales,
  setShowPartnerSetup,
  setShowTransactionModal,
  setShowCreateModal,
  setShowManualModal,
  setEditingTransaction,
}: TransactionActionsParams) {
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryEntry[]>([]);

  const handlePartnerSetup = (partnerData: Partner[]) => {
    // Merge new partners with existing ones, avoiding duplicates by name
    const existingNames = new Set(partners.map(p => p.name));
    const newPartnersWithIds = partnerData
      .filter(p => !existingNames.has(p.name))
      .map(p => ({
        ...p,
        id: `partner-${Date.now()}-${Math.random()}`
      }));
    const updatedPartners = [...partners, ...newPartnersWithIds];
    setPartners(updatedPartners);

    // Add initial capital transactions only for new partners
    const capitalTransactions = newPartnersWithIds.map(partner => ({
      id: `capital-${Date.now()}-${Math.random()}`,
      date: formatDate(),
      type: 'investing' as const,
      description: `Initial capital from ${partner.name}`,
      amount: partner.capital,
      debit: `Cash $${partner.capital.toFixed(2)}`,
      credit: `${partner.name} Capital $${partner.capital.toFixed(2)}`,
      partnerName: partner.name,
      paymentMethod: 'cash' as const
    }));
    setTransactions(prev => [...prev, ...capitalTransactions]);
    setCash(prev => prev + newPartnersWithIds.reduce((sum, p) => sum + p.capital, 0));
    setShowPartnerSetup(false); // Close the modal after setup
  };

  const handleDeletePartner = (partnerName: string) => {
    // Only allow deletion if partner's capital is 0
    const partner = partners.find(p => p.name === partnerName);
    if (partner && partner.capital === 0) {
      setPartners(partners.filter(p => p.name !== partnerName));
    }
  };

  const saveCurrentState = () => {
    // Create deep copies of all state values
    const stateToSave = {
      transactions: transactions.map(t => ({...t})),
      cash: cash,
      inventory: inventory.map(item => ({...item})),
      totalSales: totalSales,
      partners: partners.map(p => ({...p}))
    };
    setTransactionHistory(prev => [...prev, stateToSave]);
  };

  const handleTransaction = useCallback((transactionData: any) => {
    try {
      console.log('Transaction data received from modal:', transactionData);
      
      // Save current state for undo
      saveCurrentState();

      // Handle sale transactions
      if (Array.isArray(transactionData) && transactionData[0]?.type === 'sale') {
        // Process each sale transaction
        transactionData.forEach(saleTx => {
          // Create only the sale transaction
          const saleTransaction: Transaction = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            date: formatDate(),
            description: saleTx.description,
            type: 'sale',
            amount: saleTx.amount,
            debit: saleTx.debit,
            credit: saleTx.credit,
            productName: saleTx.productName,
            quantity: saleTx.quantity,
            unitCost: saleTx.unitCost,
            paymentMethod: saleTx.paymentMethod
          };

          console.log('New sale transaction:', saleTransaction);

          // Update cash only if payment method is cash (credit sales go to Accounts Receivable)
          if (saleTx.paymentMethod === 'cash') {
            setCash(prev => parseFloat((prev + saleTx.amount).toFixed(2)));
          }
          setTotalSales(prev => parseFloat((prev + saleTx.amount).toFixed(2)));

          // Update inventory
          setInventory(prev => {
            const updatedInventory = prev.map(item => {
              if (item.name === saleTx.productName) {
                const newQuantity = item.quantity - saleTx.quantity;
                return {
                  ...item,
                  quantity: newQuantity,
                  totalValue: newQuantity * item.unitCost
                };
              }
              return item;
            });

            // If the sale includes boxes, update box inventory
            if (saleTx.isBoxed) {
              return updatedInventory.map(item => {
                if (item.type === 'box') {
                  const newQuantity = item.quantity - saleTx.quantity;
                  return {
                    ...item,
                    quantity: newQuantity,
                    totalValue: newQuantity * item.unitCost
                  };
                }
                return item;
              });
            }

            return updatedInventory;
          });

          // Add only the sale transaction to the journal
          setTransactions(prev => [...prev, saleTransaction]);
        });

        setShowTransactionModal(false);
        return;
      }

      // Handle other transaction types...
      console.log('Transaction data received:', transactionData);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
        date: formatDate(),
        description: transactionData.description,
        type: transactionData.type,
        amount: transactionData.amount,
        debit: transactionData.debit,
        credit: transactionData.credit,
        productName: transactionData.productName,
        quantity: transactionData.quantity,
        unitCost: transactionData.unitCost,
        partnerName: transactionData.partnerName,
        paymentMethod: transactionData.paymentMethod || 'cash' // Default to 'cash' if not specified
      };

      // Update cash based on transaction type
    if (transactionData.type === 'purchase') {
        // Only update cash if it's a cash purchase (not credit)
        if (transactionData.paymentMethod === 'cash') {
          setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
        }

        // Update inventory for purchase transactions
        if (transactionData.productName && transactionData.quantity && transactionData.unitCost) {
          setInventory(prev => {
            const existingItem = prev.find(item => item.name === transactionData.productName);
            
            if (existingItem) {
              // Update existing item
              return prev.map(item => {
                if (item.name === transactionData.productName) {
                  // Check if this is an oil purchase (from productType in transaction)
                  const isOilPurchase = transactionData.productType === 'oil';

                  if (isOilPurchase || item.type === 'oil') {
                    // For oil, update grams and calculate total value
                    const newGrams = (item.grams || 0) + transactionData.quantity;
                    const totalValue = newGrams * transactionData.unitCost;
                    return {
                      ...item,
                      type: 'oil', // Ensure type is set to oil
                      grams: newGrams,
                      unitCost: transactionData.unitCost,
                      totalValue: totalValue,
                      quantity: 0 // Oil doesn't use quantity field
                    };
                  } else {
                    // For other items, update quantity
                    const newQuantity = item.quantity + transactionData.quantity;
                    const totalValue = newQuantity * transactionData.unitCost;
                    return {
                      ...item,
                      quantity: newQuantity,
                      unitCost: transactionData.unitCost,
                      totalValue: totalValue
                    };
                  }
                }
                return item;
              });
      } else {
              // Use productType from transaction data, with fallback to name detection
              let itemType: 'bottles' | 'oil' | 'box' | 'other' = 'other';

              if (transactionData.productType) {
                // Use the explicit productType from the transaction
                itemType = transactionData.productType;
              } else {
                // Fallback: determine item type based on name
                const isOil = transactionData.productName.toLowerCase().includes('oil') ||
                             transactionData.productName.toLowerCase().includes('coco');
                const isBottle = transactionData.productName.toLowerCase().includes('ml');
                itemType = isOil ? 'oil' : (isBottle ? 'bottles' : 'other');
              }

              const isOil = itemType === 'oil';
              const isBottle = itemType === 'bottles';
              const totalValue = transactionData.quantity * transactionData.unitCost;

              // Add new item
        const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: transactionData.productName,
                quantity: isOil ? 0 : transactionData.quantity,
          unitCost: transactionData.unitCost,
                totalValue: totalValue,
                type: itemType,
                grams: isOil ? transactionData.quantity : undefined,
                milliliters: isBottle && transactionData.milliliters ? transactionData.milliliters : undefined
              };
              return [...prev, newItem];
            }
          });
      }
    } else if (transactionData.type === 'expense' || transactionData.type === 'loss') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'gain') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'withdrawal') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
      const updatedPartners = partners.map(partner =>
        partner.name === transactionData.partnerName
          ? { ...partner, capital: parseFloat((partner.capital - transactionData.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
    } else if (transactionData.type === 'deposit') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
      const updatedPartners = partners.map(partner =>
        partner.name === transactionData.partnerName
          ? { ...partner, capital: parseFloat((partner.capital + transactionData.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
    } else if (transactionData.type === 'payable') {
      setCash(prev => parseFloat((prev + transactionData.amount).toFixed(2)));
    } else if (transactionData.type === 'receivable') {
      setCash(prev => parseFloat((prev - transactionData.amount).toFixed(2)));
    }

      // Add transaction to journal
      setTransactions(prev => {
        return [...prev, newTransaction];
      });
    setShowTransactionModal(false);
    } catch (error) {
      console.error('Transaction error:', error);
      alert(error.message);
      if (transactionHistory.length > 0) {
        const lastState = transactionHistory[transactionHistory.length - 1];
        setTransactions(lastState.transactions);
        setCash(lastState.cash);
        setInventory(lastState.inventory);
        setTotalSales(lastState.totalSales);
        setPartners(lastState.partners);
      }
    }
  }, [transactions, cash, totalSales, partners, inventory, transactionHistory]);

  const handleCreateProduct = (productData: any) => {
    try {
    saveCurrentState();
    
      // Validate raw materials first
      const updatedInventory = [...inventory];
      let hasError = false;
      let errorMessage = '';
      
      // Check bottles availability
      if (productData.bottlesUsed > 0) {
        const bottleIndex = updatedInventory.findIndex(item => 
          item.type === 'bottles' && item.name === productData.bottleType
        );
        if (bottleIndex >= 0) {
          if (updatedInventory[bottleIndex].quantity < productData.bottlesUsed) {
            hasError = true;
            errorMessage = `Not enough ${productData.bottleType} bottles available`;
          }
        } else {
          hasError = true;
          errorMessage = `No ${productData.bottleType} bottles found in inventory`;
        }
      }
      
      // Check oil availability
      if (productData.oilUsed > 0) {
        const oilIndex = updatedInventory.findIndex(item => 
          item.type === 'oil' && item.name === productData.oilType
        );
        if (oilIndex >= 0) {
          if ((updatedInventory[oilIndex].grams || 0) < productData.oilUsed) {
            hasError = true;
            errorMessage = `Not enough ${productData.oilType} oil available`;
          }
        } else {
          hasError = true;
          errorMessage = `No ${productData.oilType} oil found in inventory`;
        }
      }

      if (hasError) {
        throw new Error(errorMessage);
      }

      // Create transaction record
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: formatDate(),
      type: 'create',
        description: `Created ${productData.quantity} ${productData.name} using ${productData.bottlesUsed} ${productData.bottleType} bottles and ${productData.oilUsed}g of ${productData.oilType} (Cost: $${productData.totalCost.toFixed(2)})`,
      amount: productData.totalCost,
      debit: `Inventory ${productData.name} $${productData.totalCost.toFixed(2)}`,
      credit: `Raw Materials $${productData.totalCost.toFixed(2)}`
    };
    
      setTransactions(prev => [...prev, newTransaction]);
    
      // Create new product inventory item
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: productData.name,
      quantity: parseFloat(productData.quantity),
      unitCost: productData.unitCost,
      totalValue: productData.totalCost,
        type: 'created',
        sellingPrice: productData.sellingPrice
    };
    
      // Update raw materials inventory
      if (productData.bottlesUsed > 0) {
        const bottleIndex = updatedInventory.findIndex(item => 
          item.type === 'bottles' && item.name === productData.bottleType
        );
      if (bottleIndex >= 0) {
        updatedInventory[bottleIndex].quantity -= parseFloat(productData.bottlesUsed);
        updatedInventory[bottleIndex].totalValue = updatedInventory[bottleIndex].quantity * updatedInventory[bottleIndex].unitCost;
      }
      }

      if (productData.oilUsed > 0) {
        const oilIndex = updatedInventory.findIndex(item => 
          item.type === 'oil' && item.name === productData.oilType
        );
      if (oilIndex >= 0) {
        updatedInventory[oilIndex].grams = (updatedInventory[oilIndex].grams || 0) - parseFloat(productData.oilUsed);
        updatedInventory[oilIndex].totalValue = (updatedInventory[oilIndex].grams || 0) * updatedInventory[oilIndex].unitCost;
      }
    }
    
      // Add the new created product to inventory
      setInventory([...updatedInventory, newItem]);
    setShowCreateModal(false);
    } catch (error) {
      alert(error.message);
      // Revert state if needed
      if (transactionHistory.length > 0) {
        const lastState = transactionHistory[transactionHistory.length - 1];
        setTransactions(lastState.transactions);
        setCash(lastState.cash);
        setInventory(lastState.inventory);
        setTotalSales(lastState.totalSales);
        setPartners(lastState.partners);
      }
    }
  };

  const handleUndo = () => {
    if (transactionHistory.length > 0) {
      const lastState = transactionHistory[transactionHistory.length - 1];
      // Restore all state values with deep copies
      setTransactions(lastState.transactions.map(t => ({...t})));
      setCash(lastState.cash);
      setInventory(lastState.inventory.map(item => ({...item})));
      setTotalSales(lastState.totalSales);
      setPartners(lastState.partners.map(p => ({...p})));
      setTransactionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Save current state for undo
    saveCurrentState();

    // Reverse the transaction effects based on type
    if (transaction.type === 'sale') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
      setTotalSales(prev => parseFloat((prev - transaction.amount).toFixed(2)));
    } else if (transaction.type === 'purchase') {
      // Only refund cash if it was a cash purchase
      if (transaction.paymentMethod === 'cash') {
        setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
      }
      // Update inventory - reduce total value
      const updatedInventory = inventory.map(item => {
        if (item.name === transaction.productName) {
          const newTotalValue = parseFloat((item.totalValue - transaction.amount).toFixed(2));
          let newUnitCost = item.unitCost;
          if (item.type === 'oil' && item.grams && item.grams > 0) {
            newUnitCost = parseFloat((newTotalValue / item.grams).toFixed(2));
          } else if (item.quantity > 0) {
            newUnitCost = parseFloat((newTotalValue / item.quantity).toFixed(2));
          }
          return { ...item, totalValue: newTotalValue, unitCost: newUnitCost };
        }
        return item;
      });
      setInventory(updatedInventory);
    } else if (transaction.type === 'expense' || transaction.type === 'loss') {
      setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
    } else if (transaction.type === 'gain') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
    } else if (transaction.type === 'withdrawal') {
      setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
      const updatedPartners = partners.map(partner =>
        partner.name === transaction.partnerName
          ? { ...partner, capital: parseFloat((partner.capital + transaction.amount).toFixed(2)) }
          : partner
      );
      setPartners(updatedPartners);
    } else if (transaction.type === 'investing' || transaction.type === 'deposit') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
      const partnerName = transaction.partnerName || transaction.credit?.match(/^(.+?)\s+Capital\s+\$/)?.[1];
      if (partnerName) {
        const updatedPartners = partners.map(partner =>
          partner.name === partnerName
            ? { ...partner, capital: parseFloat((partner.capital - transaction.amount).toFixed(2)) }
            : partner
        );
        setPartners(updatedPartners);
      }
    } else if (transaction.type === 'payable') {
      setCash(prev => parseFloat((prev - transaction.amount).toFixed(2)));
    } else if (transaction.type === 'receivable') {
      setCash(prev => parseFloat((prev + transaction.amount).toFixed(2)));
    }

    // Remove transaction from the list
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleUpdateNote = (transactionId: string, note: string) => {
    setTransactions(prev => prev.map(t =>
      t.id === transactionId ? { ...t, note } : t
    ));
  };

  const handleManualTransaction = (manualData: { description: string, debit: string, credit: string, amount: number, isClosingEntry: boolean }) => {
    try {
      // Save current state for undo functionality
      setTransactionHistory(prev => [...prev, {
        transactions,
        cash,
        inventory,
        totalSales,
        partners
      }]);

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        date: formatDate(),
        type: 'closing',
        description: manualData.description,
        amount: manualData.amount,
        debit: manualData.debit,
        credit: manualData.credit
      };

      // Update cash based on the transaction
      if (manualData.debit.includes('Cash')) {
        setCash(prev => parseFloat((prev - manualData.amount).toFixed(2)));
      } else if (manualData.credit.includes('Cash')) {
        setCash(prev => parseFloat((prev + manualData.amount).toFixed(2)));
      }

      // Update partner capital if this is a closing entry
      if (manualData.isClosingEntry) {
        // Check if this affects a specific partner's capital
        const partnerCapitalMatch = manualData.debit.match(/^(.+?)\sCapital\s\$/);
        const partnerCapitalCreditMatch = manualData.credit.match(/^(.+?)\sCapital\s\$/);

        if (partnerCapitalMatch) {
          // Partner capital is being debited (decreased)
          const partnerName = partnerCapitalMatch[1];
          const updatedPartners = partners.map(p =>
            p.name === partnerName
              ? { ...p, capital: parseFloat((p.capital - manualData.amount).toFixed(2)) }
              : p
          );
          setPartners(updatedPartners);
        } else if (partnerCapitalCreditMatch) {
          // Partner capital is being credited (increased)
          const partnerName = partnerCapitalCreditMatch[1];
          const updatedPartners = partners.map(p =>
            p.name === partnerName
              ? { ...p, capital: parseFloat((p.capital + manualData.amount).toFixed(2)) }
              : p
          );
          setPartners(updatedPartners);
        }
      }

      // Update inventory if the transaction involves inventory
      if (manualData.debit.includes('Inventory')) {
        const productName = manualData.debit.split('$')[0].replace('Inventory ', '').trim();
        const existingItemIndex = inventory.findIndex(item => item.name === productName);
        
        if (existingItemIndex >= 0) {
          const updatedInventory = [...inventory];
          const item = updatedInventory[existingItemIndex];
          const amount = manualData.amount;
          
          if (item.type === 'oil') {
            const gramsToAdd = amount / item.unitCost;
            item.grams = (item.grams || 0) + gramsToAdd;
            item.totalValue = item.grams * item.unitCost;
        } else {
            const quantityToAdd = amount / item.unitCost;
            item.quantity += quantityToAdd;
          item.totalValue = item.quantity * item.unitCost;
        }
          
          setInventory(updatedInventory);
        }
      } else if (manualData.credit.includes('Inventory')) {
        const productName = manualData.credit.split('$')[0].replace('Inventory ', '').trim();
        const existingItemIndex = inventory.findIndex(item => item.name === productName);
        
        if (existingItemIndex >= 0) {
          const updatedInventory = [...inventory];
          const item = updatedInventory[existingItemIndex];
          const amount = manualData.amount;
          
          if (item.type === 'oil') {
            const gramsToRemove = amount / item.unitCost;
            if ((item.grams || 0) < gramsToRemove) {
              throw new Error('Not enough inventory available');
            }
            item.grams = (item.grams || 0) - gramsToRemove;
            item.totalValue = item.grams * item.unitCost;
          } else {
            const quantityToRemove = amount / item.unitCost;
            if (item.quantity < quantityToRemove) {
              throw new Error('Not enough inventory available');
            }
            item.quantity -= quantityToRemove;
            item.totalValue = item.quantity * item.unitCost;
          }
          
          setInventory(updatedInventory);
        }
      }

      setTransactions(prev => [...prev, newTransaction]);
      setShowManualModal(false);
    } catch (error) {
      alert(error.message);
      if (transactionHistory.length > 0) {
        const lastState = transactionHistory[transactionHistory.length - 1];
        setTransactions(lastState.transactions);
        setCash(lastState.cash);
        setInventory(lastState.inventory);
        setTotalSales(lastState.totalSales);
        setPartners(lastState.partners);
      }
    }
  };

  const handleSaveEdit = (updatedTransaction: Transaction) => {
    try {
      // Save current state for undo
      saveCurrentState();

      // Find the old transaction
      const oldTransaction = transactions.find(t => t.id === updatedTransaction.id);
      if (!oldTransaction) return;

      // Update debit and credit based on transaction type and amount
      if (updatedTransaction.type === 'sale') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Sales $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'purchase') {
        updatedTransaction.debit = `Inventory ${updatedTransaction.productName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = updatedTransaction.paymentMethod === 'credit'
          ? `Accounts Payable - ${updatedTransaction.creditorName || 'Supplier'} $${updatedTransaction.amount.toFixed(2)}`
          : `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'expense') {
        updatedTransaction.debit = `Expense $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'loss') {
        updatedTransaction.debit = `Loss $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'gain') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Gain $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'withdrawal') {
        updatedTransaction.debit = `Partner ${updatedTransaction.partnerName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'investing') {
        // Extract partner name from old transaction if not present
        const partnerName = updatedTransaction.partnerName || oldTransaction.credit?.match(/^(.+?)\s+Capital\s+\$/)?.[1] || 'Unknown';
        updatedTransaction.partnerName = partnerName;
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `${partnerName} Capital $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'deposit') {
        // Extract partner name from old transaction if not present
        const partnerName = updatedTransaction.partnerName || oldTransaction.credit?.match(/^(.+?)\s+Capital\s+\$/)?.[1] || 'Unknown';
        updatedTransaction.partnerName = partnerName;
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `${partnerName} Capital $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'payable') {
        updatedTransaction.debit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Accounts Payable - ${updatedTransaction.creditorName || 'Unknown'} $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'receivable') {
        updatedTransaction.debit = `Accounts Receivable - ${updatedTransaction.debtorName || 'Unknown'} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Cash $${updatedTransaction.amount.toFixed(2)}`;
      } else if (updatedTransaction.type === 'create') {
        updatedTransaction.debit = `Inventory ${updatedTransaction.productName} $${updatedTransaction.amount.toFixed(2)}`;
        updatedTransaction.credit = `Raw Materials $${updatedTransaction.amount.toFixed(2)}`;
      }

      // Update the transaction
      const updatedTransactions = transactions.map(t =>
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      setTransactions(updatedTransactions);

      // Update cash and inventory based on transaction type
      if (updatedTransaction.type === 'sale') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        setTotalSales(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'purchase') {
        // Handle cash updates based on payment method change
        const wasCashPurchase = oldTransaction.paymentMethod === 'cash';
        const isCashPurchase = updatedTransaction.paymentMethod === 'cash';

        if (wasCashPurchase && !isCashPurchase) {
          // Changed from cash to credit - refund the old amount
          setCash(prev => parseFloat((prev + oldTransaction.amount).toFixed(2)));
        } else if (!wasCashPurchase && isCashPurchase) {
          // Changed from credit to cash - deduct the new amount
          setCash(prev => parseFloat((prev - updatedTransaction.amount).toFixed(2)));
        } else if (wasCashPurchase && isCashPurchase) {
          // Both cash purchases - adjust for amount difference
          setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
        }
        // If both are credit, no cash change needed

        // Update inventory
        const updatedInventory = inventory.map(item => {
          if (item.name === updatedTransaction.productName) {
            const oldValue = oldTransaction.amount;
            const newValue = updatedTransaction.amount;
            const valueDifference = newValue - oldValue;
            const newTotalValue = parseFloat((item.totalValue + valueDifference).toFixed(2));

            // Recalculate unit cost based on new total value
            let newUnitCost = item.unitCost;
            if (item.type === 'oil' && item.grams && item.grams > 0) {
              newUnitCost = parseFloat((newTotalValue / item.grams).toFixed(2));
            } else if (item.quantity > 0) {
              newUnitCost = parseFloat((newTotalValue / item.quantity).toFixed(2));
            }

            return {
              ...item,
              totalValue: newTotalValue,
              unitCost: newUnitCost
            };
          }
          return item;
        });
        setInventory(updatedInventory);
      } else if (updatedTransaction.type === 'expense' || updatedTransaction.type === 'loss') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'gain') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'withdrawal') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
        const updatedPartners = partners.map(partner =>
          partner.name === updatedTransaction.partnerName
            ? { ...partner, capital: parseFloat((partner.capital + oldTransaction.amount - updatedTransaction.amount).toFixed(2)) }
          : partner
        );
        setPartners(updatedPartners);
      } else if (updatedTransaction.type === 'investing') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        // Extract partner name from credit field - try multiple patterns
        let partnerName = updatedTransaction.partnerName;
        if (!partnerName && updatedTransaction.credit) {
          // Try: "Name Capital $amount"
          const match1 = updatedTransaction.credit.match(/^(.+?)\s+Capital\s+\$/);
          if (match1) partnerName = match1[1];
        }
        console.log('Credit field:', updatedTransaction.credit, 'Extracted partner:', partnerName);

        if (!partnerName) {
          console.error('Cannot determine partner name from transaction');
          return;
        }

        const updatedPartners = partners.map(partner =>
          partner.name === partnerName
            ? { ...partner, capital: parseFloat((partner.capital - oldTransaction.amount + updatedTransaction.amount).toFixed(2)) }
          : partner
        );
        console.log('Updated partners:', updatedPartners);
        setPartners(updatedPartners);
      } else if (updatedTransaction.type === 'deposit') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
        const updatedPartners = partners.map(partner =>
          partner.name === updatedTransaction.partnerName
            ? { ...partner, capital: parseFloat((partner.capital - oldTransaction.amount + updatedTransaction.amount).toFixed(2)) }
          : partner
        );
        setPartners(updatedPartners);
      } else if (updatedTransaction.type === 'payable') {
        setCash(prev => parseFloat((prev - oldTransaction.amount + updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'receivable') {
        setCash(prev => parseFloat((prev + oldTransaction.amount - updatedTransaction.amount).toFixed(2)));
      } else if (updatedTransaction.type === 'create') {
        // Create transactions don't affect cash, only inventory transformation
        // Update would need complex inventory adjustments - best to prevent editing these
      }

      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Error updating transaction. Please try again.');
    }
  };


  const handleClosingEntries = (entries: Transaction[]) => {
    setTransactions(prev => [...prev, ...entries]);
    saveCurrentState();
  };

  return {
    transactionHistory,
    handlePartnerSetup,
    handleDeletePartner,
    handleTransaction,
    handleCreateProduct,
    handleUndo,
    handleDeleteTransaction,
    handleUpdateNote,
    handleManualTransaction,
    handleSaveEdit,
    handleClosingEntries,
  };
}
