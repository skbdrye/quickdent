import { Phone, MapPin, Clock, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-mint/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
            Contact Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">
            Get in touch
          </h2>
          <p className="text-muted-foreground mt-4">
            Have questions? Reach out to us and we&apos;ll be happy to help.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
          {[
            { icon: Phone, label: 'Phone', value: '09668810738', sub: 'Mon-Sat, 9AM-6PM' },
            { icon: Mail, label: 'Email', value: 'hello@quickdent.com', sub: 'We reply within 24hrs' },
            { icon: MapPin, label: 'Location', value: 'QuickDent Clinic', sub: 'Visit us anytime' },
            { icon: Clock, label: 'Hours', value: '9:00 AM - 6:00 PM', sub: 'Monday to Saturday' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <Card key={label} className="border-border/50 bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="font-semibold text-foreground text-sm mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
