import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Service {
  id: number;
  name: string;
  is_active: boolean;
}

export default function ServicesDisplay() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    loadServices();
    const channel = supabase
      .channel('user-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => loadServices())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    setServices(data || []);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Our Services</h1>
        <p className="text-muted-foreground">Dental services we offer at QuickDent Clinic</p>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No services listed yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{service.name}</p>
                  <Badge variant="confirmed" className="text-xs mt-1">Available</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
