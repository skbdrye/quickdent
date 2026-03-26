import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Settings, User, Lock } from 'lucide-react';

export function UserSettings() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast({ title: 'Error', description: 'Phone number is required', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Settings updated successfully' });
    setPassword('');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4 text-secondary" /> Account Settings</CardTitle>
          <CardDescription>Update your contact information and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Username</Label>
              <Input value={user?.username || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> New Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => { setPhone(user?.phone || ''); setPassword(''); }}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
