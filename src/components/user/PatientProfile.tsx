import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfileStore, useAuthStore } from '@/lib/store';
import { matchingAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { User, FileText, ChevronRight, ChevronLeft, Save, Loader2, UserCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateAge } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import type { DashboardPage } from '@/lib/types';

interface PatientProfileProps {
  onNavigate?: (page: DashboardPage) => void;
}

export function PatientProfile({ onNavigate }: PatientProfileProps) {
  const { profile, assessment, fetchProfile, fetchAssessment, updateProfile, updateAssessment, submitAssessment, isAssessmentSubmitted } = useProfileStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'medical'>('info');
  const [isSaving, setIsSaving] = useState(false);

  // LOCAL STATE for profile form - prevents API calls on every keystroke
  const [localProfile, setLocalProfile] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    address: '',
    patient_type: '' as '' | 'new' | 'existing',
  });

  // LOCAL STATE for assessment form - prevents API calls on every keystroke
  const [localAssessment, setLocalAssessment] = useState({
    q1: '',
    q2: '',
    q2_details: '',
    q3: '',
    q3_details: '',
    q4: '',
    q4_details: '',
    q5: '',
    q5_details: '',
    q6: '',
    last_checkup: '',
    other_medical: '',
    consent: false,
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchAssessment(user.id);
    }
  }, [user?.id, fetchProfile, fetchAssessment]);

  // Sync local state when profile loads from server
  useEffect(() => {
    if (profile) {
      setLocalProfile({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        middle_name: profile.middle_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        phone: profile.phone || '',
        address: profile.address || '',
        patient_type: (profile.patient_type as 'new' | 'existing' | null) || '',
      });
    }
  }, [profile]);

  // Track the initial assessment values to detect changes
  const initialAssessmentRef = useRef<string>('');

  // Sync local state when assessment loads from server
  useEffect(() => {
    if (assessment) {
      const newAssessment = {
        q1: assessment.q1 || '',
        q2: assessment.q2 || '',
        q2_details: assessment.q2_details || '',
        q3: assessment.q3 || '',
        q3_details: assessment.q3_details || '',
        q4: assessment.q4 || '',
        q4_details: assessment.q4_details || '',
        q5: assessment.q5 || '',
        q5_details: assessment.q5_details || '',
        q6: assessment.q6 || '',
        last_checkup: assessment.last_checkup || '',
        other_medical: assessment.other_medical || '',
        consent: assessment.consent || false,
      };
      setLocalAssessment(newAssessment);
      initialAssessmentRef.current = JSON.stringify(newAssessment);
    }
  }, [assessment]);

  // Detect if assessment has changed from initial loaded state.
  // Use a deferred copy so heavy JSON.stringify diffs don't run on every keystroke.
  const deferredAssessment = useDeferredValue(localAssessment);
  const hasAssessmentChanged = useMemo(() => {
    if (!initialAssessmentRef.current) return true; // First time submit - always allow
    return JSON.stringify(deferredAssessment) !== initialAssessmentRef.current;
  }, [deferredAssessment]);

  const handleSaveInfo = async () => {
    if (!user?.id) return;
    const missingFields: string[] = [];
    if (!localProfile.first_name) missingFields.push('First Name');
    if (!localProfile.last_name) missingFields.push('Last Name');
    if (!localProfile.date_of_birth) missingFields.push('Date of Birth');
    if (!localProfile.gender) missingFields.push('Gender');
    if (!localProfile.phone) missingFields.push('Mobile Number');
    if (!localProfile.patient_type) missingFields.push('Patient Type');
    if (missingFields.length > 0) {
      toast({ title: 'Missing Information', description: `Please fill in: ${missingFields.join(', ')}`, variant: 'destructive' });
      return;
    }

    // Detect if anything actually changed compared to currently-saved profile.
    // If nothing changed, silently advance to medical step without DB hit and toast.
    const current = (profile || {}) as Record<string, unknown>;
    const fields: Array<keyof typeof localProfile> = ['first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender', 'address', 'phone', 'patient_type'];
    const hasChanges = fields.some(f => (localProfile[f] || '') !== (current[f as string] || ''));
    if (!hasChanges) {
      setStep('medical');
      return;
    }

    setIsSaving(true);
    try {
      const { patient_type, ...rest } = localProfile;
      await updateProfile(user.id, {
        ...rest,
        patient_type: patient_type === '' ? null : patient_type,
      });

      // Check for matching group members (non-registered person merge)
      if (localProfile.first_name && localProfile.last_name && localProfile.date_of_birth && localProfile.gender) {
        const result = await matchingAPI.checkAndMerge(user.id, localProfile.first_name, localProfile.last_name, localProfile.date_of_birth, localProfile.gender);
        if (result.merged) {
          toast({ title: 'Records Found', description: `${result.count} previous record(s) linked to your account.` });
          await fetchAssessment(user.id);
        }
      }

      toast({ title: 'Saved', description: 'Patient info updated' });
      setStep('medical');
    } catch {
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleSubmitAssessment = async () => {
    if (!user?.id) return;
    const required: (keyof typeof localAssessment)[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    const unanswered: string[] = [];
    for (const q of required) {
      if (!localAssessment[q]) {
        const questionObj = questions.find(question => question.key === q);
        unanswered.push(questionObj ? `Question ${questions.indexOf(questionObj) + 1}` : q);
      }
    }
    if (unanswered.length > 0) {
      toast({ title: 'Incomplete Assessment', description: `Please answer all medical questions (${unanswered.join(', ')} unanswered)`, variant: 'destructive' });
      return;
    }
    if (!localAssessment.consent) {
      toast({ title: 'Consent Required', description: 'Please check the consent box to proceed', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await updateAssessment(user.id, { ...localAssessment, is_submitted: true });
      await submitAssessment(user.id);
      // Update the initial snapshot so "Update Assessment" becomes disabled again until new changes
      initialAssessmentRef.current = JSON.stringify(localAssessment);
      toast({ title: 'Assessment saved', description: 'Your medical assessment has been updated successfully.' });
      // Navigate back to dashboard after successful submission
      if (onNavigate) {
        onNavigate('dashboard');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to submit assessment', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const questions = [
    { key: 'q1' as const, text: 'Do you consider yourself to be in good health currently?' },
    { key: 'q2' as const, text: 'Are you currently undergoing any medical treatment?', detailKey: 'q2_details' as const },
    { key: 'q3' as const, text: 'Are you taking any maintenance medications?', detailKey: 'q3_details' as const },
    { key: 'q4' as const, text: 'Have you ever been hospitalized for a serious illness or surgery?', detailKey: 'q4_details' as const },
    { key: 'q5' as const, text: 'Do you have any known allergies (drugs, food, latex, etc.)?', detailKey: 'q5_details' as const },
    { key: 'q6' as const, text: 'Are you currently pregnant or nursing?' },
  ];

  const updateLocalProfile = useCallback((data: Partial<typeof localProfile>) => {
    setLocalProfile(prev => ({ ...prev, ...data }));
  }, []);

  const updateLocalAssessment = useCallback((data: Partial<typeof localAssessment>) => {
    setLocalAssessment(prev => ({ ...prev, ...data }));
  }, []);

  const age = localProfile.date_of_birth ? calculateAge(localProfile.date_of_birth) : null;

  // Date of birth select helpers - use independent state so partial selections persist
  const [dobParts, setDobParts] = useState<{ year: string; month: string; day: string }>({ year: '', month: '', day: '' });

  // Sync dobParts when localProfile.date_of_birth loads from server
  useEffect(() => {
    if (localProfile.date_of_birth) {
      const [y, m, d] = localProfile.date_of_birth.split('-');
      setDobParts({ year: y || '', month: m || '', day: d || '' });
    }
  }, [localProfile.date_of_birth]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 120 }, (_, i) => String(currentYear - i)), [currentYear]);
  const months = useMemo(() => [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ], []);

  const daysInMonth = useMemo(() => {
    if (!dobParts.year || !dobParts.month) return 31;
    return new Date(Number(dobParts.year), Number(dobParts.month), 0).getDate();
  }, [dobParts.year, dobParts.month]);

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')), [daysInMonth]);

  const handleDobChange = useCallback((part: 'year' | 'month' | 'day', value: string) => {
    setDobParts(prev => {
      const newParts = { ...prev, [part]: value };
      // Auto-fix day if it exceeds the new month's max
      if (newParts.year && newParts.month) {
        const maxDay = new Date(Number(newParts.year), Number(newParts.month), 0).getDate();
        if (Number(newParts.day) > maxDay) newParts.day = String(maxDay).padStart(2, '0');
      }
      // Only update the full date_of_birth when all 3 parts are selected
      if (newParts.year && newParts.month && newParts.day) {
        updateLocalProfile({ date_of_birth: `${newParts.year}-${newParts.month}-${newParts.day}` });
      }
      return newParts;
    });
  }, [updateLocalProfile]);

  // Last checkup date select helpers - same pattern as DOB
  const [checkupParts, setCheckupParts] = useState<{ year: string; month: string; day: string }>({ year: '', month: '', day: '' });

  useEffect(() => {
    if (localAssessment.last_checkup) {
      const [y, m, d] = localAssessment.last_checkup.split('-');
      setCheckupParts({ year: y || '', month: m || '', day: d || '' });
    }
  }, [localAssessment.last_checkup]);

  const handleCheckupChange = useCallback((part: 'year' | 'month' | 'day', value: string) => {
    setCheckupParts(prev => {
      const newParts = { ...prev, [part]: value };
      if (newParts.year && newParts.month) {
        const maxDay = new Date(Number(newParts.year), Number(newParts.month), 0).getDate();
        if (Number(newParts.day) > maxDay) newParts.day = String(maxDay).padStart(2, '0');
      }
      if (newParts.year && newParts.month && newParts.day) {
        updateLocalAssessment({ last_checkup: `${newParts.year}-${newParts.month}-${newParts.day}` });
      }
      return newParts;
    });
  }, [updateLocalAssessment]);

  return (
    <div className="space-y-6 w-full max-w-4xl overflow-hidden">
      <PageHeader
        icon={UserCircle}
        title="Patient Profile"
        description="Manage your personal and medical information"
      />

      {/* Profile summary card with progress */}
      <Card className="border-border/60 overflow-hidden">
        <div className="bg-gradient-to-br from-mint/60 via-mint/20 to-transparent p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center ring-1 ring-secondary/20 shadow-sm shrink-0">
            <User className="w-8 h-8 text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">
              {localProfile.first_name || localProfile.last_name ? `${localProfile.first_name} ${localProfile.last_name}`.trim() : user?.username || 'Not set'}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isAssessmentSubmitted() ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                {isAssessmentSubmitted() ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isAssessmentSubmitted() ? 'Profile complete' : 'Assessment pending'}
              </span>
              {age !== null && (
                <span className="text-xs text-muted-foreground">Age: <strong className="text-foreground">{age}</strong></span>
              )}
            </div>
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-border/40 bg-card">
          <button
            type="button"
            onClick={() => setStep('info')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${step === 'info' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">1</span>
            Patient Info
          </button>
          <span className="w-8 h-px bg-border" />
          <button
            type="button"
            onClick={() => setStep('medical')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${step === 'medical' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">2</span>
            Medical History
          </button>
        </div>
      </Card>

      {step === 'info' ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Patient Details</CardTitle>
            <CardDescription>Core personal and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Last Name *</Label>
                <Input value={localProfile.last_name} onChange={e => updateLocalProfile({ last_name: e.target.value.slice(0, 30) })} placeholder="Last name" maxLength={30} className="w-full truncate" />
              </div>
              <div>
                <Label>First Name *</Label>
                <Input value={localProfile.first_name} onChange={e => updateLocalProfile({ first_name: e.target.value.slice(0, 30) })} placeholder="First name" maxLength={30} className="w-full truncate" />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input value={localProfile.middle_name} onChange={e => updateLocalProfile({ middle_name: e.target.value.slice(0, 30) })} placeholder="Middle name" maxLength={30} className="w-full truncate" />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Date of Birth *</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <Select value={dobParts.month} onValueChange={v => handleDobChange('month', v)}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={dobParts.day} onValueChange={v => handleDobChange('day', v)}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={dobParts.year} onValueChange={v => handleDobChange('year', v)}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {age !== null && <p className="text-xs text-muted-foreground mt-1">Age: {age} years old</p>}
              </div>
              <div>
                <Label>Gender *</Label>
                <Select value={localProfile.gender} onValueChange={v => updateLocalProfile({ gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mobile Number *</Label>
                <Input value={localProfile.phone} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                <p className="text-[11px] text-muted-foreground mt-1">Phone can only be changed in Settings</p>
              </div>
            </div>
            <div>
              <Label>Home Address</Label>
              <Textarea
                value={localProfile.address}
                onChange={e => updateLocalProfile({ address: e.target.value.slice(0, 150) })}
                placeholder="Enter your complete home address (Street, Barangay, City, Province)"
                maxLength={150}
                className="resize-none h-20 w-full"
              />
              <p className="text-[11px] text-muted-foreground mt-1">{localProfile.address.length}/150 characters</p>
            </div>

            {/* Patient type — new vs existing */}
            <div>
              <Label>Are you a new or existing patient? *</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Existing patients already have a paper record on file at the clinic.</p>
              <div className="grid grid-cols-2 gap-2">
                {(['new', 'existing'] as const).map(opt => {
                  const selected = localProfile.patient_type === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateLocalProfile({ patient_type: opt })}
                      className={`relative rounded-xl border px-3.5 py-3.5 text-left transition-all duration-200 ${selected ? 'border-secondary bg-secondary text-secondary-foreground shadow-md scale-[1.01]' : 'border-border bg-card hover:border-secondary/50 hover:bg-mint/40 hover:-translate-y-0.5 hover:shadow-sm'}`}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                      <p className="font-semibold capitalize text-sm">{opt} patient</p>
                      <p className={`text-[11px] mt-0.5 ${selected ? 'text-secondary-foreground/85' : 'text-muted-foreground'}`}>
                        {opt === 'new' ? 'First time at QuickDent.' : 'I already have records at the clinic.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleSaveInfo} className="w-full gap-2" disabled={isSaving}>
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Continue to Medical History <ChevronRight className="w-4 h-4" /></>}
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
                        <input type="radio" checked={localAssessment[q.key] === val}
                          onChange={() => updateLocalAssessment({ [q.key]: val })} className="accent-secondary" />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                  {'detailKey' in q && q.detailKey && localAssessment[q.key] === 'yes' && (
                    <Input className="mt-2" placeholder="Please specify"
                      value={localAssessment[q.detailKey] || ''}
                      onChange={e => updateLocalAssessment({ [q.detailKey!]: e.target.value })} />
                  )}
                </li>
              ))}
            </ol>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5">
                  Date of last medical check-up
                  <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Optional</span>
                </Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <Select value={checkupParts.month} onValueChange={v => handleCheckupChange('month', v)}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={checkupParts.day} onValueChange={v => handleCheckupChange('day', v)}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={checkupParts.year} onValueChange={v => handleCheckupChange('year', v)}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  Other medical conditions
                  <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Optional</span>
                </Label>
                <Input value={localAssessment.other_medical} onChange={e => updateLocalAssessment({ other_medical: e.target.value })} placeholder="Anything else we should know" />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-foreground mb-2">Consent & Acknowledgement</h4>
              <div className="flex items-start gap-2">
                <Checkbox checked={localAssessment.consent}
                  onCheckedChange={c => updateLocalAssessment({ consent: c === true })} className="mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I acknowledge that I have truthfully completed the questionnaire. I agree to disclose all past illnesses, medical, and dental history. I understand that providing incorrect information can be harmful to my health.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('info')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back to Info
              </Button>
              <Button onClick={handleSubmitAssessment} className="flex-1 gap-2" disabled={isSaving || (isAssessmentSubmitted() && !hasAssessmentChanged)}>
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
                  <><Save className="w-4 h-4" /> {isAssessmentSubmitted() ? 'Update Assessment' : 'Submit Assessment'}</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
