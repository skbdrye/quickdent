import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

interface DaySchedule {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
}

type WeekSchedule = Record<string, DaySchedule>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultSchedule: WeekSchedule = {
  '0': { is_open: false, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
  '1': { is_open: true, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
  '2': { is_open: true, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
  '3': { is_open: true, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
  '4': { is_open: true, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
  '5': { is_open: true, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
  '6': { is_open: true, open_time: '09:00', close_time: '18:00', break_start: '12:00', break_end: '13:00' },
};

export default function ClinicSchedule() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  async function loadSchedule() {
    const { data } = await supabase
      .from('clinic_settings')
      .select('setting_value')
      .eq('setting_key', 'schedule')
      .maybeSingle();
    if (data?.setting_value) {
      setSchedule(data.setting_value as unknown as WeekSchedule);
    }
  }

  async function saveSchedule() {
    setSaving(true);
    const { error } = await supabase
      .from('clinic_settings')
      .update({ setting_value: schedule as any, updated_at: new Date().toISOString() })
      .eq('setting_key', 'schedule');

    if (error) {
      toast({ title: 'Error', description: 'Failed to save schedule', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Clinic schedule updated successfully' });
    }
    setSaving(false);
  }

  function updateDay(dayIndex: string, field: keyof DaySchedule, value: string | boolean) {
    setSchedule((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clinic Schedule</h1>
          <p className="text-muted-foreground">Configure your clinic's operating hours</p>
        </div>
        <Button onClick={saveSchedule} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-3">
        {DAY_NAMES.map((name, index) => {
          const dayKey = String(index);
          const day = schedule[dayKey];
          return (
            <Card key={dayKey}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <Switch
                      checked={day.is_open}
                      onCheckedChange={(checked) => updateDay(dayKey, 'is_open', checked)}
                    />
                    <span className={`font-medium ${day.is_open ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {name}
                    </span>
                  </div>

                  {day.is_open ? (
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Open</Label>
                        <Input
                          type="time"
                          value={day.open_time}
                          onChange={(e) => updateDay(dayKey, 'open_time', e.target.value)}
                          className="w-[130px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Close</Label>
                        <Input
                          type="time"
                          value={day.close_time}
                          onChange={(e) => updateDay(dayKey, 'close_time', e.target.value)}
                          className="w-[130px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Break</Label>
                        <Input
                          type="time"
                          value={day.break_start}
                          onChange={(e) => updateDay(dayKey, 'break_start', e.target.value)}
                          className="w-[130px]"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={day.break_end}
                          onChange={(e) => updateDay(dayKey, 'break_end', e.target.value)}
                          className="w-[130px]"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Closed</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
