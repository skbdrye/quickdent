import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfileStore, useAuthStore } from '@/lib/store';
import { matchingAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { User, FileText, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateAge } from '@/lib/types';

export function PatientProfile() {
  const { profile, assessment, fetchProfile, fetchAssessment, updateProfile, updateAssessment, submitAssessment, isAssessmentSubmitted } = useProfileStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'medical'>('info');

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchAssessment(user.id);
    }
  }, [user?.id, fetchProfile, fetchAssessment]);

  const handleSaveInfo = async () => {
    if (!user?.id) return;
    if (!profile?.first_name || !profile?.last_name || !profile?.date_of_birth || !profile?.gender || !profile?.phone) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    await updateProfile(user.id, profile);

    // Check for matching group members (non-registered person merge)
    if (profile.first_name && profile.last_name && profile.date_of_birth && profile.gender) {
      const result = await matchingAPI.checkAndMerge(user.id, profile.first_name, profile.last_name, profile.date_of_birth, profile.gender);
      if (result.merged) {
        toast({ title: 'Records Found', description: `${result.count} previous record(s) linked to your account.` });
        await fetchAssessment(user.id);
      }
    }

    toast({ title: 'Saved', description: 'Patient info updated' });
    setStep('medical');
  };

  const handleSubmitAssessment = async () => {
    if (!user?.id || !assessment) return;
    const required: ('q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6')[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    for (const q of required) {
      if (!assessment[q]) {
        toast({ title: 'Incomplete', description: 'Please answer all medical questions', variant: 'destructive' });
        return;
      }
    }
    if (!assessment.consent) {
      toast({ title: 'Consent required', description: 'Please acknowledge the consent', variant: 'destructive' });
      return;
    }
    await updateAssessment(user.id, { ...assessment, is_submitted: true });
    await submitAssessment(user.id);
    toast({ title: 'Assessment submitted', description: 'Your medical assessment has been saved.' });
  };

  const questions = [
    { key: 'q1' as const, text: 'Do you consider yourself to be in good health currently?' },
    { key: 'q2' as const, text: 'Are you currently undergoing any medical treatment?', detailKey: 'q2_details' as const },
    { key: 'q3' as const, text: 'Are you taking any maintenance medications?', detailKey: 'q3_details' as const },
    { key: 'q4' as const, text: 'Have you ever been hospitalized for a serious illness or surgery?', detailKey: 'q4_details' as const },
    { key: 'q5' as const, text: 'Do you have any known allergies (drugs, food, latex, etc.)?', detailKey: 'q5_details' as const },
    { key: 'q6' as const, text: 'Are you currently pregnant or nursing?' },
  ];

  const handleUpdateProfile = (data: Record<string, unknown>) => {
    if (user?.id) updateProfile(user.id, data);
  };

  const handleUpdateAssessment = (data: Record<string, unknown>) => {
    if (user?.id) updateAssessment(user.id, data);
  };

  const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal and medical information</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-mint flex items-center justify-center">
            <User className="w-7 h-7 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {profile?.first_name || profile?.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : user?.username || 'Not set'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAssessmentSubmitted() ? 'Profile & Assessment complete' : 'Assessment pending'}
              {age !== null && ` | Age: ${age}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {step === 'info' ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Patient Details</CardTitle>
            <CardDescription>Core personal and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Last Name *</Label>
                <Input value={profile?.last_name || ''} onChange={e => handleUpdateProfile({ last_name: e.target.value })} placeholder="Last name" />
              </div>
              <div>
                <Label>First Name *</Label>
                <Input value={profile?.first_name || ''} onChange={e => handleUpdateProfile({ first_name: e.target.value })} placeholder="First name" />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input value={profile?.middle_name || ''} onChange={e => handleUpdateProfile({ middle_name: e.target.value })} placeholder="Middle name" />
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <Input type="date" value={profile?.date_of_birth || ''} onChange={e => handleUpdateProfile({ date_of_birth: e.target.value })} />
                {age !== null && <p className="text-xs text-muted-foreground mt-1">Age: {age} years old</p>}
              </div>
              <div>
                <Label>Gender *</Label>
                <Select value={profile?.gender || ''} onValueChange={v => handleUpdateProfile({ gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mobile Number *</Label>
                <Input value={profile?.phone || ''} onChange={e => handleUpdateProfile({ phone: e.target.value })} placeholder="Phone" />
              </div>
            </div>
            <div>
              <Label>Home Address</Label>
              <Input value={profile?.address || ''} onChange={e => handleUpdateProfile({ address: e.target.value })} placeholder="Address" />
            </div>
            <Button onClick={handleSaveInfo} className="w-full gap-2">
              Continue to Medical History <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Medical History</CardTitle>
            <CardDescription>A short summary of relevant health information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-4">
              {questions.map((q, i) => (
                <li key={q.key}>
                  <p className="text-sm text-foreground font-medium">{i + 1}. {q.text}</p>
                  <div className="flex gap-4 mt-1.5">
                    {(['yes', 'no'] as const).map(val => (
                      <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={assessment?.[q.key] === val}
                          onChange={() => handleUpdateAssessment({ [q.key]: val })} className="accent-secondary" />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                  {'detailKey' in q && q.detailKey && assessment?.[q.key] === 'yes' && (
                    <Input className="mt-2" placeholder="Please specify"
                      value={assessment?.[q.detailKey] || ''}
                      onChange={e => handleUpdateAssessment({ [q.detailKey!]: e.target.value })} />
                  )}
                </li>
              ))}
            </ol>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of last medical check-up</Label>
                <Input type="date" value={assessment?.last_checkup || ''} onChange={e => handleUpdateAssessment({ last_checkup: e.target.value })} />
              </div>
              <div>
                <Label>Other medical conditions</Label>
                <Input value={assessment?.other_medical || ''} onChange={e => handleUpdateAssessment({ other_medical: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-foreground mb-2">Consent & Acknowledgement</h4>
              <div className="flex items-start gap-2">
                <Checkbox checked={assessment?.consent || false}
                  onCheckedChange={c => handleUpdateAssessment({ consent: c === true })} className="mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I acknowledge that I have truthfully completed the questionnaire. I agree to disclose all past illnesses, medical, and dental history. I understand that providing incorrect information can be harmful to my health.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('info')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back to Info
              </Button>
              <Button onClick={handleSubmitAssessment} className="flex-1 gap-2" disabled={isAssessmentSubmitted()}>
                <Save className="w-4 h-4" /> {isAssessmentSubmitted() ? 'Already Submitted' : 'Submit Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
