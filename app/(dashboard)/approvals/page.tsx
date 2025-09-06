//app/(dashboard)/status-and-closure/page.tsx

import Approvals from '@/app/components/forms/EventApprovals';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Event Approvals - Status and Closure',
  description: 'View and manage event status and closure details.',
};

export default function EventApprovalsPage() {
   return <Approvals />;
}
