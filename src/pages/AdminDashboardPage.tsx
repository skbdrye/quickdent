import { useState, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import type { AdminPage } from '@/lib/types';

// Lazy load non-dashboard admin pages
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

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }

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
      <main className="flex-1 p-4 md:p-6 overflow-auto">{renderPage()}</main>
    </div>
  );
}
