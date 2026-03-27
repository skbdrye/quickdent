import { CheckCircle } from 'lucide-react';

const features = [
  'Book appointments 24/7 from any device',
  'Digital health questionnaire before visits',
  'Real-time availability and time slots',
  'Group booking for families and friends',
  'Admin dashboard for clinic management',
];

export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <span className="text-sm font-semibold text-secondary uppercase tracking-wider">About QuickDent</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mb-4">Modern dental care starts here</h2>
            <p className="text-muted-foreground mb-6">
              QuickDent bridges the gap between patients and dental clinics. Our platform makes scheduling effortless, records organized, and communication seamless.
            </p>
            <ul className="space-y-3">
              {features.map(f => (
                <li key={f} className="flex items-center gap-3 text-foreground">
                  <CheckCircle className="w-5 h-5 text-success shrink-0" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-in-up animate-delay-2">
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">Q</div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">QuickDent</h3>
                  <p className="text-sm text-muted-foreground">Your dental care companion</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Patients', value: '500+' },
                  { label: 'Appointments', value: '2,000+' },
                  { label: 'Services', value: '9+' },
                  { label: 'Satisfaction', value: '98%' },
                ].map(stat => (
                  <div key={stat.label} className="bg-mint/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-secondary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
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
