import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface MedicalAssessmentFields {
  med_q1: string;
  med_q2: string;
  med_q2_details: string;
  med_q3: string;
  med_q3_details: string;
  med_q4: string;
  med_q4_details: string;
  med_q5: string;
  med_q5_details: string;
  med_q6: string;
  med_last_checkup: string;
  med_other: string;
  med_consent: boolean;
}

export const emptyMedical: MedicalAssessmentFields = {
  med_q1: '', med_q2: '', med_q2_details: '',
  med_q3: '', med_q3_details: '',
  med_q4: '', med_q4_details: '',
  med_q5: '', med_q5_details: '',
  med_q6: '',
  med_last_checkup: '', med_other: '',
  med_consent: false,
};

const QUESTIONS: { key: keyof MedicalAssessmentFields; text: string; detailKey?: keyof MedicalAssessmentFields }[] = [
  { key: 'med_q1', text: 'In good health currently?' },
  { key: 'med_q2', text: 'Undergoing medical treatment?', detailKey: 'med_q2_details' },
  { key: 'med_q3', text: 'Taking maintenance medications?', detailKey: 'med_q3_details' },
  { key: 'med_q4', text: 'Hospitalized for serious illness?', detailKey: 'med_q4_details' },
  { key: 'med_q5', text: 'Known allergies?', detailKey: 'med_q5_details' },
  { key: 'med_q6', text: 'Currently pregnant or nursing?' },
];

interface Props {
  value: MedicalAssessmentFields;
  onChange: (next: MedicalAssessmentFields) => void;
  /** Show a "last checkup" + "other medical" + consent checkbox. */
  showFooter?: boolean;
  /** Hide consent checkbox even if footer shown */
  hideConsent?: boolean;
  className?: string;
}

export const MedicalAssessmentForm = React.memo(function MedicalAssessmentForm({
  value, onChange, showFooter = true, hideConsent = false, className,
}: Props) {
  // Stable setter that always reads the latest value via refs — prevents
  // re-creating handler functions every keystroke (kills input lag).
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const set = React.useCallback(
    <K extends keyof MedicalAssessmentFields>(k: K, v: MedicalAssessmentFields[K]) => {
      onChangeRef.current({ ...valueRef.current, [k]: v });
    },
    [],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical History</p>
      {QUESTIONS.map(q => (
        <div key={q.key} className="space-y-1.5">
          <p className="text-sm text-foreground leading-snug">{q.text}</p>
          <div className="flex gap-4">
            {(['yes', 'no'] as const).map(v => (
              <label key={v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  checked={value[q.key] === v}
                  onChange={() => set(q.key, v as MedicalAssessmentFields[typeof q.key])}
                  className="accent-secondary h-3.5 w-3.5"
                />
                {v === 'yes' ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
          {q.detailKey && value[q.key] === 'yes' && (
            <Input
              className="h-9 text-sm"
              placeholder="Please specify"
              value={String(value[q.detailKey] || '')}
              onChange={e => set(q.detailKey!, e.target.value as MedicalAssessmentFields[typeof q.detailKey])}
            />
          )}
        </div>
      ))}

      {showFooter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <Label className="text-xs">Last dental checkup</Label>
            <Input className="h-9 mt-1" placeholder="e.g. 2024-08" value={value.med_last_checkup} onChange={e => set('med_last_checkup', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Other medical info</Label>
            <Input className="h-9 mt-1" placeholder="Optional" value={value.med_other} onChange={e => set('med_other', e.target.value)} />
          </div>
        </div>
      )}

      {showFooter && !hideConsent && (
        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            checked={value.med_consent}
            onCheckedChange={c => set('med_consent', c === true)}
            className="mt-0.5"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            I acknowledge the medical information provided is truthful and accurate, and consent to its use for treatment.
          </p>
        </div>
      )}
    </div>
  );
});
