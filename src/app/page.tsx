'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Car, Clock, FileText, Megaphone, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  activeRentals: number;
  activeCampaigns: number;
  pendingRequests: number;
  totalDocuments: number;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalVehicles: 0,
    activeRentals: 0,
    activeCampaigns: 0,
    pendingRequests: 0,
    totalDocuments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        // Fetch all counts in parallel
        const [
          customersResult,
          vehiclesResult,
          allRentalsResult,
          campaignsResult,
          requestsResult,
          documentsResult,
          recentRequestsResult,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
          supabase.from('vehicles').select('id', { count: 'exact', head: true }),
          supabase.from('customer_vehicles').select('rental_end_date'),
          supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('documents').select('id', { count: 'exact', head: true }),
          supabase
            .from('requests')
            .select('*, customer:profiles!requests_customer_id_fkey(name, surname, email)')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        // Calculate active rentals (null end date or future date)
        const activeRentalsCount = allRentalsResult.data?.filter(
          (rental) => !rental.rental_end_date || new Date(rental.rental_end_date) > new Date()
        ).length || 0;

        setStats({
          totalCustomers: customersResult.count || 0,
          totalVehicles: vehiclesResult.count || 0,
          activeRentals: activeRentalsCount,
          activeCampaigns: campaignsResult.count || 0,
          pendingRequests: requestsResult.count || 0,
          totalDocuments: documentsResult.count || 0,
        });

        if (recentRequestsResult.data) {
          setRecentRequests(recentRequestsResult.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Beklemede',
      'in-progress': 'İşlemde',
      resolved: 'Çözüldü',
      cancelled: 'İptal',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Mirza yönetim paneline hoş geldiniz</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Toplam Müşteri"
          value={stats.totalCustomers}
          description="Kayıtlı müşteri sayısı"
          icon={Users}
          href="/customers"
        />
        <StatCard
          title="Araç Filosu"
          value={stats.totalVehicles}
          description="Toplam araç sayısı"
          icon={Car}
          href="/vehicles"
        />
        <StatCard
          title="Aktif Kiralama"
          value={stats.activeRentals}
          description="Devam eden kiralamalar"
          icon={Clock}
          href="/vehicles"
        />
        <StatCard
          title="Aktif Kampanya"
          value={stats.activeCampaigns}
          description="Yayında olan kampanyalar"
          icon={Megaphone}
          href="/campaigns"
        />
        <StatCard
          title="Bekleyen Talep"
          value={stats.pendingRequests}
          description="Yanıt bekleyen talepler"
          icon={MessageSquare}
          href="/requests"
        />
        <StatCard
          title="Toplam Belge"
          value={stats.totalDocuments}
          description="Yüklenen belgeler"
          icon={FileText}
          href="/documents"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Talepler</CardTitle>
          <CardDescription>En son gelen müşteri talepleri</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz talep bulunmamaktadır.</p>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{request.title || 'Başlıksız Talep'}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.customer?.name} {request.customer?.surname} • {request.customer?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(request.status)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
