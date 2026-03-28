import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, UserCheck, CalendarDays, CalendarOff, Users, Stethoscope, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  tip?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Complete Your Profile',
    description: 'Start by heading to the Profile tab to fill in your personal details and medical history. This information helps our dental team provide you with the best care tailored to your needs.',
    image: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100023572/onboarding-profile_002f4ec8.png',
    icon: <UserCheck className="w-5 h-5" />,
    tip: 'Your profile must be completed before you can book appointments.',
  },
  {
    title: 'Book an Appointment',
    description: 'Navigate to the Appointments tab, pick a date from the calendar, and choose an available time slot that works for you. Confirm your booking and you\'re all set!',
    image: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100023572/onboarding-book_93c0d8d3.png',
    icon: <CalendarDays className="w-5 h-5" />,
    tip: 'Available time slots are shown in teal. Gray slots are already taken.',
  },
  {
    title: 'Cancellation Policy',
    description: 'Need to reschedule? You can cancel an appointment as long as it\'s at least one day before your scheduled visit. Same-day cancellations are not allowed to ensure fairness for all patients.',
    image: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100023572/onboarding-cancel_1aff94ab.png',
    icon: <CalendarOff className="w-5 h-5" />,
    tip: 'Please cancel at least 24 hours in advance to avoid a "No Show" record.',
  },
  {
    title: 'Book for Others',
    description: 'Bringing family or friends? Use the "Book for Others" feature to schedule group appointments. Add up to 5 members, fill in their details and medical history, and pick individual time slots for each person.',
    image: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100023572/onboarding-group_449e99b0.png',
    icon: <Users className="w-5 h-5" />,
    tip: 'You can optionally include yourself in the group booking too.',
  },
  {
    title: 'Browse Services',
    description: 'Check out the Services tab to explore all the dental treatments we offer — from routine cleanings and checkups to cosmetic procedures and restorations. Each service includes a description so you know exactly what to expect.',
    image: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100023572/onboarding-services_996491bf.png',
    icon: <Stethoscope className="w-5 h-5" />,
    tip: 'Services are updated by our clinic team and always reflect current offerings.',
  },
  {
    title: 'Your Prescriptions',
    description: 'After your visit, head to the Prescriptions tab to view any prescriptions your dentist has uploaded. You can view, download, or print them right from here — no more lost paper prescriptions!',
    image: 'https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100023572/onboarding-prescriptions_a88257de.png',
    icon: <FileText className="w-5 h-5" />,
    tip: 'Group booking prescriptions for each member will also appear here.',
  },
];

const STORAGE_KEY = 'quickdent_onboarding_completed';

export function OnboardingTutorial({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingDirection, setAnimatingDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    // Check if this user has already completed the tutorial
    try {
      const completedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!completedUsers.includes(userId)) {
        // Short delay so the dashboard renders first
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const markComplete = useCallback(() => {
    try {
      const completedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!completedUsers.includes(userId)) {
        completedUsers.push(userId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completedUsers));
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([userId]));
    }
    setIsOpen(false);
  }, [userId]);

  const goNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setAnimatingDirection('left');
      setTimeout(() => {
        setCurrentStep(s => s + 1);
        setAnimatingDirection(null);
      }, 200);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setAnimatingDirection('right');
      setTimeout(() => {
        setCurrentStep(s => s - 1);
        setAnimatingDirection(null);
      }, 200);
    }
  };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Tutorial Card */}
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2 text-secondary">
            {step.icon}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </span>
          </div>
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  i === currentStep ? 'bg-secondary w-5' : i < currentStep ? 'bg-secondary/50' : 'bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          'px-5 pt-4 pb-2 transition-all duration-200',
          animatingDirection === 'left' && 'opacity-0 -translate-x-4',
          animatingDirection === 'right' && 'opacity-0 translate-x-4',
        )}>
          {/* Image */}
          <div className="rounded-xl overflow-hidden mb-4 bg-mint/30 border border-border/30">
            <img
              src={step.image}
              alt={step.title}
              crossOrigin="anonymous"
              className="w-full h-44 sm:h-52 object-cover"
            />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>

          {/* Tip */}
          {step.tip && (
            <div className="bg-mint/50 dark:bg-mint/10 border border-secondary/20 rounded-lg px-3 py-2.5 text-xs text-secondary-foreground dark:text-secondary flex items-start gap-2">
              <span className="text-secondary font-bold shrink-0 mt-0.5">💡</span>
              <span>{step.tip}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-3">
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
