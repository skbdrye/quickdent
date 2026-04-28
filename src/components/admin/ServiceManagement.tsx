import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Stethoscope, Calendar as CalendarIcon, Pencil, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { servicesAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ClinicService } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

const ALL_DAYS: { key: string; short: string }[] = [
  { key: 'sunday', short: 'Su' },
  { key: 'monday', short: 'Mo' },
  { key: 'tuesday', short: 'Tu' },
  { key: 'wednesday', short: 'We' },
  { key: 'thursday', short: 'Th' },
  { key: 'friday', short: 'Fr' },
  { key: 'saturday', short: 'Sa' },
];

export default function ServiceManagement() {
  const { toast } = useToast();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [newService, setNewService] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const loadServices = useCallback(async () => {
    try {
      const data = await servicesAPI.fetchAll();
      setServices(data);
    } catch (err) {
      console.error('Load services failed', err);
      toast({ title: 'Error', description: 'Could not load services.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => { loadServices(); }, [loadServices]);

  async function addService(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newService.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.sort_order)) + 1 : 1;
      await servicesAPI.create(newService.trim(), maxOrder);
      toast({ title: 'Added', description: `${newService.trim()} has been added` });
      setNewService('');
      await loadServices();
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Failed to add service';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  }

  const toggleActive = useCallback(async (svc: ClinicService) => {
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s));
    try {
      await servicesAPI.update(svc.id, { is_active: !svc.is_active });
    } catch {
      // revert
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: svc.is_active } : s));
      toast({ title: 'Error', description: 'Failed to update service.', variant: 'destructive' });
    }
  }, [toast]);

  const toggleDay = useCallback(async (svc: ClinicService, day: string) => {
    const currentDays = svc.available_days && svc.available_days.length > 0 ? svc.available_days : ALL_DAYS.map(d => d.key);
    const next = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    if (next.length === 0) {
      toast({ title: 'At least one day required', description: 'A service must be available on at least one day. Toggle the service Off instead.', variant: 'destructive' });
      return;
    }
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, available_days: next } : s));
    try {
      await servicesAPI.update(svc.id, { available_days: next });
    } catch {
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, available_days: currentDays } : s));
      toast({ title: 'Error', description: 'Failed to update available days.', variant: 'destructive' });
    }
  }, [toast]);

  const deleteService = useCallback(async (id: number) => {
    if (!confirm('Remove this service? Existing bookings remain unchanged.')) return;
    try {
      await servicesAPI.delete(id);
      toast({ title: 'Deleted', description: 'Service removed' });
      await loadServices();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete service.', variant: 'destructive' });
    }
  }, [toast, loadServices]);

  const startRename = (svc: ClinicService) => { setRenamingId(svc.id); setRenameDraft(svc.name); };
  const commitRename = async () => {
    const id = renamingId;
    if (id === null) return;
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name) return;
    const original = services.find(s => s.id === id);
    if (!original || original.name === name) return;
    setServices(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    try { await servicesAPI.update(id, { name }); }
    catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, name: original.name } : s));
      toast({ title: 'Error', description: 'Rename failed.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        icon={Stethoscope}
        title="Services"
        description="Manage what your clinic offers and which weekdays each service is available."
      />

      <Card className="border-border/60 overflow-hidden">
        <div className="bg-gradient-to-br from-mint/40 to-transparent px-4 py-3 border-b border-border/40 flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card text-secondary ring-1 ring-secondary/15">
            <Plus className="w-4 h-4" />
          </span>
          <p className="text-sm font-semibold text-foreground">Add a new service</p>
        </div>
        <CardContent className="p-4">
          <form onSubmit={addService} className="flex flex-wrap gap-2 items-stretch">
            <Input
              placeholder="Enter service name (e.g. Teeth Cleaning)..."
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              className="flex-1 min-w-[200px] h-10"
              disabled={isAdding}
            />
            <Button type="submit" disabled={isAdding || !newService.trim()} className="shrink-0 gap-1.5">
              <Plus className="h-4 w-4" />
              {isAdding ? 'Adding…' : 'Add service'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {services.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No services configured yet"
          description="Add your first service above to start accepting bookings."
          tone="muted"
        />
      ) : (
        <div className="grid gap-3">
          {services.map(service => {
            const days = service.available_days && service.available_days.length > 0 ? service.available_days : ALL_DAYS.map(d => d.key);
            return (
              <Card key={service.id} className={cn('border-border/60 transition-all duration-200 hover:shadow-md hover:border-secondary/30', !service.is_active && 'opacity-70')}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-mint text-secondary shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {renamingId === service.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={renameDraft}
                            onChange={e => setRenameDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                            onBlur={commitRename}
                            className="h-8"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={commitRename}><Check className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{service.name}</p>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => startRename(service)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-tight">
                        {service.is_active ? `Available ${days.length}/7 days` : 'Inactive'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={service.is_active} onCheckedChange={() => toggleActive(service)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteService(service.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase tracking-tight text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" /> Available on
                      </p>
                      <button
                        type="button"
                        className="text-[11px] text-secondary hover:underline"
                        onClick={() => {
                          const allSelected = days.length === 7;
                          const next = allSelected ? ['monday'] : ALL_DAYS.map(d => d.key);
                          setServices(prev => prev.map(s => s.id === service.id ? { ...s, available_days: next } : s));
                          servicesAPI.update(service.id, { available_days: next }).catch(() => {});
                        }}
                      >
                        {days.length === 7 ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DAYS.map(d => {
                        const on = days.includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggleDay(service, d.key)}
                            className={cn(
                              'min-w-[2.25rem] h-8 px-2 rounded-md text-xs font-semibold transition-all duration-150 border',
                              on
                                ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm'
                                : 'bg-card text-muted-foreground border-border hover:border-secondary/50 hover:text-foreground',
                            )}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
