'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Request, RequestResponse, RequestStatus } from '@/types/database';
import { ArrowLeft, Car, Image as ImageIcon, MessageSquare, Send, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const statusOptions: { value: RequestStatus; label: string }[] = [
  { value: 'pending', label: 'Beklemede' },
  { value: 'in_progress', label: 'İşlemde' },
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

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { user } = useAuthStore();

  const [request, setRequest] = useState<Request | null>(null);
  const [responses, setResponses] = useState<RequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>('pending');

  useEffect(() => {
    if (!requestId) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchRequestData = async () => {
      const supabase = createClient();
      setIsLoading(true);

      try {
        // Fetch request with customer and vehicle - single() doesn't support abortSignal
        const { data: requestData, error: requestError } = await supabase
          .from('requests')
          .select('*, customer:profiles!requests_customer_id_fkey(*), vehicle:vehicles(*)')
          .eq('id', requestId)
          .single();

        if (requestError) throw requestError;
        if (!isMounted) return;
        setRequest(requestData);
        setSelectedStatus(requestData.status);

        // Fetch responses with admin info
        const { data: responsesData } = await supabase
          .from('request_responses')
          .select('*, admin:profiles!request_responses_admin_id_fkey(*)')
          .eq('request_id', requestId)
          .order('created_at', { ascending: true })
          .abortSignal(abortController.signal);

        if (!isMounted) return;
        setResponses(responsesData || []);
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching request data:', error);
          toast.error('Talep bilgileri yüklenirken hata oluştu.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRequestData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [requestId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _refetchResponses = async () => {
    if (!requestId) return;
    const supabase = createClient();
    
    const { data: responsesData } = await supabase
      .from('request_responses')
      .select('*, admin:profiles!request_responses_admin_id_fkey(*)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    setResponses(responsesData || []);
  };

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!request) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (error) throw error;

      setSelectedStatus(newStatus);
      setRequest({ ...request, status: newStatus });
      toast.success('Talep durumu güncellendi.');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResponse = async () => {
    if (!request || !newResponse.trim() || !user) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('request_responses')
        .insert({
          request_id: request.id,
          admin_id: user.id,
          response_message: newResponse.trim(),
        })
        .select('*, admin:profiles!request_responses_admin_id_fkey(*)')
        .single();

      if (error) throw error;

      setResponses([...responses, data]);
      setNewResponse('');
      toast.success('Yanıt gönderildi.');

      // Auto-update status to in-progress if pending
      if (request.status === 'pending') {
        handleStatusChange('in_progress');
      }
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error('Yanıt gönderilirken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Talep bulunamadı.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{request.title || 'Başlıksız Talep'}</CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant="outline" className="mr-2">
                      {requestTypeLabels[request.request_type] || request.request_type}
                    </Badge>
                    {getStatusBadge(request.status)}
                  </CardDescription>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-medium">Açıklama</h4>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {request.description || 'Açıklama girilmemiş.'}
                  </p>
                </div>

                {/* Uploaded Images */}
                {request.uploaded_images && request.uploaded_images.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 mb-2 font-medium">
                      <ImageIcon className="w-4 h-4" />
                      Eklenen Görseller
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {request.uploaded_images.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="overflow-hidden transition-opacity rounded-lg aspect-square bg-muted hover:opacity-80 relative"
                        >
                          <Image
                            src={url}
                            alt={`Görsel ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 33vw, 150px"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Responses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Yanıtlar ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responses.length === 0 ? (
                  <p className="py-4 text-sm text-center text-muted-foreground">
                    Henüz yanıt verilmemiş.
                  </p>
                ) : (
                  responses.map((response) => (
                    <div key={response.id} className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">
                          {response.admin?.name} {response.admin?.surname}
                          <span className="ml-2 font-normal text-muted-foreground">
                            ({response.admin?.role === 'admin' ? 'Yönetici' : 'Personel'})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(response.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{response.response_message}</p>
                    </div>
                  ))
                )}

                <Separator />

                {/* New Response Form */}
                <div className="space-y-3">
                  <Label htmlFor="response">Yanıt Yaz</Label>
                  <Textarea
                    id="response"
                    placeholder="Yanıtınızı buraya yazın..."
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendResponse}
                      disabled={isSubmitting || !newResponse.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Gönderiliyor...' : 'Yanıt Gönder'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Durum Güncelle</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedStatus}
                onValueChange={(value) => handleStatusChange(value as RequestStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Ad Soyad</p>
                  <Link
                    href={`/customers/${request.customer_id}`}
                    className="font-medium hover:underline"
                  >
                    {request.customer?.name} {request.customer?.surname}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-posta</p>
                  <p className="font-medium">{request.customer?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{request.customer?.phone || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Info */}
          {request.vehicle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Araç Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Plaka</p>
                    <Link
                      href={`/vehicles/${request.vehicle_id}`}
                      className="font-medium hover:underline"
                    >
                      {request.vehicle.plate_number}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{request.vehicle.model_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
