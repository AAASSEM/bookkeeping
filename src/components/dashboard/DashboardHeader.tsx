import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { X, Download, Plus, FileText, Moon, Sun, Undo2, Settings, Languages } from 'lucide-react';
import type { Language } from '@/utils/translations';

interface DashboardHeaderProps {
  t: (key: string) => string;
  darkMode: boolean;
  language: Language;
  undoDisabled: boolean;
  onUndo: () => void;
  onOpenClosingEntries: () => void;
  onExport: () => void;
  onAddPartner: () => void;
  onClearData: () => void;
  onToggleDarkMode: () => void;
  onToggleLanguage: () => void;
}

export const DashboardHeader = ({
  t,
  darkMode,
  language,
  undoDisabled,
  onUndo,
  onOpenClosingEntries,
  onExport,
  onAddPartner,
  onClearData,
  onToggleDarkMode,
  onToggleLanguage,
}: DashboardHeaderProps) => {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2 header-title">{t('businessDashboard')}</h1>
        <p className="text-sm sm:text-base text-secondary header-subtitle">{t('trackInventory')}</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
        <Button
          onClick={onUndo}
          disabled={undoDisabled}
          variant="outline"
          className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          size="sm"
        >
          <Undo2 className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t('undo')}</span>
        </Button>
        <Button
          onClick={onOpenClosingEntries}
          variant="outline"
          className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          size="sm"
        >
          <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden md:inline">{t('closingEntries')}</span>
        </Button>
        <Button
          onClick={onExport}
          variant="outline"
          className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          size="sm"
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden md:inline">{t('exportAllStatements')}</span>
        </Button>

        <Button
          onClick={onAddPartner}
          variant="outline"
          className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          size="sm"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t('addPartner')}</span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial" size="sm">
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('clearData')}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('clearAllData')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('clearDataWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={onClearData} className="bg-red-600 hover:bg-red-700">
                {t('clearData')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="border-border"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onToggleDarkMode} className="flex items-center gap-2">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {darkMode ? t('lightMode') : t('darkMode')}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onToggleLanguage} className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {language === 'en' ? 'العربية' : 'English'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
