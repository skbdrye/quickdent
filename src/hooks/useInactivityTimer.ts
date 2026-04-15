import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_INACTIVITY_TIMEOUT = 12 * 60 * 1000; // 12 minutes

export function useInactivityTimer(timeoutMinutes?: number, onTimeout?: () => void) {
  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMs = useRef((timeoutMinutes || 12) * 60 * 1000);
  const onTimeoutRef = useRef(onTimeout);
  const isAuthRef = useRef(isAuthenticated);

  // Keep refs fresh without triggering re-renders
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);
  useEffect(() => { isAuthRef.current = isAuthenticated; }, [isAuthenticated]);

  const handleLogout = useCallback(() => {
    if (!isAuthRef.current) return;
    if (onTimeoutRef.current) {
      onTimeoutRef.current();
    } else {
      logout();
      toast({ title: 'Session Expired', description: 'You have been logged out due to inactivity.' });
      navigate('/');
    }
  }, [logout, navigate, toast]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, timeoutMs.current);
  }, [handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();
    events.forEach(event => window.addEventListener(event, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);
}
