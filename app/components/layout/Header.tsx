// app/components/layout/Header.tsx
'use client';

export default function Header() {
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 w-full z-10">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Safety Information Management System
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, User</span>
            <button className="px-3 py-1 text-sm bg-[#b22222] text-white rounded-md hover:bg-red-700 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
