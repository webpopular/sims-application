// app/page.tsx - FIXED HEIGHT CALCULATIONS
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col items-center space-y-4 mt-16">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome to SIMS
        </h1>
        <p className="text-xl text-gray-600">
          Safety Information Management System
        </p>
      </div>
      
      <div className="flex items-center gap-4 mb-8">
        <button className="px-6 py-2.5 bg-white text-[#cb4154] border-2 border-[#cb4154] rounded-lg shadow-sm hover:bg-[#cb4154] hover:text-white transition-all duration-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          Analytics
        </button>
        
        <button className="px-6 py-2.5 bg-white text-[#cb4154] border-2 border-[#cb4154] rounded-lg shadow-sm hover:bg-[#cb4154] hover:text-white transition-all duration-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" />
          </svg>
          Contact Us
        </button>
        
        <button className="px-6 py-2.5 bg-[#cb4154] text-white rounded-lg shadow-sm hover:bg-red-800 transition-all duration-200 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Help
        </button>
      </div>
    </div>
  );
}
