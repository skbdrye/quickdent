import { useState, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserDashboard } from '@/components/user/UserDashboard';
import { OnboardingTutorial } from '@/components/user/OnboardingTutorial';
import type { DashboardPage } from '@/lib/types';

// Lazy load non-dashboard pages for better performance
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
  const { user, isAuthenticated } = useAuthStore();
  const [activePage, setActivePage] = useState<DashboardPage>('dashboard');

  if (!isAuthenticated || !user || user.role !== 'user') {
    return <Navigate to="/" />;
  }

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
      <main className="flex-1 p-4 md:p-6 overflow-auto">{renderPage()}</main>
      <OnboardingTutorial userId={user.id} />
    </div>
  );
}
