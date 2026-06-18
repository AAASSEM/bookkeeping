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
- **Package Manager**: npm
- **Hot Module Replacement**: Enabled via Vite with SWC

## Architecture Patterns

### Data Flow Pattern
All data operations follow this pattern:
1. **UI Component** calls a function from `useDatabase()` hook
2. **Hook function** updates local React state (optimistic update)
3. **Hook function** calls corresponding `dbService` method
4. **dbService** performs IndexedDB operation via Dexie
5. **UI re-renders** with new state automatically

### Key Transaction Types
- **Revenue**: `sale`, `gain`
- **Expenses**: `purchase`, `expense`, `loss`
- **Capital/Financing**: `investing`, `create`, `deposit`, `withdrawal`
- **Receivables/Payables**: `payable`, `receivable`
- **Adjustments**: `manual`, `closing`

### Critical Data Relationships
- Transactions are tied to partners via `partnerName` (not foreign key)
- Inventory items can be linked to transactions via `productName`
- Cash balance stored in AppSettings, updated transactionally
- TotalSales tracked separately in AppSettings for performance

## Development Workflow

### Adding New Features
1. **Database Layer**: Add/update interfaces in `src/db/database.ts` if new models needed
2. **Service Layer**: Add CRUD operations to `dbService` object in database.ts
3. **Hook Layer**: Expose new operations through `useDatabase()` hook
4. **UI Layer**: Use existing shadcn/ui components for consistency

### Form Development
- Use React Hook Form with Zod validation schemas
- Follow existing form patterns in Dashboard component
- Leverage existing shadcn/ui form components (input, select, button, etc.)

## Special Considerations

### Lovable Integration
- **Component Tagger**: `lovable-tagger` for cloud development sync
- **Project URL**: https://lovable.dev/projects/1be17daa-c242-4ce4-afbd-4b4badfff3f0
- **Auto-commit**: Changes made via Lovable are committed automatically
- **Sync Direction**: Local git pushes → Lovable, Lovable edits → git commits

When working with this codebase:
- All data operations should go through the `useDatabase()` hook
- Follow the established transaction type patterns
- Use the existing shadcn/ui components for consistency
- Maintain the debit/credit accounting structure