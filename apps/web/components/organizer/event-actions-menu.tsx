'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  BarChart3,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Rocket,
  Ticket,
  Trash2,
  UserCog,
  ScanLine,
  Download,
} from 'lucide-react';
import type { OrganizerEventSummary } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EventActionsMenuProps {
  event: OrganizerEventSummary;
  onPublish?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  publishing?: boolean;
}

export function EventActionsMenu({
  event,
  onPublish,
  onDuplicate,
  onDelete,
  onExport,
  publishing,
}: EventActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function positionMenu() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuHeight = menu?.offsetHeight ?? 280;
      const menuWidth = menu?.offsetWidth ?? 220;
      const gap = 8;
      const viewportPad = 8;

      let top = rect.bottom + gap;
      if (top + menuHeight > window.innerHeight - viewportPad) {
        top = rect.top - menuHeight - gap;
      }
      top = Math.max(viewportPad, Math.min(top, window.innerHeight - menuHeight - viewportPad));

      let left = rect.right - menuWidth;
      left = Math.max(viewportPad, Math.min(left, window.innerWidth - menuWidth - viewportPad));

      setMenuStyle({ position: 'fixed', top, left, zIndex: 9999 });
    }

    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const items = [
    {
      label: 'Event overview',
      href: `/organizer/events/${event.id}`,
      icon: BarChart3,
    },
    {
      label: 'Ticket types',
      href: `/organizer/events/${event.id}/ticket-types`,
      icon: Ticket,
    },
    {
      label: 'Staff',
      href: `/organizer/events/${event.id}/staff`,
      icon: UserCog,
    },
    {
      label: 'Analytics',
      href: `/organizer/events/${event.id}/analytics`,
      icon: BarChart3,
    },
    {
      label: 'Live check-in',
      href: `/organizer/events/${event.id}/checkin`,
      icon: ScanLine,
    },
    {
      label: 'Edit',
      href: `/organizer/events/${event.id}/edit`,
      icon: Pencil,
    },
    {
      label: 'View public page',
      href: `/events/${event.id}`,
      icon: ExternalLink,
      external: true,
    },
  ];

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={menuStyle}
      className="min-w-[220px] max-h-[min(70vh,420px)] overflow-y-auto rounded-2xl border-2 border-border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
    >
      {event.status === 'draft' && onPublish && (
        <button
          type="button"
          role="menuitem"
          disabled={publishing}
          onClick={() => {
            setOpen(false);
            onPublish();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          <Rocket className="size-4" />
          {publishing ? 'Publishing…' : 'Publish event'}
        </button>
      )}
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          role="menuitem"
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted transition-colors"
        >
          <item.icon className="size-4 text-muted-foreground" />
          {item.label}
        </Link>
      ))}
      {onExport && event.ticketsSold > 0 && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onExport();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted transition-colors"
        >
          <Download className="size-4 text-muted-foreground" />
          Export attendees CSV
        </button>
      )}
      {onDuplicate && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onDuplicate();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted transition-colors"
        >
          <Copy className="size-4 text-muted-foreground" />
          Duplicate event
        </button>
      )}
      {event.status === 'draft' && onDelete && (
        <>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors',
            )}
          >
            <Trash2 className="size-4" />
            Delete draft
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <div className={cn('relative', open && 'z-50')} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'rounded-xl font-bold shrink-0',
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {typeof document !== 'undefined' && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
