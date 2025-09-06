// app/page.tsx (Dashboard)
import { Metadata } from 'next';
import RequireAuth from '@/app/components/auth/RequireAuth';

export const metadata: Metadata = {
  title: 'Dashboard - SIMS',
};

export default function DashboardPage() {
  return (
    <RequireAuth>
      <div>
        {
          /*<h1>Dashboard</h1>*/
        }
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h2>Recent QR Submissions</h2>
            {/* QR submissions content */}
          </div>
          <div>
            <h2>Pending Reports</h2>
            {/* Pending reports content */}
          </div>
          <div>
            <h2>Safety Alerts</h2>
            {/* Safety alerts content */}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}