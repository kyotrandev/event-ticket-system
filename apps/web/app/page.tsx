import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarDays, PartyPopper, QrCode } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const cards = [
  {
    title: 'Pick a date',
    body: 'Scan upcoming shows, workshops, and conferences from a colorful event board.',
    icon: CalendarDays,
  },
  {
    title: 'Book fast',
    body: 'Reserve inventory with clear states for pending payment, paid, refunded, and expired.',
    icon: BadgeCheck,
  },
  {
    title: 'Scan at door',
    body: 'QR tickets are signed, portable, and ready for staff check-in flows.',
    icon: QrCode,
  },
];

export default function Home() {
  return (
    <section className="page-shell grid min-h-[calc(100vh-4.75rem)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-8">
        <div className="space-y-5">
          <p className="vibrant-chip inline-flex">Vibrant ticketing</p>
          <h1 className="display-play max-w-3xl text-6xl leading-[0.86] text-foreground sm:text-7xl lg:text-8xl">
            Turn every seat into a bright little moment.
          </h1>
          <p className="max-w-2xl text-lg font-semibold leading-8 text-muted-foreground">
            Discover events, reserve tickets, pay online, and check attendees
            in with a lively interface built for fast testing.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/events" className={buttonVariants({ size: 'lg' })}>
            Browse events
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            Become an organizer
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="vibrant-card !bg-primary p-6 !text-primary-foreground sm:col-span-2">
          <PartyPopper className="mb-8 size-8 text-accent" />
          <p className="max-w-md text-3xl font-black leading-tight">
            Bold type, warm accents, keyboard-first controls, and playful
            motion without sacrificing clarity.
          </p>
        </div>

        {cards.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`vibrant-card p-5 ${index === 2 ? 'sm:col-span-2' : ''}`}
            >
              <Icon className="mb-6 size-6 text-primary" />
              <h2 className="text-2xl font-black">{item.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
