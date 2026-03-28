import { useState, lazy, Suspense, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, useNotificationsStore } from '@/lib/store';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { AdminMobileBottomNav } from '@/components/layout/AdminMobileBottomNav';
import type { AdminPage } from '@/lib/types';

const AppointmentManagement = lazy(() => import('@/components/admin/AppointmentManagement'));
const PatientList = lazy(() => import('@/components/admin/PatientList'));
const ClinicSchedule = lazy(() => import('@/components/admin/ClinicSchedule'));
const ServiceManagement = lazy(() => import('@/components/admin/ServiceManagement'));
const AdminPrescriptions = lazy(() => import('@/components/admin/AdminPrescriptions'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const { fetchNotifications } = useNotificationsStore();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      const interval = setInterval(() => fetchNotifications(user.id), 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const pageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Admin Dashboard';
      case 'appointments': return 'Appointments';
      case 'patients': return 'Patients';
      case 'prescriptions': return 'Prescriptions';
      case 'schedule': return 'Clinic Schedule';
      case 'services': return 'Services';
      default: return 'Admin Dashboard';
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <AdminDashboard onNavigate={setActivePage} />;
      case 'appointments': return <Suspense fallback={<PageLoader />}><AppointmentManagement /></Suspense>;
      case 'patients': return <Suspense fallback={<PageLoader />}><PatientList /></Suspense>;
      case 'schedule': return <Suspense fallback={<PageLoader />}><ClinicSchedule /></Suspense>;
      case 'services': return <Suspense fallback={<PageLoader />}><ServiceManagement /></Suspense>;
      case 'prescriptions': return <Suspense fallback={<PageLoader />}><AdminPrescriptions /></Suspense>;
      default: return <AdminDashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader title={pageTitle()} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
      <AdminMobileBottomNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}
