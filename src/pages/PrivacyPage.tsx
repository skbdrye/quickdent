import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
            <Lock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: March 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              QuickDent collects personal information that you voluntarily provide when registering, booking appointments, or completing medical assessment forms. This includes your name, phone number, age, gender, address, and medical health information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use your personal information to: manage your appointments, communicate appointment confirmations and reminders, maintain accurate medical records for your dental care, improve our services, and comply with legal obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Medical Data Protection</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your medical and health information is treated with the highest level of confidentiality. Medical assessment data is only accessible to authorized dental professionals involved in your care. We implement appropriate security measures to protect your health records.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Data Storage and Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption and security practices. We regularly review and update our security measures to protect against unauthorized access, disclosure, or destruction of your personal information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Information Sharing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third parties. Your information may only be shared with dental professionals directly involved in your care, or as required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal information at any time through your account settings. You may also request a copy of all data we hold about you by contacting our clinic directly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Cookies and Analytics</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              QuickDent may use local storage and session data to maintain your login session and preferences. We do not use third-party tracking cookies or share browsing data with advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Children&apos;s Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For patients under 18 years of age, parental or guardian consent is required. Group booking features allow parents to book on behalf of their children while maintaining the child&apos;s privacy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at 09637802851 or visit our dental clinic.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
