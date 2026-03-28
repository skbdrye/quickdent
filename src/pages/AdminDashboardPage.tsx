import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AppointmentManagement from '@/components/admin/AppointmentManagement';
import PatientList from '@/components/admin/PatientList';
import ClinicSchedule from '@/components/admin/ClinicSchedule';
import ServiceManagement from '@/components/admin/ServiceManagement';
import AdminPrescriptions from '@/components/admin/AdminPrescriptions';
import type { AdminPage } from '@/lib/types';

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <AdminDashboard />;
      case 'appointments': return <AppointmentManagement />;
      case 'patients': return <PatientList />;
      case 'schedule': return <ClinicSchedule />;
      case 'services': return <ServiceManagement />;
      case 'prescriptions': return <AdminPrescriptions />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 p-4 md:p-6 overflow-auto">{renderPage()}</main>
    </div>
  );
}
