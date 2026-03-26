import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Terms & Conditions</h1>
            <p className="text-sm text-muted-foreground">Last updated: March 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing and using QuickDent&apos;s online dental reservation system, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Appointment Booking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All appointments booked through QuickDent are subject to availability and confirmation by the dental clinic. Submitting an appointment request does not guarantee the appointment until it has been approved by the clinic administration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Cancellation Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Patients are requested to cancel or reschedule their appointments at least 24 hours before the scheduled time. Repeated no-shows may result in restrictions on future booking privileges.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Medical Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree to provide accurate and complete medical information through our health assessment forms. Providing false or misleading medical information may endanger your health and is done at your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Group Booking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When booking for a group, the primary account holder is responsible for ensuring all member information is accurate. Group appointments are scheduled consecutively and may require additional time slots.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. User Accounts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. QuickDent is not liable for any loss arising from unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              QuickDent is a scheduling platform and does not provide medical advice or services. We are not liable for any medical outcomes, treatment results, or clinical decisions made by the dental professionals. The platform is provided &ldquo;as is&rdquo; without any warranties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              QuickDent reserves the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these Terms & Conditions, please contact us at 09637802851 or visit our clinic.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
