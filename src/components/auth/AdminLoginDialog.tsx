import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

interface AdminLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminLoginDialog({ open, onOpenChange }: AdminLoginDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { adminLogin } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: 'Missing Fields', description: 'Please enter both username and password', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await adminLogin(username, password);
    setIsLoading(false);
    if (result.success) {
      toast({ title: 'Admin Access', description: 'Welcome to the admin dashboard' });
      onOpenChange(false);
      navigate('/admin');
    } else {
      toast({ title: 'Login failed', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <ShieldCheck className="w-10 h-10 text-secondary mb-2" />
          <DialogTitle>Admin Login</DialogTitle>
          <DialogDescription>Access the clinic management dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Admin username" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
