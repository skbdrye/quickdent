import { CheckCircle } from 'lucide-react';

const features = [
  'Book appointments 24/7 from any device',
  'Digital health questionnaire before visits',
  'Real-time availability and time slots',
  'Group booking for families',
  'Admin dashboard for clinic management',
];

export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-mint/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-14 items-center max-w-6xl mx-auto">
          {/* Left - Text */}
          <div className="space-y-6">
            <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
              About QuickDent
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Modern dental care starts here
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              QuickDent bridges the gap between patients and dental clinics. Our platform makes scheduling effortless, records organized, and communication seamless.
            </p>
            <ul className="space-y-3">
              {features.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Stats Card */}
          <div className="flex justify-center">
            <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-8 w-full max-w-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-sm">
                  Q
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">QuickDent</h3>
                  <p className="text-sm text-muted-foreground">Your dental care companion</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Patients', value: '500+' },
                  { label: 'Appointments', value: '2,000+' },
                  { label: 'Services', value: '10+' },
                  { label: 'Satisfaction', value: '98%' },
                ].map(stat => (
                  <div key={stat.label} className="text-center p-3 rounded-xl bg-mint/50">
                    <p className="text-2xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
