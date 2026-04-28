import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, User, Settings, LogOut, Users, Stethoscope, FileText, CalendarCheck, Image, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import type { DashboardPage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UserSidebarProps {
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
}

export const userNavItems: { page: DashboardPage; icon: typeof LayoutDashboard; label: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { page: 'appointments', icon: CalendarPlus, label: 'Book Appointment' },
  { page: 'group-booking', icon: Users, label: 'Book for Others' },
  { page: 'my-appointments', icon: CalendarCheck, label: 'Appointments' },
  { page: 'standby', icon: Clock, label: 'Standby Queue' },
  { page: 'services', icon: Stethoscope, label: 'Services' },
  { page: 'prescriptions', icon: FileText, label: 'Prescriptions' },
  { page: 'xrays', icon: Image, label: 'X-Rays' },
  { page: 'profile', icon: User, label: 'Profile' },
  { page: 'settings', icon: Settings, label: 'Settings' },
];

export function UserSidebar({ activePage, onNavigate }: UserSidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="hidden md:block w-64 h-screen sticky top-0 shrink-0">
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
              <img src="/logo.png" alt="QuickDent" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-semibold text-sm text-sidebar-primary">QuickDent</p>
              <p className="text-xs text-sidebar-foreground/60">{user?.username || 'Patient'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-2">Main</p>
          {userNavItems.map(({ page, icon: Icon, label }) => {
            const active = activePage === page;
            return (
              <button key={page} onClick={() => onNavigate(page)} className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-0.5'
              )}>
                {active && (
                  <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full" />
                )}
                <Icon className={cn('w-4 h-4 shrink-0 transition-transform', active && 'scale-110')} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
