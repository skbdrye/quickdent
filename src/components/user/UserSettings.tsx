import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lock, Phone } from 'lucide-react';

export default function UserSettings() {
  const { toast } = useToast();
  const { user, setUser } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function updatePhone() {
    if (!user || !phone.trim()) return;
    setSavingPhone(true);

    // Normalize phone
    let normalizedPhone = phone.trim().replace(/\s+/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = normalizedPhone.substring(1);
    }
    if (normalizedPhone.startsWith('+63')) {
      normalizedPhone = normalizedPhone.substring(3);
    }

    const { error } = await supabase
      .from('users')
      .update({ phone: normalizedPhone })
      .eq('id', user.id);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'This phone number is already registered', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to update phone', variant: 'destructive' });
      }
    } else {
      setUser({ ...user, phone: normalizedPhone });
      toast({ title: 'Updated', description: 'Phone number updated successfully' });
    }
    setSavingPhone(false);
  }

  async function updatePassword() {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);

    // Verify current password
    const { data: userData } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData || userData.password_hash !== currentPassword) {
      toast({ title: 'Error', description: 'Current password is incorrect', variant: 'destructive' });
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ password_hash: newPassword })
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9668810738"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter your phone number without country code</p>
          </div>
          <Button onClick={updatePhone} disabled={savingPhone}>
            {savingPhone ? 'Saving...' : 'Update Phone'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={updatePassword} disabled={savingPassword}>
            {savingPassword ? 'Saving...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
