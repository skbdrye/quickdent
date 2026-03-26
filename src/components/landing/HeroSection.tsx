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
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full bg-secondary/10 blur-2xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="animate-fade-in-up">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground/90 text-sm font-medium border border-primary-foreground/10">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Online Dental Appointment System
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight animate-fade-in-up animate-delay-1">
                Your smile,{' '}
                <span className="text-accent">our prioriteeth</span>
              </h1>

              <p className="text-lg text-primary-foreground/70 max-w-xl mx-auto lg:mx-0 animate-fade-in-up animate-delay-2">
                Find, book, and manage your dental appointments easily with QuickDent. Simple online booking for patients, efficient scheduling for clinics.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start animate-fade-in-up animate-delay-3">
                <Button size="xl" variant="hero" onClick={handleBookClick}>
                  Book Appointment
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="xl"
                  variant="ghost"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Right - Feature Cards */}
            <div className="hidden lg:flex flex-col gap-4 animate-fade-in-up animate-delay-4">
              {[
                { icon: Clock, title: 'Quick Booking', desc: 'Book in under 2 minutes', delay: '' },
                { icon: Shield, title: 'Secure Records', desc: 'Your data is protected', delay: 'animate-delay-1' },
                { icon: Smartphone, title: 'Access Anywhere', desc: 'Works on any device', delay: 'animate-delay-2' },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group flex items-center gap-4 p-5 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/10 transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary-foreground">{title}</p>
                    <p className="text-sm text-primary-foreground/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Feature Badges */}
          <div className="flex lg:hidden flex-wrap justify-center gap-3 mt-8 animate-fade-in-up animate-delay-4">
            {[
              { icon: Clock, label: 'Quick Booking' },
              { icon: Shield, label: 'Secure' },
              { icon: Smartphone, label: 'Any Device' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/10 text-primary-foreground/80 text-sm"
              >
                <Icon className="h-4 w-4 text-accent" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full">
            <path
              d="M0 40C240 80 480 100 720 80C960 60 1200 20 1440 40V100H0V40Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
