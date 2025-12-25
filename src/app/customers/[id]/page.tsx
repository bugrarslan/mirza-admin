'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { CustomerVehicle, Document, Profile, Request } from '@/types/database';
import { ArrowLeft, Building2, Car, FileText, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchCustomerData = async () => {
      const supabase = createClient();
      setIsLoading(true);

      try {
        // Fetch customer profile - single() doesn't support abortSignal
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', customerId)
          .single();

        if (profileError) throw profileError;
        if (!isMounted) return;
        setCustomer(profileData);

        // Fetch customer vehicles with vehicle details
        const { data: vehiclesData } = await supabase
          .from('customer_vehicles')
          .select('*, vehicle:vehicles(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal);

        if (!isMounted) return;
        setVehicles(vehiclesData || []);

        // Fetch customer documents
        const { data: documentsData } = await supabase
          .from('documents')
          .select('*, vehicle:vehicles(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal);

        if (!isMounted) return;
        setDocuments(documentsData || []);

        // Fetch customer requests
        const { data: requestsData } = await supabase
          .from('requests')
          .select('*, vehicle:vehicles(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal);

        if (!isMounted) return;
        setRequests(requestsData || []);
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching customer data:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCustomerData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [customerId]);

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

  const getDocumentTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      invoice: 'Fatura',
      contract: 'Sözleşme',
      receipt: 'Makbuz',
      other: 'Diğer',
    };

    return <Badge variant="outline">{typeLabels[type] || type}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Müşteri bulunamadı.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Button>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              {customer.isCompany ? (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl">
                {customer.name} {customer.surname}
              </CardTitle>
              <CardDescription>
                {customer.isCompany && customer.company_name && (
                  <span className="block">{customer.company_name}</span>
                )}
                <Badge variant={customer.isCompany ? 'default' : 'secondary'} className="mt-1">
                  {customer.isCompany ? 'Kurumsal' : 'Bireysel'}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">E-posta</p>
              <p className="font-medium">{customer.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefon</p>
              <p className="font-medium">{customer.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kayıt Tarihi</p>
              <p className="font-medium">
                {new Date(customer.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Son Güncelleme</p>
              <p className="font-medium">
                {new Date(customer.updated_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for related data */}
      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles" className="gap-2">
            <Car className="h-4 w-4" />
            Araçlar ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Belgeler ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Talepler ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Kiralanan Araçlar</CardTitle>
              <CardDescription>Müşterinin kiraladığı araçlar</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <p className="text-muted-foreground text-sm">Kiralama kaydı bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {vehicles.map((cv) => (
                    <div
                      key={cv.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <Car className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{cv.vehicle?.model_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cv.vehicle?.plate_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {new Date(cv.rental_start_date).toLocaleDateString('tr-TR')}
                          {' - '}
                          {cv.rental_end_date
                            ? new Date(cv.rental_end_date).toLocaleDateString('tr-TR')
                            : 'Devam Ediyor'}
                        </p>
                        <Badge variant={!cv.rental_end_date || new Date(cv.rental_end_date) > new Date() ? 'default' : 'secondary'}>
                          {!cv.rental_end_date || new Date(cv.rental_end_date) > new Date() ? 'Aktif' : 'Tamamlandı'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Belgeler</CardTitle>
              <CardDescription>Müşteriye ait belgeler</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belge bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.file_name || 'Belge'}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.vehicle?.plate_number || 'Araç bağlantısı yok'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getDocumentTypeBadge(doc.document_type)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Talepler</CardTitle>
              <CardDescription>Müşterinin talepleri</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-muted-foreground text-sm">Talep bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/requests/${request.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{request.title || 'Başlıksız Talep'}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.vehicle?.plate_number || 'Araç bağlantısı yok'}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
