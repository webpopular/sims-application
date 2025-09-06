// app/admin/reference-data/page.tsx
'use client';

import ReferenceDataManager from '@/app/components/admin/ReferenceDataManager';

export default function ReferenceDataPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Reference Data Management</h1>
      <ReferenceDataManager />
    </div>
  );
}
