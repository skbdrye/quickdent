import { useState, useMemo, memo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { OtpVerification } from './OtpVerification';
import { SuccessModal } from '@/components/shared/SuccessModal';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When the password is successfully reset, the parent receives the username/phone so it can pre-fill the login form. */
  onResetComplete?: (loginIdentifier: string) => void;
}

function validatePassword(val: string) {
  return {
    minLength: val.length >= 8,
    hasUpper: /[A-Z]/.test(val),
    hasLower: /[a-z]/.test(val),
    hasDigit: /\d/.test(val),
  };
}

const ValidationItem = memo(function ValidationItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-success' : 'text-muted-foreground'}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );
});

type Step = 'identify' | 'reset';

export function ForgotPasswordDialog({ open, onOpenChange, onResetComplete }: ForgotPasswordDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [resolvedPhone, setResolvedPhone] = useState('');
  const [resolvedUsername, setResolvedUsername] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValid = useMemo(() => validatePassword(newPassword), [newPassword]);
  const isPasswordOk = passwordValid.minLength && passwordValid.hasUpper && passwordValid.hasLower && passwordValid.hasDigit;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const reset = useCallback(() => {
    setStep('identify');
    setIdentifier('');
    setResolvedPhone('');
    setResolvedUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPwd(false);
    setSuccess(false);
    setShowOtp(false);
  }, []);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast({ title: 'Enter your phone or username', description: 'Tell us how to find your account.', variant: 'destructive' });
      return;
    }
    setIsLooking(true);
    const found = await authAPI.findUserForReset(identifier.trim());
    setIsLooking(false);
    if (!found.success) {
      toast({ title: 'Not found', description: found.message, variant: 'destructive' });
      return;
    }
    setResolvedPhone(found.phone);
    setResolvedUsername(found.username);
    setShowOtp(true);
  };

  const handleOtpVerified = () => {
    setShowOtp(false);
    setStep('reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordOk) {
      toast({ title: 'Weak password', description: 'Password must have 8+ chars, uppercase, lowercase, and a digit.', variant: 'destructive' });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: 'Passwords do not match', description: 'Please confirm your new password.', variant: 'destructive' });
      return;
    }
    setIsResetting(true);
    const res = await authAPI.resetPasswordByPhone(resolvedPhone, newPassword);
    setIsResetting(false);
    if (!res.success) {
      toast({ title: 'Could not reset', description: res.message, variant: 'destructive' });
      return;
    }
    setSuccess(true);
  };

  const maskedPhone = resolvedPhone.length > 4
    ? resolvedPhone.slice(0, -4).replace(/\d/g, '*') + resolvedPhone.slice(-4)
    : resolvedPhone;

  return (
    <>
      <Dialog open={open && !showOtp} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ring-1 ring-secondary/20"
                 style={{ background: 'var(--gradient-mint)' }}>
              <KeyRound className="w-7 h-7 text-secondary" />
            </div>
            <DialogTitle className="text-xl">
              {step === 'identify' ? 'Forgot your password?' : 'Set a new password'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {step === 'identify'
                ? "Enter your username or registered mobile and we'll text you a verification code."
                : <>For account <strong className="text-foreground">{resolvedUsername}</strong> ({maskedPhone}).</>}
            </DialogDescription>
          </DialogHeader>

          {step === 'identify' ? (
            <form onSubmit={handleLookup} className="space-y-4 mt-2">
              <div>
                <Label>Username or Mobile Number</Label>
                <Input
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="username or 09XXXXXXXXX"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isLooking}>
                {isLooking ? <><Loader2 className="w-4 h-4 animate-spin" /> Looking up…</> : <>Send verification code <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4 mt-2">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <ValidationItem ok={passwordValid.minLength} label="At least 8 characters" />
                    <ValidationItem ok={passwordValid.hasUpper} label="At least 1 uppercase letter" />
                    <ValidationItem ok={passwordValid.hasLower} label="At least 1 lowercase letter" />
                    <ValidationItem ok={passwordValid.hasDigit} label="At least 1 digit" />
                  </div>
                )}
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                />
                {confirmPassword.length > 0 && (
                  <ValidationItem ok={passwordsMatch} label="Passwords match" />
                )}
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isResetting || !isPasswordOk || !passwordsMatch}>
                {isResetting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : <>Reset password</>}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <OtpVerification
        open={showOtp}
        onOpenChange={(o) => setShowOtp(o)}
        phone={resolvedPhone}
        purpose="password_reset"
        onVerified={handleOtpVerified}
        title="Verify it's you"
        description={<>We sent a 6-digit code to <strong className="text-foreground">{maskedPhone}</strong> to confirm the password reset.</>}
      />

      <SuccessModal
        open={success}
        title="Password Updated"
        description="Your password has been reset successfully. Please log in with your new password."
        onClose={() => {
          const ident = resolvedUsername || resolvedPhone;
          setSuccess(false);
          handleClose(false);
          onResetComplete?.(ident);
        }}
      />
    </>
  );
}
