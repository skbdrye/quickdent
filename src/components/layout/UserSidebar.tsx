import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, User, Settings, LogOut, Menu, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import type { DashboardPage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UserSidebarProps {
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
}

const navItems: { page: DashboardPage; icon: typeof LayoutDashboard; label: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { page: 'appointments', icon: CalendarPlus, label: 'Book Appointment' },
  { page: 'group-booking', icon: Users, label: 'Group Booking' },
  { page: 'profile', icon: User, label: 'Profile' },
  { page: 'settings', icon: Settings, label: 'Settings' },
];

export function UserSidebar({ activePage, onNavigate }: UserSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNav = (page: DashboardPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-bold text-lg">
            Q
          </div>
          <div>
            <p className="font-semibold text-sidebar-foreground text-sm">QuickDent</p>
            <p className="text-xs text-sidebar-foreground/60">{user?.username || 'Patient'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Main
        </p>
        {navItems.map(({ page, icon: Icon, label }) => (
          <button
            key={page}
            onClick={() => handleNav(page)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              activePage === page
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-primary text-primary-foreground shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
}
