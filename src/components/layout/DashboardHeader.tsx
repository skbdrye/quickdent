import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuthStore } from '@/lib/store';

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-card/80 backdrop-blur-md border-b border-border/50 md:pl-6">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs md:hidden">
          Q
        </div>
        <span className="text-sm font-semibold text-foreground md:hidden">{title || 'QuickDent'}</span>
        <span className="hidden md:block text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-xs text-muted-foreground mr-1">
          {user?.username}
        </span>
        <NotificationBell />
      </div>
    </header>
  );
}
