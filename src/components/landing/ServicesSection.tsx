import { Calendar, ClipboardCheck, Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: Calendar,
    title: 'Easy Scheduling',
    description: 'Book your dental appointments online with our intuitive calendar. Choose your preferred date and time slot in seconds.',
  },
  {
    icon: ClipboardCheck,
    title: 'Medical Assessment',
    description: 'Complete your health questionnaire digitally before your visit. Saves time and ensures accurate records.',
  },
  {
    icon: Stethoscope,
    title: 'Comprehensive Care',
    description: 'From checkups to extractions, cleanings to braces -- browse and select from our full range of dental services.',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
            What we offer
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">
            Our Services
          </h2>
          <p className="text-muted-foreground mt-4">
            Everything you need for a smooth dental experience, all in one place.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, i) => (
            <Card
              key={service.title}
              className="group border-border/50 hover:border-secondary/30 hover:shadow-lg transition-all duration-300 bg-card"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-xl bg-mint flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="h-7 w-7 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
