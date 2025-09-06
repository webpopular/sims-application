//app/(dashboard)/view/lessons-learned-list/page.tsx
'use client';

import LessonsLearnedList from '@/app/components/forms/LessonsLearnedList';

export default function LessonsLearnedListPage() {
  return (
    <div className="p-4 max-w-8xl mx-auto">
      <h2 className="text-lg font-bold mb-4 text-emerald-700">Lessons Learned</h2>
      <LessonsLearnedList />
    </div>
  );
}
