import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

/**
 * Auto-logout after a period of inactivity, with a "Still here?" warning shown
 * 60 seconds before the actual logout. Activity in any open tab resets the
 * countdown across every tab via a shared localStorage key.
 *
 * @param timeoutMinutes Total minutes of idle before logout (default 12).
 * @param onTimeout      Optional handler called instead of the default logout.
 */
const ACTIVITY_KEY = 'qd_last_activity';
const WARNING_SECONDS = 60; // show "Still here?" 60s before forced logout

export function useInactivityTimer(timeoutMinutes?: number, onTimeout?: () => void) {
  const { logout, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const totalMs = (timeoutMinutes || 12) * 60 * 1000;
  const warningMs = totalMs - WARNING_SECONDS * 1000;

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onTimeoutRef = useRef(onTimeout);
  const isAuthRef = useRef(isAuthenticated);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);
  useEffect(() => { isAuthRef.current = isAuthenticated; }, [isAuthenticated]);

  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const performLogout = useCallback(() => {
    clearAllTimers();
    setWarningOpen(false);
    if (!isAuthRef.current) return;
    toast({ title: 'Session expired', description: 'You have been logged out due to inactivity.' });
    if (onTimeoutRef.current) {
      onTimeoutRef.current();
    } else {
      logout();
      navigate('/');
    }
  }, [clearAllTimers, logout, navigate, toast]);

  const showWarning = useCallback(() => {
    if (!isAuthRef.current) return;
    setSecondsLeft(WARNING_SECONDS);
    setWarningOpen(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(performLogout, WARNING_SECONDS * 1000);
  }, [performLogout]);

  const resetTimers = useCallback((broadcast = true) => {
    if (!isAuthRef.current) return;
    clearAllTimers();
    setWarningOpen(false);
    setSecondsLeft(WARNING_SECONDS);
    warnTimerRef.current = setTimeout(showWarning, warningMs);
    if (broadcast) {
      try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* ignore */ }
    }
  }, [clearAllTimers, showWarning, warningMs]);

  // Activity listeners + cross-tab sync
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setWarningOpen(false);
      return;
    }

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => { throttleTimer = null; }, 1500); // throttle to 1 event / 1.5s
      resetTimers(true);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) resetTimers(false);
    };

    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    window.addEventListener('storage', onStorage);

    resetTimers(true);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
      window.removeEventListener('storage', onStorage);
      if (throttleTimer) clearTimeout(throttleTimer);
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const stayActive = useCallback(() => resetTimers(true), [resetTimers]);
  const logoutNow = useCallback(() => performLogout(), [performLogout]);

  return { warningOpen, secondsLeft, stayActive, logoutNow };
}
