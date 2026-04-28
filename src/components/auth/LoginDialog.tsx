import { useState, useEffect, useMemo, useCallback, memo, useTransition, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Eye, EyeOff, Check, X } from 'lucide-react';
import { COUNTRY_CODES } from '@/lib/countries';
import { Link } from 'react-router-dom';
import { OtpVerification } from './OtpVerification';
import { SuccessModal } from '@/components/shared/SuccessModal';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Validation helpers
function validateUsername(val: string) {
  return {
    minLength: val.length >= 6,
    validChars: /^[a-zA-Z0-9_]*$/.test(val),
  };
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

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const remembered = localStorage.getItem('qd_remember_user') || '';
  const [loginPhone, setLoginPhone] = useState(remembered);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!remembered);
  const [regUsername, setRegUsername] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+63');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [tab, setTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();
  const [showOtp, setShowOtp] = useState(false);
  const [pendingRegData, setPendingRegData] = useState<{ username: string; phone: string; countryCode: string; password: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });
  // Persist the just-registered username independently so that even if
  // `pendingRegData` is cleared (e.g. by the OTP dialog closing), the
  // SuccessModal close handler can still pre-fill the Login form.
  const justRegisteredUsernameRef = useRef<string | null>(null);

  // Refresh remembered user when dialog opens
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('qd_remember_user') || '';
      if (saved) {
        setLoginPhone(saved);
        setRememberMe(true);
      }
    }
  }, [open]);

  const { login, register } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validation state (computed, no API calls)
  const usernameValid = useMemo(() => validateUsername(regUsername), [regUsername]);
  const passwordValid = useMemo(() => validatePassword(regPassword), [regPassword]);
  const isUsernameOk = usernameValid.minLength && usernameValid.validChars;
  const isPasswordOk = passwordValid.minLength && passwordValid.hasUpper && passwordValid.hasLower && passwordValid.hasDigit;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPassword) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields', variant: 'destructive', duration: 2500 });
      return;
    }
    setIsLoading(true);
    const result = await login(loginPhone, loginPassword);
    setIsLoading(false);
    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('qd_remember_user', loginPhone);
      } else {
        localStorage.removeItem('qd_remember_user');
      }
      // Check if first time login (onboarding not completed)
      const user = useAuthStore.getState().user;
      const isFirstTime = user && !user.onboarding_completed;
      toast({
        title: isFirstTime ? 'Welcome to QuickDent' : 'Welcome back!',
        description: result.message,
        duration: 2500,
      });
      onOpenChange(false);
      navigate('/dashboard');
    } else {
      toast({ title: 'Login failed', description: result.message, variant: 'destructive', duration: 2500 });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPhone || !regPassword || !regCountryCode) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields to register', variant: 'destructive', duration: 2500 });
      return;
    }
    if (!isUsernameOk) {
      toast({ title: 'Invalid Username', description: 'Username must be at least 6 characters (letters, numbers, underscore only)', variant: 'destructive', duration: 2500 });
      return;
    }
    if (!isPasswordOk) {
      toast({ title: 'Weak Password', description: 'Password must have 8+ chars, uppercase, lowercase, and a digit', variant: 'destructive', duration: 2500 });
      return;
    }
    const cleanPhone = regPhone.replace(/\s/g, '');
    if (regCountryCode === '+63') {
      if (!/^9\d{9}$/.test(cleanPhone)) {
        toast({ title: 'Invalid Number', description: 'PH mobile must be exactly 10 digits and start with 9 (e.g. 9XXXXXXXXX). With the leading 0 the full number is 11 digits.', variant: 'destructive', duration: 2500 });
        return;
      }
    } else if (!/^\d{7,15}$/.test(cleanPhone)) {
      toast({ title: 'Invalid Number', description: 'Please enter a valid phone number (7-15 digits)', variant: 'destructive', duration: 2500 });
      return;
    }
    if (!agreeTerms) {
      toast({ title: 'Terms Required', description: 'Please agree to the Terms & Conditions to proceed', variant: 'destructive', duration: 2500 });
      return;
    }

    // Pre-flight: confirm username + phone are still available BEFORE we
    // burn an OTP. Otherwise the user wastes a code only to be told the
    // account already exists at the final "create account" step.
    setIsLoading(true);
    try {
      const check = await authAPI.checkAvailability(regUsername, cleanPhone, regCountryCode);
      if (!check.available) {
        const bad = check as { available: false; field: 'username' | 'phone'; message: string };
        toast({
          title: bad.field === 'username' ? 'Username Unavailable' : 'Phone Already Registered',
          description: bad.message,
          variant: 'destructive',
          duration: 3500,
        });
        return;
      }
    } finally {
      setIsLoading(false);
    }

    // Show OTP verification before completing registration
    const fullPhone = `${regCountryCode}${cleanPhone}`;
    setPendingRegData({ username: regUsername, phone: cleanPhone, countryCode: regCountryCode, password: regPassword });
    setShowOtp(true);
  };

  const handleOtpVerified = async () => {
    if (!pendingRegData) return;
    // Snapshot the username before any state change so we can pre-fill the
    // login form even after the OTP dialog clears `pendingRegData`.
    const snapshot = pendingRegData;
    justRegisteredUsernameRef.current = snapshot.username;
    setShowOtp(false);
    setIsLoading(true);
    const result = await register(snapshot.username, snapshot.phone, snapshot.countryCode, snapshot.password);
    setIsLoading(false);
    if (result.success) {
      // Force the parent dialog open: an exit click during OTP could have
      // closed it, but we still want the user to land on the Login tab.
      onOpenChange(true);
      setTab('login');
      setLoginPhone(snapshot.username);
      setLoginPassword('');
      setShowLoginPassword(false);
      setRegUsername('');
      setRegPhone('');
      setRegPassword('');
      setAgreeTerms(false);
      setPendingRegData(null);
      setSuccessModal({
        open: true,
        title: 'Registration Successful!',
        description: 'Your phone has been verified and your account has been created. You can now login.',
      });
    } else {
      justRegisteredUsernameRef.current = null;
      toast({ title: 'Registration failed', description: result.message, variant: 'destructive', duration: 2500 });
      setPendingRegData(null);
    }
  };

  // Username input handler - filter out disallowed special chars
  const handleUsernameChange = useCallback((val: string) => {
    // Only allow letters, digits, underscore
    const filtered = val.replace(/[^a-zA-Z0-9_]/g, '');
    startTransition(() => setRegUsername(filtered));
  }, [startTransition]);

  // Password input handler - use deferred state for non-blocking validation display
  const handlePasswordChange = useCallback((val: string) => {
    startTransition(() => setRegPassword(val));
  }, [startTransition]);
  // Phone input handler - filter non-digits + enforce PH format (leading 9, max 10 digits)
  const handlePhoneChange = useCallback((val: string) => {
    let next = val.replace(/\D/g, '');
    if (regCountryCode === '+63') {
      // Strip an accidental leading 0 (PH local format) — input expects 9XXXXXXXXX
      if (next.startsWith('0')) next = next.slice(1);
      // Enforce that the first digit is 9 (PH mobile)
      if (next.length >= 1 && next[0] !== '9') next = '9' + next.replace(/^9?/, '').slice(0, 9);
      next = next.slice(0, 10);
    }
    setRegPhone(next);
  }, [regCountryCode]);

  // Memoize country code options to prevent re-rendering 200+ items on every keystroke
  const countryOptions = useMemo(() => (
    COUNTRY_CODES.map(c => (
      <SelectItem key={`${c.code}-${c.flag}`} value={c.code}>
        {c.flag} {c.name} ({c.code})
      </SelectItem>
    ))
  ), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-12 h-12 rounded-xl overflow-hidden mb-2">
            <img src="/logo.png" alt="QuickDent" className="w-full h-full object-contain" />
          </div>
          <DialogTitle>QuickDent</DialogTitle>
          <DialogDescription>Sign in or create an account to book appointments.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login"><LogIn className="w-4 h-4 mr-1.5" /> Login</TabsTrigger>
            <TabsTrigger value="register"><UserPlus className="w-4 h-4 mr-1.5" /> Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <Label>Username or Mobile Number</Label>
                <Input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="Enter username, +63... or 09..." />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button type="button" onClick={() => setTab('register')} className="text-secondary font-medium hover:underline">Register</button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3 mt-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={regUsername}
                  onChange={e => handleUsernameChange(e.target.value)}
                  placeholder="Choose a username"
                  maxLength={30}
                />
                {regUsername.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <ValidationItem ok={usernameValid.minLength} label="At least 6 characters" />
                    <ValidationItem ok={usernameValid.validChars} label="Letters, numbers, and underscore only" />
                  </div>
                )}
              </div>
              <div>
                <Label>Country</Label>
                <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryOptions}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground min-w-[60px] justify-center shrink-0">
                    {regCountryCode}
                  </div>
                  <Input
                    value={regPhone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder={regCountryCode === '+63' ? '9XXXXXXXXX' : 'Phone number'}
                    maxLength={regCountryCode === '+63' ? 10 : 15}
                    className="flex-1 min-w-0"
                  />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => handlePasswordChange(e.target.value)}
                    placeholder="Create a password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regPassword.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <ValidationItem ok={passwordValid.minLength} label="At least 8 characters" />
                    <ValidationItem ok={passwordValid.hasUpper} label="At least 1 uppercase letter" />
                    <ValidationItem ok={passwordValid.hasLower} label="At least 1 lowercase letter" />
                    <ValidationItem ok={passwordValid.hasDigit} label="At least 1 digit" />
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="mt-1 accent-primary" />
                <span className="text-xs text-muted-foreground">
                  I agree to the{' '}
                  <Link to="/terms" className="text-secondary hover:underline" target="_blank">Terms & Conditions</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-secondary hover:underline" target="_blank">Privacy Policy</Link>
                </span>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || (regUsername.length > 0 && !isUsernameOk) || (regPassword.length > 0 && !isPasswordOk)}>
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('login')} className="text-secondary font-medium hover:underline">Login</button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* OTP Verification */}
      <OtpVerification
        open={showOtp}
        onOpenChange={(open) => { setShowOtp(open); if (!open) setPendingRegData(null); }}
        phone={pendingRegData ? `${pendingRegData.countryCode}${pendingRegData.phone}` : ''}
        onVerified={handleOtpVerified}
      />

      {/* Registration Success Modal */}
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        onClose={() => {
          setSuccessModal({ open: false, title: '', description: '' });
          // Always make sure the user lands on the Login tab with their
          // brand-new username pre-filled — even if they tapped outside or
          // the OTP dialog cleared transient state.
          const uname = justRegisteredUsernameRef.current;
          onOpenChange(true);
          setTab('login');
          if (uname) setLoginPhone(uname);
          setLoginPassword('');
          setShowLoginPassword(false);
          justRegisteredUsernameRef.current = null;
          setPendingRegData(null);
        }}
      />
    </Dialog>
  );
}
