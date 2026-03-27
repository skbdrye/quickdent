import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-poppins">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground">QuickDent Dental Clinic collects personal information necessary for providing dental care services, including your name, date of birth, gender, contact information, and medical history. This information is collected when you register an account or book an appointment.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">Your personal information is used to: manage appointment bookings, maintain accurate medical records, provide dental care services, communicate appointment reminders and updates, and improve our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Data Security</h2>
            <p className="text-muted-foreground">We implement appropriate security measures to protect your personal and medical information. Access to patient records is restricted to authorized dental professionals and staff only.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
            <p className="text-muted-foreground">We do not sell or share your personal information with third parties for marketing purposes. Your medical information may only be shared with other healthcare providers with your explicit consent or as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to access, correct, or request deletion of your personal information. You may also request a copy of your medical records at any time by contacting our clinic.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Contact Us</h2>
            <p className="text-muted-foreground">If you have questions about this privacy policy or your personal data, please contact QuickDent Dental Clinic directly through our contact information provided on our website.</p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">Last updated: March 2026</p>
        </div>
      </div>
    </div>
  );
}
