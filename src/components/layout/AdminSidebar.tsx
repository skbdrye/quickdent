import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, LogOut, Menu, X, Users, Clock, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import type { AdminPage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

const navItems: { page: AdminPage; icon: typeof LayoutDashboard; label: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { page: 'appointments', icon: CalendarCheck, label: 'Appointments' },
  { page: 'patients', icon: Users, label: 'Patients' },
  { page: 'schedule', icon: Clock, label: 'Clinic Schedule' },
  { page: 'services', icon: Stethoscope, label: 'Services' },
];

export function AdminSidebar({ activePage, onNavigate }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNav = (page: AdminPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-bold text-sm">
            Q
          </div>
          <div>
            <p className="font-semibold text-sm text-sidebar-primary">QuickDent</p>
            <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-2">Management</p>
        {navItems.map(({ page, icon: Icon, label }) => (
          <button key={page} onClick={() => handleNav(page)} className={cn(
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
  );

  return (
    <>
      <Button variant="ghost" size="icon" className="fixed top-3 left-3 z-50 md:hidden bg-primary text-primary-foreground shadow-md" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full animate-slide-in-left">{sidebarContent}</div>
        </div>
      )}

      <div className="hidden md:block w-64 h-screen sticky top-0 shrink-0">{sidebarContent}</div>
    </>
  );
}
