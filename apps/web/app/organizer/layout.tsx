import { OrganizerLayout } from '@/components/organizer/organizer-layout';

export default function OrganizerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizerLayout>{children}</OrganizerLayout>;
}
