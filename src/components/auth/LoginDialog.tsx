import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';
import { COUNTRY_CODES } from '@/lib/countries';
import { Link } from 'react-router-dom';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+63');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [tab, setTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPassword) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await login(loginPhone, loginPassword);
    setIsLoading(false);
    if (result.success) {
      toast({ title: 'Welcome back!', description: result.message });
      onOpenChange(false);
      navigate('/dashboard');
    } else {
      toast({ title: 'Login failed', description: result.message, variant: 'destructive' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPhone || !regPassword || !regCountryCode) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    if (!/^\d{7,15}$/.test(regPhone.replace(/\s/g, ''))) {
      toast({ title: 'Error', description: 'Please enter a valid phone number', variant: 'destructive' });
      return;
    }
    if (!agreeTerms) {
      toast({ title: 'Error', description: 'You must agree to the Terms & Conditions', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const result = await register(regUsername, regPhone, regCountryCode, regPassword);
    setIsLoading(false);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setTab('login');
      setRegUsername('');
      setRegPhone('');
      setRegPassword('');
      setAgreeTerms(false);
    } else {
      toast({ title: 'Registration failed', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
            Q
          </div>
          <DialogTitle className="text-xl">QuickDent</DialogTitle>
          <DialogDescription>Sign in or create an account to book appointments.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" /> Login
            </TabsTrigger>
            <TabsTrigger value="register" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Username or Mobile Number</Label>
                <Input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="Enter username or phone" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter password" />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button type="button" className="text-secondary font-medium hover:underline" onClick={() => setTab('register')}>Register</button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Choose a username" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(country => (
                      <SelectItem key={`${country.flag}-${country.code}`} value={country.code}>
                        {country.flag} {country.name} ({country.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-fit">
                    {regCountryCode}
                  </div>
                  <Input
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Phone number"
                    maxLength={15}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create a password" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  I agree to the{' '}
                  <Link to="/terms" className="text-secondary hover:underline" target="_blank">Terms & Conditions</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-secondary hover:underline" target="_blank">Privacy Policy</Link>
                </span>
              </label>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{' '}
                <button type="button" className="text-secondary font-medium hover:underline" onClick={() => setTab('login')}>Login</button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
