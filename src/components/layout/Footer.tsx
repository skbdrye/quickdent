import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary-foreground flex items-center justify-center text-primary font-bold text-lg">
                Q
              </div>
              <span className="font-bold text-lg">QuickDent</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              QuickDent is a simple way to book dental appointments online. Making dental care more convenient and accessible for everyone.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-primary-foreground">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', href: '#' },
                { label: 'About Us', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Contact', href: '#contact' },
              ].map(item => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-primary-foreground">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/terms" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-primary-foreground">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <Phone className="h-4 w-4 text-accent" />
                09637802851
              </li>
              <li className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-accent" />
                QuickDent Dental Clinic
              </li>
              <li className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <Clock className="h-4 w-4 text-accent" />
                Mon-Sat: 9:00 AM - 6:00 PM
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/50">
            &copy; {new Date().getFullYear()} QuickDent. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-primary-foreground/50 hover:text-primary-foreground/70 transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-xs text-primary-foreground/50 hover:text-primary-foreground/70 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
