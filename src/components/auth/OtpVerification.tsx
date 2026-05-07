import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { ShieldCheck, RotateCcw, Loader2, MessageSquareText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { smsAPI, type OtpPurpose } from '@/lib/sms';

import type React from 'react';

interface OtpVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  onVerified: () => void;
  /** Differentiates the OTP record so a registration code cannot be used to reset a password. */
  purpose?: OtpPurpose;
  /** Optional override title shown in the dialog header. */
  title?: string;
  /** Optional override description above the input. */
  description?: React.ReactNode;
}

const OTP_LENGTH = 6;

export function OtpVerification({
  open,
  onOpenChange,
  phone,
  onVerified,
  purpose = 'registration',
  title = 'Verify Your Phone',
  description,
}: OtpVerificationProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const expiryRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtp = useCallback(async () => {
    setIsSending(true);
    setOtp('');
    setCanResend(false);
    const res = await smsAPI.sendOtp(phone, purpose);
    setIsSending(false);
    if (!res.ok) {
      toast({
        title: 'Could not send code',
        description: res.error || 'Please try again in a moment.',
        variant: 'destructive',
      });
      setCanResend(true);
      return;
    }
    setHasSent(true);
    expiryRef.current = res.expiresAt
      ? new Date(res.expiresAt).getTime()
      : Date.now() + 5 * 60 * 1000;
    const secs = Math.max(1, Math.floor((expiryRef.current - Date.now()) / 1000));
    setTimeLeft(secs);
    toast({
      title: 'Verification code sent',
      description: 'Check your text messages for the 6-digit code.',
    });
  }, [phone, purpose, toast]);

  useEffect(() => {
    if (open) {
      void sendOtp();
    } else {
      setOtp('');
      setHasSent(false);
      setTimeLeft(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (open && hasSent) setCanResend(true);
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
  }, [timeLeft, open, hasSent]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      toast({ title: 'Incomplete Code', description: 'Please enter the full 6-digit code.', variant: 'destructive' });
      return;
    }
    setIsVerifying(true);
    const res = await smsAPI.verifyOtp(phone, otp, purpose);
    setIsVerifying(false);
    if (!res.ok) {
      toast({
        title: 'Invalid Code',
        description: res.error || 'The code you entered is incorrect or has expired.',
        variant: 'destructive',
      });
      setOtp('');
      return;
    }
    onVerified();
    onOpenChange(false);
  };

  const handleResend = () => {
    void sendOtp();
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const maskedPhone = phone.length > 4
    ? phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
    : phone;

  const desc = description || (
    <>We sent a 6-digit verification code to <strong className="text-foreground">{maskedPhone}</strong></>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ring-1 ring-secondary/20"
               style={{ background: 'var(--gradient-mint)' }}>
            <ShieldCheck className="w-7 h-7 text-secondary" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {desc}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Helper hint */}
          <div className="w-full px-4 py-2.5 rounded-xl bg-mint/40 border border-secondary/15 flex items-center gap-2.5">
            <MessageSquareText className="w-4 h-4 text-secondary shrink-0" />
            <p className="text-xs text-muted-foreground">
              The code arrives via SMS from <span className="font-medium text-foreground">QUICKDENT</span>. It is valid for 5 minutes.
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
              disabled={isSending}
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
            {isSending ? (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending code…
              </p>
            ) : timeLeft > 0 ? (
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
              disabled={isVerifying || isSending || otp.length !== OTP_LENGTH}
              className="w-full gap-2"
            >
              {isVerifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Verify</>
              )}
            </Button>

            <div className="text-center">
              {canResend && !isSending ? (
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
