import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'glass border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      )}>
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
              Q
            </div>
            <span className={cn(
              'font-bold text-lg transition-colors',
              scrolled ? 'text-foreground' : 'text-primary-foreground'
            )}>
              QuickDent
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  scrolled
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <Button
                  variant={scrolled ? 'outline' : 'hero'}
                  size="sm"
                  onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                >
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}
                  className={scrolled ? '' : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={scrolled ? 'default' : 'hero'}
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                >
                  Login
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdminLoginOpen(true)}
                  className={scrolled ? '' : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'}
                >
                  Admin
                </Button>
              </>
            )}
          </div>

          <button
            className={cn(
              'md:hidden p-2 rounded-md transition-colors',
              scrolled ? 'text-foreground' : 'text-primary-foreground'
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden glass border-t border-border/50">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map(link => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-2 border-t border-border flex flex-col gap-2">
                {isAuthenticated && user ? (
                  <>
                    <Button size="sm" onClick={() => { navigate(user.role === 'admin' ? '/admin' : '/dashboard'); setMobileOpen(false); }}>
                      Dashboard
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { logout(); setMobileOpen(false); }}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => { setLoginOpen(true); setMobileOpen(false); }}>
                      Login
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setAdminLoginOpen(true); setMobileOpen(false); }}>
                      Admin Login
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </>
  );
}
