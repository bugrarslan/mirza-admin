'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Request } from '@/types/database';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'in-progress', label: 'İşlemde' },
  { value: 'resolved', label: 'Çözüldü' },
  { value: 'cancelled', label: 'İptal' },
];

const requestTypeLabels: Record<string, string> = {
  maintenance: 'Bakım',
  repair: 'Onarım',
  accident: 'Kaza',
  complaint: 'Şikayet',
  information: 'Bilgi',
  other: 'Diğer',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, requests]);

  const fetchRequests = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*, customer:profiles!requests_customer_id_fkey(*), vehicle:vehicles(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      setFilteredRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Talepler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    if (statusFilter === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter((req) => req.status === statusFilter));
    }
  };

  const handleSearch = (query: string) => {
    const baseFiltered = statusFilter === 'all' 
      ? requests 
      : requests.filter((req) => req.status === statusFilter);
    
    const filtered = baseFiltered.filter(
      (req) =>
        req.title?.toLowerCase().includes(query.toLowerCase()) ||
        req.customer?.name?.toLowerCase().includes(query.toLowerCase()) ||
        req.customer?.surname?.toLowerCase().includes(query.toLowerCase()) ||
        req.vehicle?.plate_number?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredRequests(filtered);
  };

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

  const getRequestTypeBadge = (type: string) => {
    return <Badge variant="outline">{requestTypeLabels[type] || type}</Badge>;
  };

  const columns = [
    {
      header: 'Talep',
      accessor: (req: Request) => (
        <div>
          <p className="font-medium">{req.title || 'Başlıksız Talep'}</p>
          <div className="flex items-center gap-2 mt-1">
            {getRequestTypeBadge(req.request_type)}
          </div>
        </div>
      ),
    },
    {
      header: 'Müşteri',
      accessor: (req: Request) => (
        <div>
          <Link href={`/customers/${req.customer_id}`} className="font-medium hover:underline">
            {req.customer?.name} {req.customer?.surname}
          </Link>
          <p className="text-sm text-muted-foreground">{req.customer?.email}</p>
        </div>
      ),
    },
    {
      header: 'Araç',
      accessor: (req: Request) =>
        req.vehicle ? (
          <Link href={`/vehicles/${req.vehicle_id}`} className="hover:underline">
            {req.vehicle.plate_number}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      header: 'Durum',
      accessor: (req: Request) => getStatusBadge(req.status),
    },
    {
      header: 'Tarih',
      accessor: (req: Request) =>
        new Date(req.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Talepler</h1>
          <p className="text-muted-foreground">Müşteri talepleri yönetimi</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">Toplam Talep</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Beklemede</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">İşlemde</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter((r) => r.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">Çözüldü</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Talep Listesi</CardTitle>
              <CardDescription>
                {filteredRequests.length} talep gösteriliyor
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredRequests}
            columns={columns}
            keyExtractor={(req) => req.id}
            isLoading={isLoading}
            searchPlaceholder="Talep başlığı, müşteri veya plaka ile ara..."
            onSearch={handleSearch}
            emptyMessage="Talep bulunmamaktadır."
            actions={(req) => (
              <div className="flex items-center justify-end gap-2">
                <Link href={`/requests/${req.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
