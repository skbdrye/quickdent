import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export default function ServiceManagement() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });
    setServices(data || []);
  }

  async function addService() {
    if (!newService.trim()) return;
    const maxOrder = services.length > 0 ? Math.max(...services.map((s) => s.sort_order)) + 1 : 1;
    const { error } = await supabase.from('services').insert({ name: newService.trim(), sort_order: maxOrder });
    if (error) {
      toast({ title: 'Error', description: 'Failed to add service', variant: 'destructive' });
      return;
    }
    toast({ title: 'Added', description: `${newService.trim()} has been added` });
    setNewService('');
    loadServices();
  }

  async function toggleService(id: number, isActive: boolean) {
    await supabase.from('services').update({ is_active: !isActive }).eq('id', id);
    loadServices();
  }

  async function deleteService(id: number) {
    await supabase.from('services').delete().eq('id', id);
    toast({ title: 'Deleted', description: 'Service removed' });
    loadServices();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <p className="text-muted-foreground">Manage the dental services your clinic offers</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter service name..."
          value={newService}
          onChange={(e) => setNewService(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addService()}
          className="max-w-sm"
        />
        <Button onClick={addService}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Service Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No services configured
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={service.is_active ? 'confirmed' : 'cancelled'}
                        className="cursor-pointer"
                        onClick={() => toggleService(service.id, service.is_active)}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteService(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
