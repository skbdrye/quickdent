import { Phone, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center font-bold text-sm text-primary-foreground">Q</div>
              <span className="font-semibold text-lg">QuickDent</span>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              QuickDent is the online reservation system of Abrigo-Marabe Dental Clinic. Making dental care more convenient and accessible for everyone.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              {[
                { label: 'Home', href: '#' },
                { label: 'About Us', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Contact', href: '#contact' },
              ].map(item => (
                <li key={item.label}><a href={item.href} className="hover:text-primary-foreground transition-colors">{item.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Get in Touch</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 09668810738</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Abrigo-Marabe Dental Clinic</li>
              <li className="flex items-center gap-2"><Clock className="w-4 h-4" /> Mon-Sat: 8AM - 7PM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/40">&copy; {new Date().getFullYear()} Abrigo-Marabe Dental Clinic. Powered by QuickDent.</p>
          <div className="flex gap-4 text-sm text-primary-foreground/40">
            <Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
