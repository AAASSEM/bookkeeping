import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface ExportStatusDialogsProps {
  t: (key: string) => string;
  showSuccess: boolean;
  onSuccessOpenChange: (open: boolean) => void;
  showError: boolean;
  onErrorOpenChange: (open: boolean) => void;
  exportErrorMessage: string;
}

export const ExportStatusDialogs = ({
  t,
  showSuccess,
  onSuccessOpenChange,
  showError,
  onErrorOpenChange,
  exportErrorMessage,
}: ExportStatusDialogsProps) => {
  return (
    <>
      {/* Export Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={onSuccessOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exportAllStatements')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exportSuccessMessage') || 'Financial statements exported successfully!'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => onSuccessOpenChange(false)}>
              {t('ok') || 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Error Dialog */}
      <AlertDialog open={showError} onOpenChange={onErrorOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('error') || 'Error'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exportErrorMessage') || 'Error exporting data. Please try again.'}
              {exportErrorMessage && (
                <div className="mt-2 text-sm text-destructive">
                  {exportErrorMessage}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => onErrorOpenChange(false)}>
              {t('ok') || 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
