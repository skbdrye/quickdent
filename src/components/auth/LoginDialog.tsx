import { useState, useEffect, useMemo, useCallback, memo, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Eye, EyeOff, Check, X } from 'lucide-react';
import { COUNTRY_CODES } from '@/lib/countries';
import { Link } from 'react-router-dom';

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
      if (cleanPhone.length !== 10) {
        toast({ title: 'Invalid Number', description: 'Philippine phone number must be exactly 10 digits (e.g. 9XXXXXXXXX)', variant: 'destructive', duration: 2500 });
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

    setIsLoading(true);
    const result = await register(regUsername, regPhone, regCountryCode, regPassword);
    setIsLoading(false);
    if (result.success) {
      toast({ title: 'Success', description: result.message, duration: 2500 });
      setTab('login');
      setRegUsername('');
      setRegPhone('');
      setRegPassword('');
      setAgreeTerms(false);
    } else {
      toast({ title: 'Registration failed', description: result.message, variant: 'destructive', duration: 2500 });
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
  // Phone input handler - filter non-digits
  const handlePhoneChange = useCallback((val: string) => {
    setRegPhone(val.replace(/\D/g, ''));
  }, []);

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
    </Dialog>
  );
}
