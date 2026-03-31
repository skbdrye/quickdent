import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { AdminLoginDialog } from '@/components/auth/AdminLoginDialog';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [loginChoiceOpen, setLoginChoiceOpen] = useState(false);
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

  const handleLoginChoice = (type: 'user' | 'admin') => {
    setLoginChoiceOpen(false);
    if (type === 'user') {
      setLoginOpen(true);
    } else {
      setAdminLoginOpen(true);
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
            <img src="/logo.png" alt="QuickDent" className="w-8 h-8 rounded-lg object-contain" />
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
              <Button size="sm" onClick={() => setLoginChoiceOpen(true)}
                className={scrolled ? '' : 'bg-white text-teal-700 hover:bg-white/90 font-semibold'}>
                Login
              </Button>
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
                  <Button className="w-full" onClick={() => { setLoginChoiceOpen(true); setMobileOpen(false); }}>Login</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Login Choice Dialog */}
      <Dialog open={loginChoiceOpen} onOpenChange={setLoginChoiceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center items-center">
            <img src="/logo.png" alt="QuickDent" className="w-14 h-14 rounded-xl object-contain mb-2" />
            <DialogTitle>Welcome to QuickDent</DialogTitle>
            <DialogDescription>Choose how you would like to sign in.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <button
              onClick={() => handleLoginChoice('user')}
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
                <User className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Patient Login</p>
                <p className="text-xs text-muted-foreground">Sign in to book appointments</p>
              </div>
            </button>
            <button
              onClick={() => handleLoginChoice('admin')}
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
                <ShieldCheck className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Admin Login</p>
                <p className="text-xs text-muted-foreground">Clinic management access</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </>
  );
}
