import { Metadata } from 'next';
import { ReactNode } from 'react';

import Navbar from '@/components/Navbar';
// import Sidebar from '@/components/Sidebar'; // Removed Sidebar import

export const metadata: Metadata = {
  title: "Hire-Genix Meet",
  description: 'A workspace for your team, powered by Stream Chat and Clerk.',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main className="relative">
      <Navbar />

      {/* Removed the flex container and Sidebar */}
      <section className="flex min-h-screen flex-1 flex-col px-6 pb-6 pt-28 max-md:pb-14 sm:px-14">
        <div className="w-full">{children}</div>
      </section>

    </main>
  );
};

export default RootLayout;
