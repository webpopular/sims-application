// app/users/list/page.tsx
import { UserList } from '@/app/components/users/user-list';

export default function UserListPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">User List</h1>
      <UserList />
    </div>
  );
}