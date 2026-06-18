import type { Language } from '@/utils/translations';

type TranslateFn = (key: string) => string;

// Translates account names within debit/credit entry strings.
export const translateAccountEntry = (entry: string, t: TranslateFn): string => {
  if (!entry) return entry;
  
  // Replace account names with translations
  let translatedEntry = entry
    .replace(/Cash/g, t('cash'))
    .replace(/Revenue/g, t('revenue'))
    .replace(/Inventory/g, t('inventory'))
    .replace(/Expenses/g, t('expenses'))
    .replace(/Gain/g, t('gain'))
    .replace(/Loss/g, t('loss'))
    .replace(/Income Summary/g, t('incomeSummary'))
    .replace(/Partner Capital/g, t('partnerCapital'));
  
  // Handle partner-specific capital entries (e.g., "John Capital")
  if (entry.includes(' Capital')) {
    const partnerName = entry.split(' Capital')[0];
    if (partnerName && !['Partner', 'Income Summary'].includes(partnerName)) {
      translatedEntry = entry.replace(/ Capital/, ` ${t('capital')}`);
    }
  }
  
  return translatedEntry;
};

// Translates a transaction description string into the active language.
export const translateDescription = (description: string, language: Language, t: TranslateFn): string => {
  if (!description || language === 'en') return description;
  
  let translatedDesc = description;
  
  // Handle different description patterns
  // Pattern: "Sold X ProductName (boxed)"
  if (description.includes('Sold ')) {
    const soldMatch = description.match(/Sold (\d+(?:\.\d+)?) (.+?)(\s\(boxed\))?$/);
    if (soldMatch) {
      const [, quantity, productName, boxedPart] = soldMatch;
      const boxedText = boxedPart ? ` (${t('boxed')})` : '';
      translatedDesc = `${t('sold')} ${quantity} ${productName}${boxedText}`;
    }
  }
  
  // Pattern: "Purchased X type - ProductName" or "Purchased Xg type - ProductName"
  else if (description.includes('Purchased ')) {
    const purchasedMatch = description.match(/Purchased (.+?) (.+?) - (.+)$/);
    if (purchasedMatch) {
      const [, quantityPart, typePart, productName] = purchasedMatch;
      let translatedQuantity = quantityPart;
      let translatedType = typePart;
      
      // Handle different quantity formats
      if (quantityPart.endsWith('g')) {
        translatedQuantity = quantityPart.replace('g', t('g'));
      }
      
      // Translate product types
      const typeTranslations: { [key: string]: string } = {
        'bottles': t('bottles'),
        'oil': t('oil'),
        'box': t('box'),
        'other': t('other')
      };
      
      if (typeTranslations[typePart]) {
        translatedType = typeTranslations[typePart];
      }
      
      translatedDesc = `${t('purchased')} ${translatedQuantity} ${translatedType} - ${productName}`;
    }
  }
  
  // Pattern: "Capital withdrawal by PartnerName"
  else if (description.includes('Capital withdrawal by ')) {
    const withdrawalMatch = description.match(/Capital withdrawal by (.+)$/);
    if (withdrawalMatch) {
      const [, partnerName] = withdrawalMatch;
      translatedDesc = `${t('capitalWithdrawalBy')} ${partnerName}`;
    }
  }

  // Pattern: "Initial capital from PartnerName"
  else if (description.includes('Initial capital from ')) {
    const capitalMatch = description.match(/Initial capital from (.+)$/);
    if (capitalMatch) {
      const [, partnerName] = capitalMatch;
      translatedDesc = `${t('initialCapitalFrom')} ${partnerName}`;
    }
  }

  // Pattern: "Loan given to PartnerName"
  else if (description.includes('Loan given to ')) {
    const loanMatch = description.match(/Loan given to (.+)$/);
    if (loanMatch) {
      const [, partnerName] = loanMatch;
      translatedDesc = `${t('loanGivenTo')} ${partnerName}`;
    }
  }

  // Pattern: "Loan received from PartnerName"
  else if (description.includes('Loan received from ')) {
    const loanMatch = description.match(/Loan received from (.+)$/);
    if (loanMatch) {
      const [, partnerName] = loanMatch;
      translatedDesc = `${t('loanReceivedFrom')} ${partnerName}`;
    }
  }

  // Pattern: "Income Summary to Partner Capitals"
  else if (description.includes('Income Summary to Partner Capitals')) {
    translatedDesc = t('incomeSummaryToPartnerCapitals');
  }

  // Pattern: "Business loss"
  else if (description === 'loss') {
    translatedDesc = t('loss');
  }

  // Pattern: "Business gain"
  else if (description === 'gain') {
    translatedDesc = t('gain');
  }

  // Pattern: "Business gain" or "Business loss"
  else if (description === 'Business gain') {
    translatedDesc = t('businessGain');
  }
  else if (description === 'Business loss') {
    translatedDesc = t('businessLoss');
  }
  
  // Pattern: "Closing Entry - ..."
  else if (description.includes('Closing Entry')) {
    translatedDesc = description.replace('Closing Entry', t('closingEntry'));
  }
  
  // Pattern: "Distribution to PartnerName"
  else if (description.includes('Distribution to ')) {
    const distributionMatch = description.match(/Distribution to (.+)$/);
    if (distributionMatch) {
      const [, partnerName] = distributionMatch;
      translatedDesc = `${t('distributionTo')} ${partnerName}`;
    }
  }
  
  return translatedDesc;
};
