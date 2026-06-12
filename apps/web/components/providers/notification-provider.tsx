'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface NotificationContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if user is logged in
    if (!session?.token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Determine if user is staff/organizer and has an active event
    // For simplicity, we just pass token. The backend extracts userId.
    const newSocket = io(API_URL, {
      auth: {
        token: session.token,
      },
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to realtime notifications');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from realtime notifications');
      setIsConnected(false);
    });

    // Listen to global notifications
    newSocket.on('notification', (notification) => {
      // Show elegant toast based on notification type
      switch (notification.type) {
        case 'PAYMENT_SUCCESS':
        case 'ORGANIZER_APPROVED':
          toast.success(notification.title, {
            description: notification.content,
            duration: 5000,
          });
          break;
        case 'ORGANIZER_REJECTED':
          toast.error(notification.title, {
            description: notification.content,
            duration: 6000,
          });
          break;
        case 'WAITLIST_AVAILABLE':
          toast.info(notification.title, {
            description: notification.content,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => window.location.href = `/events/${notification.relatedEntityId}`,
            },
          });
          break;
        default:
          toast(notification.title, {
            description: notification.content,
          });
      }
      
      // Dispatch custom event to trigger NotificationBell unread badge update
      window.dispatchEvent(new CustomEvent('new_notification', { detail: notification }));
    });

    // Listen to Check-in Updates (if staff/organizer)
    newSocket.on('CHECKIN_UPDATE', (data) => {
      toast('New Check-in', {
        description: `${data.attendeeName} scanned ticket ${data.ticketCode}`,
      });
      // Here you could also trigger a re-fetch of stats or dispatch an event
      window.dispatchEvent(new CustomEvent('checkin_update', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session?.token]);

  return (
    <NotificationContext.Provider value={{ socket, isConnected }}>
      {children}
    </NotificationContext.Provider>
  );
}
