'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { canDelete, useAuthStore } from '@/stores/authStore';
import { CreateServiceHistoryInput, ServiceHistory, ServiceType, Vehicle } from '@/types/database';
import { Car, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: 'maintenance', label: 'Bakım' },
  { value: 'repair', label: 'Onarım' },
  { value: 'tire_change', label: 'Lastik Değişimi' },
  { value: 'oil_change', label: 'Yağ Değişimi' },
  { value: 'inspection', label: 'Muayene' },
  { value: 'cleaning', label: 'Temizlik' },
  { value: 'other', label: 'Diğer' },
];

export default function ServiceHistoryPage() {
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { profile } = useAuthStore();

  const [formData, setFormData] = useState<CreateServiceHistoryInput>({
    vehicle_id: 0,
    service_type: 'maintenance',
    service_date: new Date().toISOString().split('T')[0],
    description: '',
    service_provider: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const [historyResult, vehiclesResult] = await Promise.all([
        supabase
          .from('service_history')
          .select('*, vehicle:vehicles(*)')
          .order('service_date', { ascending: false }),
        supabase.from('vehicles').select('*'),
      ]);

      if (historyResult.error) throw historyResult.error;

      setServiceHistory(historyResult.data || []);
      setFilteredHistory(historyResult.data || []);
      setVehicles(vehiclesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = serviceHistory.filter(
      (service) =>
        service.vehicle?.plate_number?.toLowerCase().includes(query.toLowerCase()) ||
        service.vehicle?.model_name?.toLowerCase().includes(query.toLowerCase()) ||
        service.service_provider?.toLowerCase().includes(query.toLowerCase()) ||
        service.description?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredHistory(filtered);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: 0,
      service_type: 'maintenance',
      service_date: new Date().toISOString().split('T')[0],
      description: '',
      service_provider: '',
    });
    setIsEditing(false);
    setSelectedService(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const handleEdit = (service: ServiceHistory) => {
    setSelectedService(service);
    setFormData({
      vehicle_id: service.vehicle_id,
      service_type: service.service_type,
      service_date: service.service_date,
      description: service.description || '',
      service_provider: service.service_provider || '',
    });
    setIsEditing(true);
    setIsFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.vehicle_id || !formData.service_type || !formData.service_date) {
      toast.error('Araç, servis tipi ve tarih zorunludur.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      if (isEditing && selectedService) {
        const { error } = await supabase
          .from('service_history')
          .update(formData)
          .eq('id', selectedService.id);

        if (error) throw error;
        toast.success('Servis kaydı güncellendi.');
      } else {
        const { error } = await supabase.from('service_history').insert(formData);

        if (error) throw error;
        toast.success('Servis kaydı eklendi.');
      }

      setIsFormDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Kaydetme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('service_history')
        .delete()
        .eq('id', selectedService.id);

      if (error) throw error;

      toast.success('Servis kaydı silindi.');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

    const typeColors: Record<string, string> = {
      maintenance: 'bg-blue-100 text-blue-800',
      repair: 'bg-red-100 text-red-800',
      tire_change: 'bg-yellow-100 text-yellow-800',
      oil_change: 'bg-orange-100 text-orange-800',
      inspection: 'bg-purple-100 text-purple-800',
      cleaning: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
        {typeLabels[type] || type}
      </span>
    );
  };

  const columns = [
    {
      header: 'Araç',
      accessor: (service: ServiceHistory) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
            <Car className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <Link
              href={`/vehicles/${service.vehicle_id}`}
              className="font-medium hover:underline"
            >
              {service.vehicle?.plate_number}
            </Link>
            <p className="text-sm text-muted-foreground">{service.vehicle?.model_name}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Servis Tipi',
      accessor: (service: ServiceHistory) => getServiceTypeBadge(service.service_type),
    },
    {
      header: 'Servis Sağlayıcı',
      accessor: (service: ServiceHistory) => service.service_provider || '-',
    },
    {
      header: 'Tarih',
      accessor: (service: ServiceHistory) =>
        new Date(service.service_date).toLocaleDateString('tr-TR'),
    },
    {
      header: 'Açıklama',
      accessor: (service: ServiceHistory) => (
        <p className="max-w-xs truncate" title={service.description || ''}>
          {service.description || '-'}
        </p>
      ),
    },
  ];

  const userCanDelete = canDelete(profile?.role, 'service_history');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servis Geçmişi</h1>
          <p className="text-muted-foreground">Araç servis kayıtları yönetimi</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kayıt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Servis Kayıtları</CardTitle>
          <CardDescription>
            Toplam {serviceHistory.length} servis kaydı bulunmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredHistory}
            columns={columns}
            keyExtractor={(service) => service.id}
            isLoading={isLoading}
            searchPlaceholder="Plaka, model veya servis sağlayıcı ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz servis kaydı bulunmamaktadır."
            actions={(service) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(service)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {userCanDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedService(service);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Servis Kaydı Düzenle' : 'Yeni Servis Kaydı'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Servis kaydı bilgilerini güncelleyin.' : 'Yeni servis kaydı bilgilerini girin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_id">Araç *</Label>
              <Select
                value={formData.vehicle_id?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Araç seçin" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.plate_number} - {vehicle.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_type">Servis Tipi *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Servis tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_date">Tarih *</Label>
                <Input
                  id="service_date"
                  type="date"
                  value={formData.service_date}
                  onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_provider">Servis Sağlayıcı</Label>
              <Input
                id="service_provider"
                placeholder="Servis firması adı"
                value={formData.service_provider || ''}
                onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                placeholder="Yapılan işlemler hakkında detaylar..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Servis Kaydını Sil"
        description="Bu servis kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
