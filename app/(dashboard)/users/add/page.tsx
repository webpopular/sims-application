// app/users/add/page.tsx
import { UserForm } from '@/app/components/users/user-form';

export default function AddUserPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Add New User</h1>
      <UserForm />
    </div>
  );
}