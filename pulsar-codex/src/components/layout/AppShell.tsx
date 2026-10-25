import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';

interface AppShellProps {
  children?: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col relative w-full bg-surface pt-16 pb-safe">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default AppShell;
