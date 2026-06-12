'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover } from '@base-ui/react/popover';
import { useSocket } from '../providers/notification-provider';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function NotificationBell() {
  const { isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Initial fetch from backend
  useEffect(() => {
    if (!isConnected) return;
    
    // In a real implementation, you would fetch from your /api/v1/notifications endpoint here
    const fetchNotifications = async () => {
      try {
        // const data = await api.get('/notifications/me');
        // setNotifications(data);
        // setUnreadCount(data.filter((n: any) => !n.isRead).length);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    
    fetchNotifications();
  }, [isConnected]);

  // Listen to new realtime notifications
  useEffect(() => {
    const handleNewNotification = (e: any) => {
      const notification = e.detail;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => window.removeEventListener('new_notification', handleNewNotification);
  }, []);

  const markAllAsRead = () => {
    // In a real app, call API to mark as read
    setUnreadCount(0);
    setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className="relative p-2 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-black">
        <Bell className="w-5 h-5 text-neutral-600" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"
            />
          )}
        </AnimatePresence>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="w-80 sm:w-96 rounded-2xl bg-white/80 backdrop-blur-xl border border-neutral-200/50 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] p-4 focus:outline-none origin-top-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-neutral-500 hover:text-black font-medium transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  You have no new notifications.
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-3 rounded-xl transition-colors",
                      notif.isRead ? "bg-transparent" : "bg-neutral-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-0.5">{notif.title}</h4>
                        <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2">
                          {notif.content}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
