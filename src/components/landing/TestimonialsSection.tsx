import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Kaye Anne Alcantara',
    text: 'QuickDent made booking my family dental appointments so easy! The group booking feature saved me so much time.',
    rating: 5,
    role: 'Parent of 3',
  },
  {
    name: 'Rye Jayden Agoto',
    text: 'I love how I can see available slots in real-time. No more calling the clinic and waiting on hold. Highly recommend!',
    rating: 5,
    role: 'Regular Patient',
  },
  {
    name: 'Justin Macam',
    text: 'The digital health questionnaire is brilliant. Everything was ready when I arrived for my appointment. Very professional.',
    rating: 5,
    role: 'First-time Patient',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">What our patients say</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Hear from real patients who have experienced the QuickDent difference.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow border-border/50">
              <CardContent className="p-6">
                <Quote className="w-8 h-8 text-secondary/30 mb-3" />
                <p className="text-foreground text-sm mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
