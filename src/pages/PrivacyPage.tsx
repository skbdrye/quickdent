import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>
            Abrigo-Marabe Dental Clinic ("we", "our") is committed to protecting your privacy.
            This policy explains how we collect, use, and protect your personal information through the QuickDent platform.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Information We Collect</h2>
          <p>
            We collect personal information including your name, phone number, date of birth, gender, address,
            and medical history as provided through the registration and booking process.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">How We Use Your Information</h2>
          <p>
            Your information is used solely for: scheduling and managing appointments, providing appropriate
            dental care based on your medical history, and communicating with you about your appointments.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Data Protection</h2>
          <p>
            We implement appropriate security measures to protect your personal data. Your medical records
            and personal information are stored securely and accessed only by authorized clinic personnel.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Data Sharing</h2>
          <p>
            We do not sell, trade, or share your personal information with third parties, except as required
            by law or for the provision of dental care services.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Your Rights</h2>
          <p>
            You have the right to access, correct, or request deletion of your personal data.
            Contact us at the clinic for any privacy-related concerns.
          </p>

          <p className="text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
            Last updated: {new Date().getFullYear()}. Abrigo-Marabe Dental Clinic.
          </p>
        </div>
      </div>
    </div>
  );
}
