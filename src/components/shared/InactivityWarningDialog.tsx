import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface InactivityWarningDialogProps {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

export function InactivityWarningDialog({ open, secondsLeft, onStay, onLogout }: InactivityWarningDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" /> Are you still there?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You've been inactive for a while. For your security, you'll be signed out
            automatically in <span className="font-semibold text-foreground">{secondsLeft}</span> second{secondsLeft === 1 ? '' : 's'}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>Sign out</AlertDialogCancel>
          <AlertDialogAction onClick={onStay}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
