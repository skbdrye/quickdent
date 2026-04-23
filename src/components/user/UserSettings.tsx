import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lock, Phone, Loader2, LogOut, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import bcryptjs from 'bcryptjs';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { SuccessModal } from '@/components/shared/SuccessModal';

export default function UserSettings() {
  const { toast } = useToast();
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const getLocalNumber = (fullPhone: string, countryCode: string) => {
    if (fullPhone.startsWith(countryCode)) {
      return fullPhone.substring(countryCode.length);
    }
    if (fullPhone.startsWith('0')) {
      return fullPhone.substring(1);
    }
    return fullPhone;
  };

  const countryCode = user?.country_code || '+63';
  const originalLocalNumber = user?.phone ? getLocalNumber(user.phone, countryCode) : '';

  const [localNumber, setLocalNumber] = useState(originalLocalNumber);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });

  const phoneHasChanged = useMemo(() => {
    return localNumber !== originalLocalNumber;
  }, [localNumber, originalLocalNumber]);

  const passwordHasChanges = useMemo(() => {
    return currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;
  }, [currentPassword, newPassword, confirmPassword]);

  const maxDigits = countryCode === '+63' ? 10 : 15;

  const handlePhoneInput = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (countryCode === '+63') {
      if (digits.startsWith('0')) digits = digits.slice(1);
      if (digits.length >= 1 && digits[0] !== '9') digits = '9' + digits.replace(/^9?/, '').slice(0, 9);
    }
    if (digits.length <= maxDigits) {
      setLocalNumber(digits);
    }
  };

  // Password validation
  const pwChecks = useMemo(() => ({
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
  }), [newPassword]);

  const pwValid = pwChecks.length && pwChecks.upper && pwChecks.lower && pwChecks.digit;

  async function initiatePhoneUpdate() {
    if (!user || !localNumber.trim()) return;
    if (!phoneHasChanged) return;

    if (countryCode === '+63' && !/^9\d{9}$/.test(localNumber)) {
      toast({ title: 'Invalid Number', description: 'PH mobile must be exactly 10 digits and start with 9 (full local format is 11 digits with leading 0).', variant: 'destructive' });
      return;
    }

    const fullPhone = `${countryCode}${localNumber}`;

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', fullPhone)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      toast({ title: 'Already Taken', description: 'This phone number is already registered', variant: 'destructive' });
      return;
    }

    // Show OTP verification
    setPendingPhone(fullPhone);
    setShowPhoneOtp(true);
  }

  async function completePhoneUpdate() {
    if (!user || !pendingPhone) return;
    setShowPhoneOtp(false);
    setSavingPhone(true);

    const { error } = await supabase
      .from('users')
      .update({ phone: pendingPhone })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update phone', variant: 'destructive' });
    } else {
      setUser({ ...user, phone: pendingPhone });
      await supabase
        .from('patient_profiles')
        .update({ phone: pendingPhone })
        .eq('user_id', user.id);
      setSuccessModal({
        open: true,
        title: 'Phone Updated',
        description: 'Your phone number has been verified and updated successfully.',
      });
    }
    setSavingPhone(false);
    setPendingPhone('');
  }

  async function updatePassword() {
    if (!user) return;
    if (!passwordHasChanges) return;

    if (newPassword !== confirmPassword) {
      toast({ title: 'Mismatch', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    if (!pwValid) {
      toast({ title: 'Weak Password', description: 'Password does not meet the requirements above', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);

    const { data: userData } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData) {
      toast({ title: 'Error', description: 'User not found', variant: 'destructive' });
      setSavingPassword(false);
      return;
    }

    const passwordMatch = await bcryptjs.compare(currentPassword, userData.password_hash);
    if (!passwordMatch) {
      toast({ title: 'Wrong Password', description: 'Current password is incorrect', variant: 'destructive' });
      setSavingPassword(false);
      return;
    }

    const hashedNewPassword = await bcryptjs.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedNewPassword })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update password', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <div className="flex gap-2 mt-1.5">
              <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground min-w-[64px] justify-center font-medium select-none">
                {countryCode}
              </div>
              <Input
                value={localNumber}
                onChange={(e) => handlePhoneInput(e.target.value)}
                placeholder={countryCode === '+63' ? '9XXXXXXXXX' : 'Phone number'}
                maxLength={maxDigits}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {countryCode === '+63'
                ? `Enter your 10-digit number without the leading 0 (${localNumber.length}/${maxDigits} digits)`
                : `Enter your phone number (${localNumber.length} digits)`}
            </p>
          </div>
          <Button onClick={initiatePhoneUpdate} disabled={savingPhone || !phoneHasChanged}>
            {savingPhone ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Update Phone'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <div className="relative">
              <Input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="pr-10" />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>New Password</Label>
            <div className="relative">
              <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="pr-10" />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                {[
                  { check: pwChecks.length, label: 'At least 8 characters' },
                  { check: pwChecks.upper, label: 'At least 1 uppercase letter' },
                  { check: pwChecks.lower, label: 'At least 1 lowercase letter' },
                  { check: pwChecks.digit, label: 'At least 1 digit' },
                ].map(({ check, label }) => (
                  <p key={label} className={`text-xs ${check ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {check ? '\u2713' : '\u2022'} {label}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <div className="relative">
              <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="pr-10" />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
          <Button onClick={updatePassword} disabled={savingPassword || !passwordHasChanges || !pwValid}>
            {savingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Sign Out</p>
              <p className="text-xs text-muted-foreground">Log out from your account on this device</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                logout();
                navigate('/');
                toast({ title: 'Signed out', description: 'You have been logged out successfully.' });
              }}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OTP Verification for Phone Change */}
      <OtpVerification
        open={showPhoneOtp}
        onOpenChange={(open) => { setShowPhoneOtp(open); if (!open) setPendingPhone(''); }}
        phone={pendingPhone}
        onVerified={completePhoneUpdate}
      />

      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        onClose={() => setSuccessModal({ open: false, title: '', description: '' })}
      />
    </div>
  );
}
