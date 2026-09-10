/**
 * Web Admin Dashboard - Main Page
 * 
 * React + Vite + Tailwind CSS
 * Fleet overview with real-time stats and active rides map
 */

import React, { useState, useEffect } from 'react';
import { Activity, Users, DollarSign, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  riders: { total: number; activeNow: number };
  passengers: number;
  rides: { today: number; total: number };
  revenue: { today: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Poll for real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // In production: fetch from API
      // const response = await fetch('/api/admin/dashboard/stats');
      // const data = await response.json();
      
      // Mock data for demo
      setTimeout(() => {
        setStats({
          riders: { total: 245, activeNow: 87 },
          passengers: 1823,
          rides: { today: 342, total: 15678 },
          revenue: { today: 45670 },
        });
        
        setActiveRides([
          { id: '1', status: 'in_transit', passenger_name: 'John D.', rider_name: 'Michael O.', fare: 350, pickup: 'Westlands', dropoff: 'CBD' },
          { id: '2', status: 'arrived', passenger_name: 'Sarah M.', rider_name: 'James K.', fare: 280, pickup: 'Kilimani', dropoff: 'Karen' },
          { id: '3', status: 'accepted', passenger_name: 'Peter W.', rider_name: 'David N.', fare: 420, pickup: 'Airport', dropoff: 'Upper Hill' },
        ]);
        
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Boda Boda Fleet Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Real-time fleet management and analytics • {new Date().toLocaleDateString()}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Active Riders"
            value={stats!.riders.activeNow.toString()}
            subValue={`of ${stats!.riders.total} total`}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Today's Rides"
            value={stats!.rides.today.toString()}
            subValue={`${stats!.rides.total} lifetime`}
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="Revenue (Today)"
            value={`KSh ${stats!.revenue.today.toLocaleString()}`}
            subValue="Mobile Money + Cash"
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="Registered Passengers"
            value={stats!.passengers.toLocaleString()}
            subValue="+12% this month"
            icon={TrendingUp}
            color="orange"
          />
        </div>

        {/* Active Rides Table */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              Active Rides ({activeRides.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ride ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fare</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeRides.map((ride) => (
                  <tr key={ride.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{ride.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={ride.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ride.passenger_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ride.rider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ride.pickup} → {ride.dropoff}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      KSh {ride.fare}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Incidents */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
              Recent Safety Alerts
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center h-32 text-gray-500">
              No active safety alerts
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  subValue: string; 
  icon: any; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
              <dd className="text-xs text-gray-500 mt-1">{subValue}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    accepted: 'bg-blue-100 text-blue-800',
    arrived: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
