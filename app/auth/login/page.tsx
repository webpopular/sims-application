// app/auth/login/page.tsx
'use client';

import LoginForm from '@/app/components/auth/LoginForm';

export default function Page() { //LoginPage()
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F8FF]">
      <LoginForm />
    </div>
  );
}

