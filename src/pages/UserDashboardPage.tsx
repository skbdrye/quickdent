import { useState, lazy, Suspense, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationsStore, useAppointmentsStore } from '@/lib/store';
import { remindersAPI } from '@/lib/api';
import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserDashboard } from '@/components/user/UserDashboard';
import { OnboardingTutorial } from '@/components/user/OnboardingTutorial';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import type { DashboardPage } from '@/lib/types';

const AppointmentBooking = lazy(() => import('@/components/user/AppointmentBooking').then(m => ({ default: m.AppointmentBooking })));
const GroupBooking = lazy(() => import('@/components/user/GroupBooking').then(m => ({ default: m.GroupBooking })));
const PatientProfile = lazy(() => import('@/components/user/PatientProfile').then(m => ({ default: m.PatientProfile })));
const UserSettings = lazy(() => import('@/components/user/UserSettings'));
const ServicesDisplay = lazy(() => import('@/components/user/ServicesDisplay'));
const PrescriptionsView = lazy(() => import('@/components/user/PrescriptionsView'));

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
  const { fetchNotifications } = useNotificationsStore();
  const { appointments, fetchUserAppointments } = useAppointmentsStore();
  const navigate = useNavigate();

  // Auto-logout after 15 minutes of inactivity
  useInactivityTimer(15, () => {
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
  // Only for regular users, NOT admins
  useEffect(() => {
    if (user?.id && user.role === 'user' && appointments.length > 0) {
      remindersAPI.generateReminders(user.id, appointments).catch(() => {});
    }
  }, [user?.id, user?.role, appointments]);

  if (!isAuthenticated || !user || user.role !== 'user') {
    return <Navigate to="/" />;
  }

  const pageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Dashboard';
      case 'appointments': return 'Book Appointment';
      case 'group-booking': return 'Book for Others';
      case 'services': return 'Services';
      case 'prescriptions': return 'Prescriptions';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const handleNavigateToAppointment = () => {
    setActivePage('appointments');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <UserDashboard onNavigate={setActivePage} />;
      case 'appointments': return <Suspense fallback={<PageLoader />}><AppointmentBooking onNavigate={setActivePage} /></Suspense>;
      case 'group-booking': return <Suspense fallback={<PageLoader />}><GroupBooking onNavigate={setActivePage} /></Suspense>;
      case 'services': return <Suspense fallback={<PageLoader />}><ServicesDisplay /></Suspense>;
      case 'prescriptions': return <Suspense fallback={<PageLoader />}><PrescriptionsView /></Suspense>;
      case 'profile': return <Suspense fallback={<PageLoader />}><PatientProfile onNavigate={setActivePage} /></Suspense>;
      case 'settings': return <Suspense fallback={<PageLoader />}><UserSettings /></Suspense>;
      default: return <UserDashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <UserSidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader title={pageTitle()} onNavigateToAppointment={handleNavigateToAppointment} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
      <MobileBottomNav activePage={activePage} onNavigate={setActivePage} />
      <OnboardingTutorial userId={user.id} />
    </div>
  );
}
