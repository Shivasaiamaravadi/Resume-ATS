import React from 'react';

export const Footer: React.FC = () => (
  <footer className="bg-white mt-auto">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-slate-500">
      <p>&copy; {new Date().getFullYear()} AI Resume Reviser. Powered by AI.</p>
    </div>
  </footer>
);
