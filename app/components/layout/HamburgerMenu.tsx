// components/layout/HamburgerMenu.tsx
'use client';

import { useState } from 'react';

export default function HamburgerMenu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="lg:hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-[#b22222] text-white p-3 rounded-md"
            >
                <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-[#F8F8FF]">
                    {/* Mobile menu content */}
                    <div className="p-4 bg-[#b22222] text-white flex justify-between items-center">
                        <span className="text-lg font-bold">Menu</span>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-white"
                        >
                            ✕
                        </button>
                    </div>
                    {/* Add mobile menu items here */}
                </div>
            )}
        </div>
    );
}