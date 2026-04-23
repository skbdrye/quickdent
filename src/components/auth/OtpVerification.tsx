import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { ShieldCheck, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OtpVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  onVerified: () => void;
}

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function OtpVerification({ open, onOpenChange, phone, onVerified }: OtpVerificationProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const expiryRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtp = useCallback(() => {
    const code = generateOTP();
    setGeneratedOtp(code);
    setOtp('');
    expiryRef.current = Date.now() + OTP_EXPIRY_MS;
    setTimeLeft(300); // 5 minutes in seconds
    setCanResend(false);

    // Since Semaphore API is not yet purchased, the OTP is shown inside
    // the verification dialog itself. No toast notification.
  }, []);

  useEffect(() => {
    if (open) {
      sendOtp();
    } else {
      setOtp('');
      setGeneratedOtp('');
      setTimeLeft(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, sendOtp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (open && generatedOtp) setCanResend(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, open, generatedOtp]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      toast({ title: 'Incomplete Code', description: 'Please enter the full 6-digit code.', variant: 'destructive' });
      return;
    }

    if (Date.now() > expiryRef.current) {
      toast({ title: 'Code Expired', description: 'Your OTP has expired. Please request a new one.', variant: 'destructive' });
      setCanResend(true);
      return;
    }

    setIsVerifying(true);

    // Simulate brief verification delay
    await new Promise(r => setTimeout(r, 600));

    if (otp === generatedOtp) {
      setIsVerifying(false);
      onVerified();
      onOpenChange(false);
    } else {
      setIsVerifying(false);
      toast({ title: 'Invalid Code', description: 'The code you entered is incorrect. Please try again.', variant: 'destructive' });
      setOtp('');
    }
  };

  const handleResend = () => {
    sendOtp();
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const maskedPhone = phone.length > 4
    ? phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4)
    : phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-7 h-7 text-secondary" />
          </div>
          <DialogTitle className="text-xl">Verify Your Phone</DialogTitle>
          <DialogDescription className="text-center">
            We sent a 6-digit verification code to <strong className="text-foreground">{maskedPhone}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* OTP Display (temporary - remove when Semaphore is active) */}
          <div className="w-full px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Demo Mode - Your OTP code:</p>
            <p className="text-2xl font-bold tracking-[0.3em] text-amber-800 dark:text-amber-300 font-mono">{generatedOtp}</p>
          </div>

          {/* OTP Input */}
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {/* Timer */}
            {timeLeft > 0 ? (
              <p className="text-sm text-muted-foreground">
                Code expires in <span className="font-medium text-foreground">{formatTimeLeft(timeLeft)}</span>
              </p>
            ) : (
              <p className="text-sm text-destructive font-medium">Code expired</p>
            )}
          </div>

          {/* Actions */}
          <div className="w-full space-y-3">
            <Button
              onClick={handleVerify}
              disabled={isVerifying || otp.length !== OTP_LENGTH}
              className="w-full gap-2"
            >
              {isVerifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Verify</>
              )}
            </Button>

            <div className="text-center">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm text-secondary font-medium hover:underline inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resend Code
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Didn't receive the code? Wait {formatTimeLeft(timeLeft)} to resend
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
