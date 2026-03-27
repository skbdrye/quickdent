import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { AdminLoginDialog } from '@/components/auth/AdminLoginDialog';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href === '/') {
      navigate('/');
    } else {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border' : 'bg-transparent'
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => handleNavClick('#home')} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
              scrolled ? 'bg-primary text-primary-foreground' : 'bg-primary-foreground/20 text-primary-foreground'
            )}>Q</div>
            <span className={cn('font-semibold text-lg', scrolled ? 'text-foreground' : 'text-primary-foreground')}>QuickDent</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <button key={link.href} onClick={() => handleNavClick(link.href)} className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                scrolled ? 'text-muted-foreground hover:text-foreground hover:bg-muted' : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'
              )}>
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <Button size="sm" onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                  className={scrolled ? '' : 'bg-white text-teal-700 hover:bg-white/90 font-semibold'}>
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}
                  className={scrolled ? '' : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => setLoginOpen(true)}
                  className={scrolled ? '' : 'bg-white text-teal-700 hover:bg-white/90 font-semibold'}>
                  Login
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAdminLoginOpen(true)}
                  className={scrolled ? '' : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'}>
                  Admin
                </Button>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ?
              <X className={scrolled ? 'text-foreground' : 'text-primary-foreground'} /> :
              <Menu className={scrolled ? 'text-foreground' : 'text-primary-foreground'} />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-background border-b border-border">
            <div className="container mx-auto px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <button key={link.href} onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {link.label}
                </button>
              ))}
              <div className="pt-2 border-t border-border space-y-1">
                {isAuthenticated && user ? (
                  <>
                    <Button variant="outline" className="w-full" onClick={() => { navigate(user.role === 'admin' ? '/admin' : '/dashboard'); setMobileOpen(false); }}>Dashboard</Button>
                    <Button variant="ghost" className="w-full" onClick={() => { logout(); setMobileOpen(false); }}>Logout</Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full" onClick={() => { setLoginOpen(true); setMobileOpen(false); }}>Login</Button>
                    <Button variant="ghost" className="w-full" onClick={() => { setAdminLoginOpen(true); setMobileOpen(false); }}>Admin Login</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </>
  );
}
