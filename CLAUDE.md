# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tiny-business-book** is a comprehensive React-based bookkeeping application for small businesses. It provides financial transaction management, inventory tracking, partner management, and financial reporting with Excel export capabilities.

## Development Commands

```bash
# Development
npm run dev          # Start development server on port 3003
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint checking
npm run preview      # Preview production build

# Setup
npm install          # Install dependencies
```

## Technology Stack

- **Frontend**: React 18.3.1 + TypeScript 5.5.3
- **Build Tool**: Vite 5.4.1
- **Database**: IndexedDB via Dexie ORM with localStorage migration
- **UI**: shadcn/ui components on Radix UI primitives
- **Styling**: Tailwind CSS with dark mode support
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack React Query
- **Export**: xlsx library for Excel functionality
- **Charts**: Recharts for financial visualizations

## Architecture

### Database Layer (`src/db/database.ts`)
- **IndexedDB** with Dexie ORM for client-side persistence
- **Core Models**: Transaction, InventoryItem, Partner, AppSettings
- **Migration System**: Automatic localStorage to IndexedDB migration
- **CRUD Operations**: Centralized in `dbService` object

### State Management (`src/hooks/useDatabase.ts`)
- **Custom Hook Pattern**: `useDatabase()` centralizes all state and database operations
- **Reactive Updates**: Automatic UI updates when data changes
- **Optimistic Updates**: Local state updates before database sync

### Business Domain

**Transaction Types**: purchase, sale, expense, withdrawal, create, gain, loss, closing, manual, investing, deposit, payable, receivable

**Inventory Categories**: oil, bottles, box, other, created

**Key Features**:
- Debit/credit accounting system
- Multi-language support (English/Arabic)
- Dark mode theming
- Financial statements (Income Statement, Balance Sheet)
- Excel export functionality
- Partner-based transaction filtering

## File Structure

```
src/
├── components/      # UI components (shadcn/ui based)
├── pages/           # Page components
├── db/              # Database layer and models
├── hooks/           # Custom React hooks (useDatabase is primary)
├── utils/           # Utility functions and translations
├── lib/             # Reusable library functions
└── types/           # TypeScript interfaces
```

## Development Environment

- **Port**: Development server runs on port 3003
- **Node.js**: v18.20.8+
- **Package Manager**: npm
- **Hot Module Replacement**: Enabled via Vite
- **TypeScript**: Configured with relaxed strictness for development speed

## Key Business Logic

### Financial Calculations
- **COGS**: Cost of Goods Sold calculations from inventory
- **Cash Balance**: Real-time updates from transactions
- **Profit Margins**: Per-product profitability tracking
- **Partner Splits**: Capital contribution and profit distribution

### Data Persistence
- **Client-side Only**: No backend server required
- **Offline Capable**: Full functionality without internet
- **Data Migration**: Seamless upgrade from localStorage to IndexedDB

## Special Considerations

### Lovable Integration
- **Component Tagger**: `lovable-tagger` for cloud development sync
- **Project URL**: https://lovable.dev/projects/1be17daa-c242-4ce4-afbd-4b4badfff3f0
- **Auto-commit**: Changes made via Lovable are committed automatically

### Form Validation
- **Zod Schemas**: All forms use Zod for validation
- **Type Safety**: Full TypeScript integration with database models

### UI Components
- **shadcn/ui**: Consistent design system
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Theming**: CSS custom properties for dark/light mode

When working with this codebase:
- All data operations should go through the `useDatabase()` hook
- Follow the established transaction type patterns
- Use the existing shadcn/ui components for consistency
- Maintain the debit/credit accounting structure