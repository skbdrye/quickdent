import { LayoutDashboard, CalendarCheck, Users, MoreHorizontal, Clock, Stethoscope, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminPage } from '@/lib/types';
import { useState } from 'react';

interface AdminMobileBottomNavProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

const primaryItems: { page: AdminPage; icon: typeof LayoutDashboard; label: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { page: 'appointments', icon: CalendarCheck, label: 'Appts' },
  { page: 'patients', icon: Users, label: 'Patients' },
];

const moreItems: { page: AdminPage; icon: typeof LayoutDashboard; label: string }[] = [
  { page: 'prescriptions', icon: FileText, label: 'Prescriptions' },
  { page: 'schedule', icon: Clock, label: 'Schedule' },
  { page: 'services', icon: Stethoscope, label: 'Services' },
];

export function AdminMobileBottomNav({ activePage, onNavigate }: AdminMobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = moreItems.some(m => m.page === activePage);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
          <div className="absolute bottom-16 left-4 right-4 bg-card rounded-xl border border-border shadow-lg p-2 animate-fade-in-up">
            {moreItems.map(({ page, icon: Icon, label }) => (
              <button
                key={page}
                onClick={() => { onNavigate(page); setMoreOpen(false); }}
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  activePage === page ? 'bg-secondary/10 text-secondary' : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around h-14 px-1">
          {primaryItems.map(({ page, icon: Icon, label }) => {
            const isActive = activePage === page;
            return (
              <button
                key={page}
                onClick={() => { onNavigate(page); setMoreOpen(false); }}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors',
                  isActive ? 'text-secondary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-secondary')} />
                <span className={cn('text-[10px] font-medium', isActive && 'text-secondary')}>{label}</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-secondary" />}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors',
              isMoreActive ? 'text-secondary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className={cn('w-5 h-5', isMoreActive && 'text-secondary')} />
            <span className={cn('text-[10px] font-medium', isMoreActive && 'text-secondary')}>More</span>
            {isMoreActive && <span className="w-1 h-1 rounded-full bg-secondary" />}
          </button>
        </div>
      </nav>
    </>
  );
}
