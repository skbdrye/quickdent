import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { UserSidebar } from '@/components/layout/UserSidebar';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AppointmentBooking } from '@/components/user/AppointmentBooking';
import { GroupBooking } from '@/components/user/GroupBooking';
import { PatientProfile } from '@/components/user/PatientProfile';
import UserSettings from '@/components/user/UserSettings';
import ServicesDisplay from '@/components/user/ServicesDisplay';
import PrescriptionsView from '@/components/user/PrescriptionsView';
import type { DashboardPage } from '@/lib/types';

export default function UserDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activePage, setActivePage] = useState<DashboardPage>('dashboard');

  if (!isAuthenticated || !user || user.role !== 'user') {
    return <Navigate to="/" />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <UserDashboard onNavigate={setActivePage} />;
      case 'appointments': return <AppointmentBooking onNavigate={setActivePage} />;
      case 'group-booking': return <GroupBooking onNavigate={setActivePage} />;
      case 'services': return <ServicesDisplay />;
      case 'prescriptions': return <PrescriptionsView />;
      case 'profile': return <PatientProfile onNavigate={setActivePage} />;
      case 'settings': return <UserSettings />;
      default: return <UserDashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <UserSidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 p-4 md:p-6 overflow-auto">{renderPage()}</main>
    </div>
  );
}
