"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UsageStats {
  totalUsers: number;
  totalBuilds: number;
  totalStorage: number;
  topUsers: Array<{
    userId: string;
    builds: number;
    storage: number;
  }>;
  recentActivity: Array<{
    userId: string;
    action: string;
    amount: number;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/usage-stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resetUserQuota(userId: string) {
    try {
      await fetch(`/api/admin/reset-quota/${userId}`, { method: 'POST' });
      fetchStats(); // Refresh data
    } catch (error) {
      console.error('Failed to reset quota:', error);
    }
  }

  if (loading) {
    return <div className="p-6">Loading usage statistics...</div>;
  }

  if (!stats) {
    return <div className="p-6">Failed to load usage statistics.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalBuilds}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(stats.totalStorage / 1024 / 1024)} MB
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Users by Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topUsers.map((user, index) => (
                <div key={user.userId} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">User #{index + 1}</span>
                    <div className="text-sm text-muted-foreground">
                      {user.builds} builds • {Math.round(user.storage / 1024 / 1024)} MB
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => resetUserQuota(user.userId)}
                  >
                    Reset Quota
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <span className="font-medium">{activity.action}</span>
                    <div className="text-sm text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-sm">{activity.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
