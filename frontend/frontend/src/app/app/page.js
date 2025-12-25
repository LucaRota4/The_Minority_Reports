"use client";
import { useState, useEffect } from 'react';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { SepoliaNetworkGuard } from '@/components/ui/SepoliaNetworkGuard';

// Dashboard overview page - functional space management interface
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SepoliaNetworkGuard>
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <UserDashboard />
        </div>
      </div>
    </SepoliaNetworkGuard>
  );
}
