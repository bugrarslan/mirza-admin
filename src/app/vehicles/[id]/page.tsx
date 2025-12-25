'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { CustomerVehicle, ServiceHistory, Vehicle } from '@/types/database';
import { ArrowLeft, Car, Fuel, Settings, Users, Wrench } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rentals, setRentals] = useState<CustomerVehicle[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchVehicleData = async () => {
      const supabase = createClient();
      setIsLoading(true);

      try {
        // Fetch vehicle - single() doesn't support abortSignal
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', vehicleId)
          .single();

        if (vehicleError) throw vehicleError;
        if (!isMounted) return;
        setVehicle(vehicleData);

        // Fetch rentals with customer details
        const { data: rentalsData } = await supabase
          .from('customer_vehicles')
          .select('*, customer:profiles(*)')
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal);

        if (!isMounted) return;
        setRentals(rentalsData || []);

        // Fetch service history
        const { data: serviceData } = await supabase
          .from('service_history')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('service_date', { ascending: false })
          .abortSignal(abortController.signal);

        if (!isMounted) return;
        setServiceHistory(serviceData || []);
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching vehicle data:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVehicleData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [vehicleId]);

  const getServiceTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      maintenance: 'Bakım',
      repair: 'Onarım',
      tire_change: 'Lastik Değişimi',
      oil_change: 'Yağ Değişimi',
      inspection: 'Muayene',
      cleaning: 'Temizlik',
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

  if (!vehicle) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Araç bulunamadı.</p>
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

      {/* Vehicle Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <div className="h-32 w-48 rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
              {vehicle.image_url ? (
                <Image
                  src={vehicle.image_url}
                  alt={vehicle.model_name}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              ) : (
                <Car className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{vehicle.model_name}</CardTitle>
              <CardDescription className="text-lg">{vehicle.plate_number}</CardDescription>
              {vehicle.class && (
                <Badge variant="secondary" className="mt-2">
                  {vehicle.class}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Yakıt</p>
                <p className="font-medium">{vehicle.fuel_type || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Vites</p>
                <p className="font-medium">{vehicle.gear || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Kapasite</p>
                <p className="font-medium">{vehicle.person_capacity ? `${vehicle.person_capacity} Kişi` : '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bagaj</p>
              <p className="font-medium">{vehicle.trunk_capacity || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="rentals">
        <TabsList>
          <TabsTrigger value="rentals" className="gap-2">
            <Users className="h-4 w-4" />
            Kiralamalar ({rentals.length})
          </TabsTrigger>
          <TabsTrigger value="service" className="gap-2">
            <Wrench className="h-4 w-4" />
            Servis Geçmişi ({serviceHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rentals">
          <Card>
            <CardHeader>
              <CardTitle>Kiralama Geçmişi</CardTitle>
              <CardDescription>Bu aracın kiralama kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              {rentals.length === 0 ? (
                <p className="text-muted-foreground text-sm">Kiralama kaydı bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {rentals.map((rental) => (
                    <Link
                      key={rental.id}
                      href={`/customers/${rental.customer_id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {rental.customer?.name} {rental.customer?.surname}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rental.customer?.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {new Date(rental.rental_start_date).toLocaleDateString('tr-TR')}
                          {' - '}
                          {rental.rental_end_date
                            ? new Date(rental.rental_end_date).toLocaleDateString('tr-TR')
                            : 'Devam Ediyor'}
                        </p>
                        <Badge variant={!rental.rental_end_date || new Date(rental.rental_end_date) > new Date() ? 'default' : 'secondary'}>
                          {!rental.rental_end_date || new Date(rental.rental_end_date) > new Date() ? 'Aktif' : 'Tamamlandı'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <Card>
            <CardHeader>
              <CardTitle>Servis Geçmişi</CardTitle>
              <CardDescription>Aracın bakım ve onarım kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">Servis kaydı bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {serviceHistory.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {getServiceTypeBadge(service.service_type)}
                          <span className="font-medium">
                            {service.service_provider || 'Belirtilmemiş'}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(service.service_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
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
