import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ResetAction() {
  const { resetTree } = useOSTStore();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Tree</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset your Opportunity Solution Tree to the default example. All your changes
            will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={resetTree}>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
