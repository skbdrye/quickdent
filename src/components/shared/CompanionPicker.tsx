import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserPlus, Pencil, Trash2, Search, Phone, Calendar, Loader2, X } from 'lucide-react';
import { PhoneInput, isValidPHPhone } from './PhoneInput';
import { cn } from '@/lib/utils';
import { companionsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SavedCompanion } from '@/lib/types';

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Friend', 'Other'];

interface CompanionPickerProps {
  open: boolean;
  ownerId: string;
  onClose: () => void;
  onPick: (c: SavedCompanion) => void;
}

export function CompanionPicker({ open, ownerId, onClose, onPick }: CompanionPickerProps) {
  const [items, setItems] = React.useState<SavedCompanion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState<SavedCompanion | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<SavedCompanion | null>(null);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const list = await companionsAPI.list(ownerId);
    setItems(list);
    setLoading(false);
  }, [ownerId]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c =>
      c.member_name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.relationship || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await companionsAPI.delete(confirmDelete.id);
      setItems(prev => prev.filter(c => c.id !== confirmDelete.id));
      toast({ title: 'Removed', description: 'Companion deleted from your saved list.' });
    } catch {
      toast({ title: 'Could not remove', variant: 'destructive' });
    }
    setConfirmDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-secondary" /> Saved companions
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a saved companion to auto-fill their info, or add a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, relationship..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[55vh]">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center px-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  {items.length === 0 ? 'No saved companions yet' : 'No matches'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {items.length === 0
                    ? 'Companions you book for will be saved here automatically.'
                    : 'Try a different search.'}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filtered.map(c => (
                  <div
                    key={c.id}
                    className={cn(
                      'group rounded-xl border border-border/60 bg-card hover:border-secondary/60 hover:shadow-sm transition-all',
                      'p-3 flex items-start gap-3',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-mint flex items-center justify-center text-mint-foreground font-semibold text-xs shrink-0">
                      {c.member_name.charAt(0).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => { onPick(c); onClose(); }}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm font-semibold text-foreground truncate">{c.member_name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {c.relationship && <span>{c.relationship}</span>}
                        {c.date_of_birth && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {c.date_of_birth}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditing(c)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(c)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="px-5 py-3 border-t bg-muted/30 sm:justify-between">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
              <X className="w-3.5 h-3.5" /> Close
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditing({ id: 0, owner_id: ownerId, member_name: '' } as SavedCompanion)}
            >
              <UserPlus className="w-3.5 h-3.5" /> Add new companion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <CompanionEditDialog
          companion={editing}
          ownerId={ownerId}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setItems(prev => {
              const idx = prev.findIndex(p => p.id === saved.id);
              if (idx >= 0) {
                const next = prev.slice();
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
          }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this companion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{confirmDelete?.member_name}</strong> from your saved list. Existing bookings are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CompanionEditDialog({
  companion, ownerId, onClose, onSaved,
}: {
  companion: SavedCompanion;
  ownerId: string;
  onClose: () => void;
  onSaved: (c: SavedCompanion) => void;
}) {
  const [form, setForm] = React.useState<SavedCompanion>(companion);
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();

  const save = async () => {
    if (!form.member_name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (form.phone && !isValidPHPhone(form.phone)) {
      toast({ title: 'Invalid phone', description: 'Phone must be 11 digits starting with 09.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (form.id && form.id > 0) {
        await companionsAPI.update(form.id, form);
        onSaved({ ...form });
      } else {
        const saved = await companionsAPI.upsert({
          owner_id: ownerId,
          member_name: form.member_name.trim(),
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          phone: form.phone || null,
          relationship: form.relationship || null,
        });
        if (saved) onSaved(saved);
      }
      toast({ title: 'Saved' });
    } catch {
      toast({ title: 'Could not save', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{form.id ? 'Edit companion' : 'Add companion'}</DialogTitle>
          <DialogDescription className="text-xs">
            Saved companions auto-fill their info on future bookings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Full name *</Label>
            <Input className="mt-1 h-9" value={form.member_name} onChange={e => setForm({ ...form, member_name: e.target.value.slice(0, 50) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date of birth</Label>
              <Input type="date" className="mt-1 h-9" value={form.date_of_birth || ''} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Gender</Label>
              <Select value={form.gender || ''} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <PhoneInput className="mt-1" value={form.phone || ''} onChange={v => setForm({ ...form, phone: v })} />
          </div>
          <div>
            <Label className="text-xs">Relationship</Label>
            <Select value={form.relationship || ''} onValueChange={v => setForm({ ...form, relationship: v })}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
