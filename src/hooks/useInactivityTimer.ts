import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useInactivityTimer(timeoutMinutes?: number, onTimeout?: () => void) {
  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimeout = (timeoutMinutes || 30) * 60 * 1000;

  const handleLogout = useCallback(() => {
    if (!isAuthenticated) return;
    
    if (onTimeout) {
      onTimeout();
    } else {
      logout();
      toast({ title: 'Session Expired', description: 'You have been logged out due to inactivity.' });
      navigate('/');
    }
  }, [isAuthenticated, logout, navigate, toast, onTimeout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, inactivityTimeout);
  }, [handleLogout, inactivityTimeout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);
}
