//app/(dashboard)/view/safety-alerts/page.tsx

'use client';

import SafetyAlertListPage from "@/app/components/forms/SafetyAlertList";
export default function SafetyAlertPage() {
  return (
    <div className="p-2">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold mb-4 text-emerald-700">Safety Alerts</h2>
        <SafetyAlertListPage />
      </div>
    </div>
  );
}
