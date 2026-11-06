import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

/** Shell for all logged-in pages: sidebar (drawer on mobile), top navbar and the page content. */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-h-screen flex-col">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
