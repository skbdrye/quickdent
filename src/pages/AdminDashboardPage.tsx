import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AppointmentManager } from '@/components/admin/AppointmentManagement';
import { PatientList } from '@/components/admin/PatientList';
import type { AdminPage } from '@/lib/types';

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <AdminDashboard />;
      case 'appointments': return <AppointmentManager />;
      case 'group-booking': return <AppointmentManager />; // Group bookings managed through appointments
      case 'patients': return <PatientList />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}
