import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, LogOut, Users, Clock, Stethoscope, FileText, Image, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import type { AdminPage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

export const adminNavItems: { page: AdminPage; icon: typeof LayoutDashboard; label: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { page: 'appointments', icon: CalendarCheck, label: 'Appointments' },
  { page: 'patients', icon: Users, label: 'Patients' },
  { page: 'prescriptions', icon: FileText, label: 'Prescriptions' },
  { page: 'xrays', icon: Image, label: 'X-Rays' },
  { page: 'standby-queue', icon: Timer, label: 'Standby Queue' },
  { page: 'schedule', icon: Clock, label: 'Clinic Schedule' },
  { page: 'services', icon: Stethoscope, label: 'Services' },
];

export function AdminSidebar({ activePage, onNavigate }: AdminSidebarProps) {
  const { logout } = useAuthStore();
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
              <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-2">Management</p>
          {adminNavItems.map(({ page, icon: Icon, label }) => (
            <button key={page} onClick={() => onNavigate(page)} className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              activePage === page
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
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
