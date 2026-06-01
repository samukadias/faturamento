import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useEffect } from 'react';

interface LayoutProps {
  title: string;
  subtitle?: string;
}

export default function Layout({ title, subtitle }: LayoutProps) {
  const { fetchAll, isLoaded } = useDataStore();

  useEffect(() => {
    if (!isLoaded) fetchAll();
  }, [isLoaded, fetchAll]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
