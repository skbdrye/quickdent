import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-6">Terms & Conditions</h1>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>
            Welcome to QuickDent, the online reservation system of Abrigo-Marabe Dental Clinic. By using our platform,
            you agree to the following terms and conditions.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Use of Service</h2>
          <p>
            QuickDent is provided for the purpose of scheduling dental appointments at Abrigo-Marabe Dental Clinic.
            Users must provide accurate and truthful information when creating accounts and booking appointments.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Appointments</h2>
          <p>
            All appointments are subject to confirmation by the clinic. Booking an appointment does not guarantee
            availability. The clinic reserves the right to reschedule or cancel appointments as needed.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. Medical Information</h2>
          <p>
            Users are required to provide accurate medical history information. This information is used solely
            for the purpose of providing safe and appropriate dental care. Providing false medical information
            may result in health risks.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. Cancellations</h2>
          <p>
            Appointments may be cancelled at least 24 hours before the scheduled time. Repeated no-shows may
            result in restrictions on future bookings.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Privacy</h2>
          <p>
            Your personal and medical information is handled in accordance with our Privacy Policy.
            We are committed to protecting your data.
          </p>

          <p className="text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
            Last updated: {new Date().getFullYear()}. Abrigo-Marabe Dental Clinic.
          </p>
        </div>
      </div>
    </div>
  );
}
