import { useState, lazy, Suspense, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationsStore, useAppointmentsStore } from '@/lib/store';
import { remindersAPI } from '@/lib/api';
import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserDashboard } from '@/components/user/UserDashboard';
import { UserAppointments } from '@/components/user/UserAppointments';
import { OnboardingTutorial } from '@/components/user/OnboardingTutorial';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { InactivityWarningDialog } from '@/components/shared/InactivityWarningDialog';
import type { DashboardPage } from '@/lib/types';

const AppointmentBooking = lazy(() => import('@/components/user/AppointmentBooking').then(m => ({ default: m.AppointmentBooking })));
const GroupBooking = lazy(() => import('@/components/user/GroupBooking').then(m => ({ default: m.GroupBooking })));
const PatientProfile = lazy(() => import('@/components/user/PatientProfile').then(m => ({ default: m.PatientProfile })));
const UserSettings = lazy(() => import('@/components/user/UserSettings'));
const ServicesDisplay = lazy(() => import('@/components/user/ServicesDisplay'));
const PrescriptionsView = lazy(() => import('@/components/user/PrescriptionsView'));
const XraysView = lazy(() => import('@/components/user/XraysView'));
const StandbyBooking = lazy(() => import('@/components/user/StandbyBooking'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function UserDashboardPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activePage, setActivePage] = useState<DashboardPage>('dashboard');
  const [highlightAppointmentId, setHighlightAppointmentId] = useState<number | null>(null);
  const [highlightKey, setHighlightKey] = useState(0);
  const [prescriptionHighlightId, setPrescriptionHighlightId] = useState<number | null>(null);
  const [prescriptionHighlightKey, setPrescriptionHighlightKey] = useState(0);
  const { fetchNotifications } = useNotificationsStore();
  const { appointments, fetchUserAppointments } = useAppointmentsStore();
  const navigate = useNavigate();

  // Auto-logout after 12 minutes of inactivity (with a 60s warning before sign-out)
  const { warningOpen, secondsLeft, stayActive, logoutNow } = useInactivityTimer(12, () => {
    logout();
    navigate('/');
  });

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      fetchUserAppointments(user.id);
      const interval = setInterval(() => fetchNotifications(user.id), 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications, fetchUserAppointments]);

  // Generate appointment reminders (1 day + 2 hours before)
  useEffect(() => {
    if (user?.id && user.role === 'user' && appointments.length > 0) {
      remindersAPI.generateReminders(user.id, appointments).catch(() => {});
    }
  }, [user?.id, user?.role, appointments]);

  const handleNavigateToAppointment = useCallback((appointmentId?: number | null) => {
    setHighlightAppointmentId(appointmentId || null);
    setHighlightKey(k => k + 1);
    setActivePage('my-appointments');
  }, []);

  const handleNavigateToPrescriptions = useCallback((appointmentId?: number | null) => {
    setPrescriptionHighlightId(appointmentId || null);
    setPrescriptionHighlightKey(k => k + 1);
    setActivePage('prescriptions');
  }, []);

  const handleNavigateToMyAppointments = useCallback((appointmentId?: number) => {
    setHighlightAppointmentId(appointmentId || null);
    setHighlightKey(k => k + 1);
    setActivePage('my-appointments');
  }, []);

  // Clear highlights when leaving the pages
  useEffect(() => {
    if (activePage !== 'my-appointments') {
      setHighlightAppointmentId(null);
    }
    if (activePage !== 'prescriptions') {
      setPrescriptionHighlightId(null);
    }
  }, [activePage]);

  if (!isAuthenticated || !user || user.role !== 'user') {
    return <Navigate to="/" />;
  }

  const pageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Dashboard';
      case 'appointments': return 'Book Appointment';
      case 'group-booking': return 'Book for Others';
      case 'my-appointments': return 'My Appointments';
      case 'services': return 'Services';
      case 'prescriptions': return 'Prescriptions';
      case 'xrays': return 'X-Rays';
      case 'standby': return 'Standby Queue';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <UserDashboard onNavigate={setActivePage} onViewAppointment={handleNavigateToMyAppointments} />;
      case 'appointments': return <Suspense fallback={<PageLoader />}><AppointmentBooking onNavigate={setActivePage} /></Suspense>;
      case 'group-booking': return <Suspense fallback={<PageLoader />}><GroupBooking onNavigate={setActivePage} /></Suspense>;
      case 'my-appointments': return <UserAppointments highlightAppointmentId={highlightAppointmentId} highlightKey={highlightKey} />;
      case 'services': return <Suspense fallback={<PageLoader />}><ServicesDisplay /></Suspense>;
      case 'prescriptions': return <Suspense fallback={<PageLoader />}><PrescriptionsView highlightAppointmentId={prescriptionHighlightId} highlightKey={prescriptionHighlightKey} /></Suspense>;
      case 'xrays': return <Suspense fallback={<PageLoader />}><XraysView /></Suspense>;
      case 'standby': return <Suspense fallback={<PageLoader />}><StandbyBooking /></Suspense>;
      case 'profile': return <Suspense fallback={<PageLoader />}><PatientProfile onNavigate={setActivePage} /></Suspense>;
      case 'settings': return <Suspense fallback={<PageLoader />}><UserSettings /></Suspense>;
      default: return <UserDashboard onNavigate={setActivePage} onViewAppointment={handleNavigateToMyAppointments} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <UserSidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader title={pageTitle()} onNavigateToAppointment={handleNavigateToAppointment} onNavigateToPrescriptions={handleNavigateToPrescriptions} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
      <MobileBottomNav activePage={activePage} onNavigate={setActivePage} />
      <OnboardingTutorial userId={user.id} />
      <InactivityWarningDialog open={warningOpen} secondsLeft={secondsLeft} onStay={stayActive} onLogout={logoutNow} />
    </div>
  );
}
