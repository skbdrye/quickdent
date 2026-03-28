import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, CalendarDays, CalendarOff, CalendarClock, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationsStore, useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'new_booking': return <CalendarDays className="w-4 h-4 text-emerald-500" />;
    case 'cancellation': return <CalendarOff className="w-4 h-4 text-red-500" />;
    case 'reschedule': return <CalendarClock className="w-4 h-4 text-blue-500" />;
    case 'reminder': return <CalendarDays className="w-4 h-4 text-secondary" />;
    case 'no_show_warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'ban_notice': return <ShieldAlert className="w-4 h-4 text-red-500" />;
    case 'status_change': return <Info className="w-4 h-4 text-blue-500" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, clearAll } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full hover:bg-muted"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-[18px] h-[18px] text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => user?.id && markAllAsRead(user.id)}>
                  <CheckCheck className="w-3.5 h-3.5" /> Read all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={() => { if (user?.id) { clearAll(user.id); setOpen(false); } }}>
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[360px]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((n: Notification) => (
                  <button
                    key={n.id}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors',
                      !n.is_read && 'bg-secondary/5'
                    )}
                    onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                  >
                    <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm truncate', !n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80')}>{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="shrink-0 mt-1"><Check className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-secondary" /></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {unreadCount > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 text-center">
              <Badge variant="secondary" className="text-[10px]">{unreadCount} unread</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
