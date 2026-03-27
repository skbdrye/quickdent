import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { servicesAPI } from '@/lib/api';
import type { ClinicService } from '@/lib/types';
import { Stethoscope, Sparkles, Crown, Smile } from 'lucide-react';

const iconMap: Record<string, typeof Stethoscope> = {
  'Orthodontic Treatment': Sparkles,
  'Crown': Crown,
  'Whitening': Smile,
};

export function ServicesSection() {
  const [services, setServices] = useState<ClinicService[]>([]);

  useEffect(() => {
    servicesAPI.fetchAll().then(s => setServices(s.filter(sv => sv.is_active))).catch(() => {});
  }, []);

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">What we offer</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">Our Services</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Browse our comprehensive range of dental services. Book an appointment and our team will take care of the rest.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service) => {
            const Icon = iconMap[service.name] || Stethoscope;
            return (
              <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-secondary/30">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-mint mx-auto mb-4 flex items-center justify-center group-hover:bg-secondary/10 transition-colors">
                    <Icon className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">{service.name}</h3>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
