import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfileStore, useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { User, FileText, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export function PatientProfile() {
  const { profile, assessment, assessmentSubmitted, updateProfile, updateAssessment, submitAssessment } = useProfileStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'medical'>('info');

  const handleSaveInfo = () => {
    if (!profile.firstName || !profile.lastName) {
      toast({ title: 'Error', description: 'First and last name are required', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Patient info updated' });
    setStep('medical');
  };

  const handleSubmitAssessment = () => {
    const required: ('q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6')[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    for (const q of required) {
      if (!assessment[q]) {
        toast({ title: 'Incomplete', description: 'Please answer all medical questions', variant: 'destructive' });
        return;
      }
    }
    if (!assessment.consent) {
      toast({ title: 'Consent required', description: 'Please acknowledge the consent before submitting', variant: 'destructive' });
      return;
    }
    submitAssessment();
    toast({ title: 'Assessment submitted', description: 'Your medical assessment has been saved.' });
  };

  const questions = [
    { key: 'q1' as const, text: 'Do you consider yourself to be in good health currently?' },
    { key: 'q2' as const, text: 'Are you currently undergoing any medical treatment?', detailKey: 'q2Details' as const },
    { key: 'q3' as const, text: 'Are you taking any maintenance medications?', detailKey: 'q3Details' as const },
    { key: 'q4' as const, text: 'Have you ever been hospitalized for a serious illness or surgery?', detailKey: 'q4Details' as const },
    { key: 'q5' as const, text: 'Do you have any known allergies (drugs, food, latex, etc.)?', detailKey: 'q5Details' as const },
    { key: 'q6' as const, text: 'Are you currently pregnant or nursing?' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal and medical information</p>
      </div>

      {/* Summary card */}
      <Card className="border-border/50">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {profile.firstName || profile.lastName
                ? `${profile.firstName} ${profile.lastName}`.trim()
                : user?.username || 'Not set'}
            </p>
            <p className="text-xs text-muted-foreground">
              {assessmentSubmitted ? 'Assessment completed' : 'Assessment pending'}
            </p>
          </div>
        </CardContent>
      </Card>

      {step === 'info' ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-secondary" /> Patient Details</CardTitle>
            <CardDescription>Core personal and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={profile.lastName} onChange={e => updateProfile({ lastName: e.target.value })} placeholder="Last name" />
              </div>
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={profile.firstName} onChange={e => updateProfile({ firstName: e.target.value })} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input value={profile.middleName} onChange={e => updateProfile({ middleName: e.target.value })} placeholder="Middle name" />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={profile.age ?? ''} onChange={e => updateProfile({ age: e.target.value ? parseInt(e.target.value) : null })} placeholder="Age" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={profile.gender} onChange={e => updateProfile({ gender: e.target.value })}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={profile.phone} onChange={e => updateProfile({ phone: e.target.value })} placeholder="Phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Home Address</Label>
              <Input value={profile.address} onChange={e => updateProfile({ address: e.target.value })} placeholder="Address" />
            </div>
            <Button onClick={handleSaveInfo} className="gap-2">
              Continue to Medical History <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-secondary" /> Medical History</CardTitle>
            <CardDescription>A short summary of relevant health information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="space-y-4">
              {questions.map((q, i) => (
                <li key={q.key} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{i + 1}. {q.text}</p>
                  <div className="flex gap-4">
                    {(['yes', 'no'] as const).map(val => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name={q.key}
                          checked={assessment[q.key] === val}
                          onChange={() => updateAssessment({ [q.key]: val })}
                          className="accent-secondary"
                        />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                  {q.detailKey && assessment[q.key] === 'yes' && (
                    <Input
                      placeholder="Please provide details..."
                      value={assessment[q.detailKey!]}
                      onChange={e => updateAssessment({ [q.detailKey!]: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </li>
              ))}
            </ol>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Date of your last medical check-up</Label>
                <Input type="date" value={assessment.lastCheckup} onChange={e => updateAssessment({ lastCheckup: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Other medical conditions or illnesses</Label>
                <Input value={assessment.otherMedical} onChange={e => updateAssessment({ otherMedical: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/30">
              <h4 className="font-semibold text-foreground text-sm mb-2">Consent & Acknowledgement</h4>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={assessment.consent}
                  onCheckedChange={(checked) => updateAssessment({ consent: checked === true })}
                  className="mt-0.5"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I acknowledge that I have truthfully completed the questionnaire. I agree to disclose all past illnesses, medical, and dental history. I understand that providing incorrect information can be harmful to my health.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('info')} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back to Info
              </Button>
              <Button onClick={handleSubmitAssessment} disabled={assessmentSubmitted} className="gap-2">
                <Save className="h-4 w-4" />
                {assessmentSubmitted ? 'Already Submitted' : 'Submit Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
