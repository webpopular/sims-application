// app/(dashboard)/hierarchy/page.tsx
import { HierarchyForm } from '@/app/components/hierarchy/hierarchy-form';
import { HierarchyList } from '@/app/components/hierarchy/hierarchy-list';

export default function HierarchyPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Hierarchy Management</h1>
      <div className="space-y-8">
        <HierarchyForm />
        <HierarchyList />
      </div>
    </div>
  );
}
