import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, UserCheck, CalendarDays, CalendarOff, Users,
  Stethoscope, FileText, Lightbulb, Sparkles, ClipboardCheck, Timer, ScanLine, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { onboardingAPI } from '@/lib/api';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  illustration: React.ReactNode;
  tip?: string;
}

function StepArt({ icon, gradient = 'from-primary/15 to-secondary/15' }: { icon: React.ReactNode; gradient?: string }) {
  return (
    <div className={cn('w-full h-44 sm:h-52 rounded-xl flex items-center justify-center bg-gradient-to-br relative overflow-hidden', gradient)}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-secondary/20 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative w-20 h-20 rounded-2xl bg-card/80 backdrop-blur shadow-lg border border-border/40 flex items-center justify-center text-secondary">
        {icon}
      </div>
    </div>
  );
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to QuickDent',
    description: 'A faster, friendlier way to book and manage your dental visits. This quick tour will walk you through everything you need to know.',
    icon: <Sparkles className="w-5 h-5" />,
    illustration: <StepArt icon={<Sparkles className="w-9 h-9" />} gradient="from-primary/20 to-secondary/15" />,
    tip: 'You can revisit this tour anytime from Settings.',
  },
  {
    title: 'Complete Your Profile',
    description: 'Head to the Profile tab to fill in your personal details. Your dashboard greeting and appointments use this information so the clinic knows exactly who you are.',
    icon: <UserCheck className="w-5 h-5" />,
    illustration: <StepArt icon={<UserCheck className="w-9 h-9" />} />,
    tip: 'Without a profile, your username is shown as a placeholder.',
  },
  {
    title: 'Medical Assessment',
    description: 'Submit your medical history once and reuse it for every booking. The clinic uses this to keep your treatment safe and personalized.',
    icon: <ClipboardCheck className="w-5 h-5" />,
    illustration: <StepArt icon={<ClipboardCheck className="w-9 h-9" />} />,
    tip: 'You must complete the medical assessment before your first appointment.',
  },
  {
    title: 'Book an Appointment',
    description: 'Pick a date, then a time slot. Each date shows availability at a glance — Available, Fully Booked, or Closed. Booked time slots are locked so you can\'t double-book.',
    icon: <CalendarDays className="w-5 h-5" />,
    illustration: <StepArt icon={<CalendarDays className="w-9 h-9" />} />,
    tip: 'To prevent spam, there is a 30-minute cooldown between new bookings.',
  },
  {
    title: 'Book for Others',
    description: 'Bringing family or friends? Add up to 5 companions per booking, choose individual time slots, and save them for next time. You can edit or remove saved companions any time.',
    icon: <Users className="w-5 h-5" />,
    illustration: <StepArt icon={<Users className="w-9 h-9" />} />,
    tip: 'Tap "Saved" beside the Add button to instantly load a saved companion.',
  },
  {
    title: 'Standby Queue',
    description: 'When your preferred date is fully booked, join the standby list. The clinic will notify you the moment a slot opens up.',
    icon: <Timer className="w-5 h-5" />,
    illustration: <StepArt icon={<Timer className="w-9 h-9" />} />,
    tip: 'Standby for someone else now requires their medical history — same as a normal booking.',
  },
  {
    title: 'Cancellation & Reschedule',
    description: 'Plans change. You can cancel or reschedule any appointment up to 24 hours before its scheduled time. Each appointment allows one reschedule.',
    icon: <CalendarOff className="w-5 h-5" />,
    illustration: <StepArt icon={<CalendarOff className="w-9 h-9" />} />,
    tip: 'Late cancellations may be marked as "No Show" by the clinic.',
  },
  {
    title: 'X-Rays & Prescriptions',
    description: 'After your visit, view your prescriptions and x-rays right inside the app. Each record can hold multiple images — flip through the gallery or download what you need.',
    icon: <ScanLine className="w-5 h-5" />,
    illustration: <StepArt icon={<ScanLine className="w-9 h-9" />} />,
    tip: 'Prescriptions and x-rays from companion bookings show up here too.',
  },
  {
    title: 'Stay in the Loop',
    description: 'The bell icon at the top notifies you about appointment confirmations, reschedules, prescriptions, and standby openings. You can scroll through all of them right from the popup.',
    icon: <Bell className="w-5 h-5" />,
    illustration: <StepArt icon={<Bell className="w-9 h-9" />} />,
    tip: 'Click any notification to jump straight to its source.',
  },
  {
    title: 'Browse Services',
    description: 'Curious about what the clinic offers? The Services tab lists every available treatment, kept up to date by our staff.',
    icon: <Stethoscope className="w-5 h-5" />,
    illustration: <StepArt icon={<Stethoscope className="w-9 h-9" />} />,
    tip: 'Have a question about a service? Mention it in the booking notes.',
  },
  {
    title: 'You\'re all set',
    description: 'That wraps up the tour. Welcome aboard — we\'re excited to take care of your smile.',
    icon: <FileText className="w-5 h-5" />,
    illustration: <StepArt icon={<Sparkles className="w-9 h-9" />} gradient="from-secondary/25 to-primary/15" />,
    tip: 'You can reopen this tour anytime from Settings → Replay onboarding.',
  },
];

export function OnboardingTutorial({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingDirection, setAnimatingDirection] = useState<'left' | 'right' | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const completed = await onboardingAPI.isCompleted(userId);
        if (!cancelled && !completed) {
          const timer = setTimeout(() => setIsOpen(true), 800);
          setChecking(false);
          return () => clearTimeout(timer);
        }
      } catch {
        // Safe default: do not show
      }
      if (!cancelled) setChecking(false);
    };
    check();
    return () => { cancelled = true; };
  }, [userId]);

  const markComplete = useCallback(async () => {
    setIsOpen(false);
    try {
      await onboardingAPI.markCompleted(userId);
    } catch { /* silent */ }
  }, [userId]);

  const goNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setAnimatingDirection('left');
      setTimeout(() => {
        setCurrentStep(s => s + 1);
        setAnimatingDirection(null);
      }, 180);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setAnimatingDirection('right');
      setTimeout(() => {
        setCurrentStep(s => s - 1);
        setAnimatingDirection(null);
      }, 180);
    }
  }, [currentStep]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'Escape') markComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, goNext, goBack, markComplete]);

  if (!isOpen || checking) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={markComplete} />

      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2 text-secondary">
            {step.icon}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </span>
          </div>
          <button onClick={markComplete} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Skip</button>
        </div>

        <div className={cn(
          'px-5 pt-4 pb-2 transition-all duration-200',
          animatingDirection === 'left' && 'opacity-0 -translate-x-4',
          animatingDirection === 'right' && 'opacity-0 translate-x-4',
        )}>
          <div className="mb-4">{step.illustration}</div>

          <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>

          {step.tip && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg px-3 py-2.5 text-xs text-foreground flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>{step.tip}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2 pb-3">
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentStep ? 'bg-secondary w-6' : i < currentStep ? 'bg-secondary/50 w-1.5' : 'bg-muted-foreground/20 w-1.5',
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={isFirstStep}
            className={cn('gap-1 transition-opacity', isFirstStep && 'opacity-0 pointer-events-none')}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={markComplete}
              className="gap-1 px-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              Get Started
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="gap-1 px-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
