// app/users/page.tsx
import { UserForm } from '@/app/components/users/user-form';
import { UserList } from '@/app/components/users/user-list';

export default function UsersPage() {
  return (
    <div className="container mx-auto py-6">
      <UserForm />
      <UserList />
    </div>
  );
}
