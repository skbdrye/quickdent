import { Phone, MapPin, Clock, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Contact Us</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">Get in touch</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Have questions? Reach out to us and we'll be happy to help.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Phone, label: 'Phone', value: '09668810738', sub: 'Mon-Sat, 9AM-6PM' },
            { icon: Mail, label: 'Email', value: 'hello@quickdent.com', sub: 'We reply within 24hrs' },
            { icon: MapPin, label: 'Location', value: 'QuickDent Clinic', sub: 'Visit us anytime' },
            { icon: Clock, label: 'Hours', value: '9:00 AM - 6:00 PM', sub: 'Monday to Saturday' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <Card key={label} className="text-center hover:shadow-md transition-shadow border-border/50">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-mint mx-auto mb-3 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="font-semibold text-foreground text-sm">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
