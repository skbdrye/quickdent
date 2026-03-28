import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Clock, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { useAuthStore } from '@/lib/store';

export function HeroSection() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleBookClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setLoginOpen(true);
    }
  };

  return (
    <>
      <section id="home" className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground/90 text-sm font-medium mb-6 backdrop-blur-sm border border-primary-foreground/10">
                Abrigo-Marabe Dental Clinic | Online Reservation
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
                Your smile,{' '}
                <span className="bg-gradient-to-r from-primary-foreground/80 to-primary-foreground bg-clip-text">our prioriteeth</span>
              </h1>
              <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg">
                Book your dental appointments at Abrigo-Marabe Dental Clinic with ease. Simple online booking for patients, efficient scheduling for our clinic.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={handleBookClick} className="bg-white text-teal-700 hover:bg-white/90 font-semibold gap-2 shadow-lg">
                  Book Appointment <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" className="bg-white/20 text-white border border-white/40 hover:bg-white/30 font-semibold gap-2 backdrop-blur-sm"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
                  Learn More
                </Button>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-1 gap-4 animate-fade-in-up animate-delay-2">
              {[
                { icon: Clock, title: 'Quick Booking', desc: 'Book in under 2 minutes' },
                { icon: Shield, title: 'Secure Records', desc: 'Your data is protected' },
                { icon: Smartphone, title: 'Access Anywhere', desc: 'Works on any device' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/10 rounded-xl p-5 flex items-center gap-4 hover:bg-primary-foreground/15 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary-foreground">{title}</p>
                    <p className="text-sm text-primary-foreground/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex lg:hidden gap-3 mt-8 flex-wrap justify-center">
            {[
              { icon: Clock, label: 'Quick Booking' },
              { icon: Shield, label: 'Secure' },
              { icon: Smartphone, label: 'Any Device' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 border border-primary-foreground/10">
                <Icon className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full">
            <path d="M0 60V20C360 0 720 0 1080 20C1260 30 1380 40 1440 50V60H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
