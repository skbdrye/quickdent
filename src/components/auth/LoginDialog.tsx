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
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-2">Q</div>
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
                <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter password" />
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
                <Input value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Choose a username" />
              </div>
              <div>
                <Label>Country</Label>
                <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(c => (
                      <SelectItem key={`${c.code}-${c.flag}`} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground min-w-[60px] justify-center">
                    {regCountryCode}
                  </div>
                  <Input
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Phone number"
                    maxLength={15}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create a password" />
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
              <Button type="submit" className="w-full" disabled={isLoading}>
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
