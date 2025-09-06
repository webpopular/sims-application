// app/(dashboard)/smartsheet/form/page.tsx
'use client';

import SmartSheetForm from '@/app/components/smartsheet/SmartSheetForm';

export default function SmartSheetFormPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-xl font-semibold text-[#b22222] border-l-4 border-[#b22222] pl-3 mb-6">
          SmartSheet Form
        </h1>
        <SmartSheetForm />
      </div>
    </div>
  );
}
