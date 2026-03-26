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
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">
            What our patients say
          </h2>
          <p className="text-muted-foreground mt-4">
            Hear from real patients who have experienced the QuickDent difference.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <Card
              key={i}
              className="border-border/50 hover:border-secondary/30 hover:shadow-lg transition-all duration-300 bg-card"
            >
              <CardContent className="p-7 space-y-4">
                <Quote className="h-8 w-8 text-accent/40" />
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
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
