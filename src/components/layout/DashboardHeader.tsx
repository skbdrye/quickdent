import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuthStore } from '@/lib/store';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  title?: string;
  onNavigateToAppointment?: () => void;
  onNavigateToPrescriptions?: () => void;
}

export function DashboardHeader({ title, onNavigateToAppointment, onNavigateToPrescriptions }: DashboardHeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-card/80 backdrop-blur-md border-b border-border/50 md:pl-6">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs md:hidden shrink-0">
          Q
        </div>
        <span className="text-sm font-semibold text-foreground md:hidden truncate">{title || 'QuickDent'}</span>
        <span className="hidden md:block text-sm font-medium text-foreground truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:block text-xs text-muted-foreground mr-1 truncate max-w-[120px]">
          {user?.username}
        </span>
        <NotificationBell
          onNavigateToAppointment={onNavigateToAppointment}
          onNavigateToPrescriptions={onNavigateToPrescriptions}
        />
        {user?.role === 'admin' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign Out</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
