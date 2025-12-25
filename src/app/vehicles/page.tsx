'use client';

import { Badge } from '@/components/ui/badge';
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
import { FileUploader } from '@/components/ui/file-uploader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { deleteFile, extractPathFromUrl, replaceFile, uploadFile } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { canDelete, useAuthStore } from '@/stores/authStore';
import { CreateVehicleInput, Vehicle } from '@/types/database';
import { Car, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const fuelTypes = ['Benzin', 'Dizel', 'Elektrik', 'Hibrit', 'LPG'];
const gearTypes = ['Manuel', 'Otomatik'];
const vehicleClasses = ['Ekonomi', 'Orta', 'Üst', 'Lüks', 'SUV', 'Ticari'];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { profile } = useAuthStore();

  const [formData, setFormData] = useState<CreateVehicleInput>({
    plate_number: '',
    model_name: '',
    image_url: '',
    class: '',
    type: '',
    fuel_type: '',
    gear: '',
    person_capacity: '',
    trunk_capacity: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVehicles(data || []);
      setFilteredVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Araçlar yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = vehicles.filter(
      (vehicle) =>
        vehicle.plate_number.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.model_name.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.class?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredVehicles(filtered);
  };

  const resetForm = () => {
    setFormData({
      plate_number: '',
      model_name: '',
      image_url: '',
      class: '',
      type: '',
      fuel_type: '',
      gear: '',
      person_capacity: '',
      trunk_capacity: '',
    });
    setIsEditing(false);
    setSelectedVehicle(null);
    setSelectedFile(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      model_name: vehicle.model_name,
      image_url: vehicle.image_url || '',
      class: vehicle.class || '',
      type: vehicle.type || '',
      fuel_type: vehicle.fuel_type || '',
      gear: vehicle.gear || '',
      person_capacity: vehicle.person_capacity || '',
      trunk_capacity: vehicle.trunk_capacity || '',
    });
    setIsEditing(true);
    setIsFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.plate_number || !formData.model_name) {
      toast.error('Plaka ve model adı zorunludur.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      // Eğer yeni bir dosya seçildiyse, önce yükle
      if (selectedFile) {
        const uploadOptions = {
          bucket: 'vehicle-images' as const,
          folder: 'vehicles',
          maxSizeInMB: 5,
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        };

        // Güncelleme ise eski görseli değiştir, yeni ekleme ise direkt yükle
        const result = isEditing && formData.image_url
          ? await replaceFile(formData.image_url, selectedFile, uploadOptions)
          : await uploadFile(selectedFile, uploadOptions);

        if (!result.success || !result.url) {
          toast.error(result.error || 'Görsel yükleme başarısız oldu.');
          setIsSubmitting(false);
          return;
        }

        finalImageUrl = result.url;
      }

      // Veritabanı işlemi
      const dataToSave = { ...formData, image_url: finalImageUrl };

      if (isEditing && selectedVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(dataToSave)
          .eq('id', selectedVehicle.id);

        if (error) throw error;
        toast.success('Araç güncellendi.');
      } else {
        const { error } = await supabase.from('vehicles').insert(dataToSave);

        if (error) throw error;
        toast.success('Araç eklendi.');
      }

      setIsFormDialogOpen(false);
      resetForm();
      fetchVehicles();
    } catch (error: unknown) {
      console.error('Error saving vehicle:', error);
      const dbError = error as { code?: string };
      if (dbError.code === '23505') {
        toast.error('Bu plaka numarası zaten kayıtlı.');
      } else {
        toast.error('Kaydetme sırasında hata oluştu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      // Önce Storage'dan görseli sil
      if (selectedVehicle.image_url) {
        const imagePath = extractPathFromUrl(selectedVehicle.image_url, 'vehicle-images');
        if (imagePath) {
          await deleteFile('vehicle-images', imagePath);
        }
      }

      // Sonra veritabanından sil
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', selectedVehicle.id);

      if (error) throw error;

      toast.success('Araç silindi.');
      setIsDeleteDialogOpen(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Araç',
      accessor: (vehicle: Vehicle) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden relative">
            {vehicle.image_url ? (
              <Image src={vehicle.image_url} alt={vehicle.model_name} fill className="object-cover" sizes="40px" />
            ) : (
              <Car className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{vehicle.model_name}</p>
            <p className="text-sm text-muted-foreground">{vehicle.plate_number}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Sınıf',
      accessor: (vehicle: Vehicle) =>
        vehicle.class ? <Badge variant="outline">{vehicle.class}</Badge> : '-',
    },
    {
      header: 'Yakıt',
      accessor: 'fuel_type' as keyof Vehicle,
    },
    {
      header: 'Vites',
      accessor: 'gear' as keyof Vehicle,
    },
    {
      header: 'Kapasite',
      accessor: (vehicle: Vehicle) =>
        vehicle.person_capacity ? `${vehicle.person_capacity} Kişi` : '-',
    },
    {
      header: 'Eklenme Tarihi',
      accessor: (vehicle: Vehicle) =>
        new Date(vehicle.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  const userCanDelete = canDelete(profile?.role, 'vehicles');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Araçlar</h1>
          <p className="text-muted-foreground">Araç filosu yönetimi</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Araç
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Araç Listesi</CardTitle>
          <CardDescription>
            Toplam {vehicles.length} araç bulunmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredVehicles}
            columns={columns}
            keyExtractor={(vehicle) => vehicle.id}
            isLoading={isLoading}
            searchPlaceholder="Plaka veya model ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz araç bulunmamaktadır."
            actions={(vehicle) => (
              <div className="flex items-center justify-end gap-2">
                <Link href={`/vehicles/${vehicle.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(vehicle)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {userCanDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Araç Düzenle' : 'Yeni Araç Ekle'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Araç bilgilerini güncelleyin.' : 'Yeni araç bilgilerini girin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate_number">Plaka *</Label>
                <Input
                  id="plate_number"
                  placeholder="34 ABC 123"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model_name">Model Adı *</Label>
                <Input
                  id="model_name"
                  placeholder="Toyota Corolla"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <FileUploader
                label="Araç Görseli"
                currentUrl={formData.image_url}
                onFileSelect={setSelectedFile}
                maxSizeInMB={5}
                allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                accept="image/jpeg,image/png,image/webp"
                showPreview
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Sınıf</Label>
                <Select
                  value={formData.class || ''}
                  onValueChange={(value) => setFormData({ ...formData, class: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sınıf seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tip</Label>
                <Input
                  id="type"
                  placeholder="Sedan, Hatchback, SUV..."
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuel_type">Yakıt Tipi</Label>
                <Select
                  value={formData.fuel_type || ''}
                  onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Yakıt tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>
                        {fuel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gear">Vites</Label>
                <Select
                  value={formData.gear || ''}
                  onValueChange={(value) => setFormData({ ...formData, gear: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vites tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {gearTypes.map((gear) => (
                      <SelectItem key={gear} value={gear}>
                        {gear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="person_capacity">Kişi Kapasitesi</Label>
                <Input
                  id="person_capacity"
                  placeholder="5"
                  value={formData.person_capacity || ''}
                  onChange={(e) => setFormData({ ...formData, person_capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trunk_capacity">Bagaj Kapasitesi</Label>
                <Input
                  id="trunk_capacity"
                  placeholder="450L"
                  value={formData.trunk_capacity || ''}
                  onChange={(e) => setFormData({ ...formData, trunk_capacity: e.target.value })}
                />
              </div>
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
        title="Aracı Sil"
        description={`"${selectedVehicle?.plate_number} - ${selectedVehicle?.model_name}" aracını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
