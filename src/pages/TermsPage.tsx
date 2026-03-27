import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-poppins">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Terms & Conditions</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By creating an account and using QuickDent's online appointment booking system, you agree to these terms and conditions. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Account Registration</h2>
            <p className="text-muted-foreground">You must provide accurate and complete information when registering. You are responsible for maintaining the security of your account credentials. Each phone number can only be associated with one account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Appointment Booking</h2>
            <p className="text-muted-foreground">Appointments are subject to availability. You must complete your patient profile and medical history before booking. Group bookings are limited to a maximum of 5 members per booking.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Cancellation Policy</h2>
            <p className="text-muted-foreground">Appointments must be cancelled at least 24 hours before the scheduled date. Late cancellations or no-shows may affect your ability to book future appointments. We reserve the right to limit bookings for patients with repeated no-shows.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Medical Information</h2>
            <p className="text-muted-foreground">You are responsible for providing accurate medical history information. Failure to disclose relevant medical conditions may affect your treatment and safety. All medical information is kept confidential in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Group Bookings</h2>
            <p className="text-muted-foreground">When booking for others, you are responsible for ensuring the accuracy of their information. Each group member will receive their own appointment time slot. Medical history information must be provided for each group member.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Prescriptions</h2>
            <p className="text-muted-foreground">Prescriptions are provided by licensed dental professionals and are accessible through your account. For group bookings, the registered user can access prescriptions for non-registered members they booked for.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
            <p className="text-muted-foreground">QuickDent reserves the right to update these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">Last updated: March 2026</p>
        </div>
      </div>
    </div>
  );
}
