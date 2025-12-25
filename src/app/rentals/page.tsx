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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { canDelete, useAuthStore } from '@/stores/authStore';
import { CustomerVehicle, Profile, Vehicle } from '@/types/database';
import { Calendar, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type RentalWithDetails = CustomerVehicle & {
  customer: Profile;
  vehicle: Vehicle;
};

export default function RentalsPage() {
  const [rentals, setRentals] = useState<RentalWithDetails[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalWithDetails[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState<RentalWithDetails | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuthStore();

  const [addForm, setAddForm] = useState({
    customer_id: '',
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
  });

  const [editForm, setEditForm] = useState({
    customer_id: '',
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchAllData = async () => {
      const supabase = createClient();
      setIsLoading(true);

      try {
        const [rentalsResult, customersResult, vehiclesResult] = await Promise.all([
          supabase
            .from('customer_vehicles')
            .select('*, customer:profiles(*), vehicle:vehicles(*)')
            .order('created_at', { ascending: false })
            .abortSignal(abortController.signal),
          supabase
            .from('profiles')
            .select('*')
            .eq('role', 'customer')
            .order('name')
            .abortSignal(abortController.signal),
          supabase
            .from('vehicles')
            .select('*')
            .order('model_name')
            .abortSignal(abortController.signal),
        ]);

        if (rentalsResult.error) {
          if (rentalsResult.error.message?.includes('aborted')) return;
          throw rentalsResult.error;
        }

        if (isMounted) {
          setRentals(rentalsResult.data || []);
          setFilteredRentals(rentalsResult.data || []);
          setCustomers(customersResult.data || []);
          setVehicles(vehiclesResult.data || []);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching rentals:', error);
          toast.error('Kiralamalar yüklenirken hata oluştu.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAllData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const refetchRentals = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('customer_vehicles')
        .select('*, customer:profiles(*), vehicle:vehicles(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRentals(data || []);
      setFilteredRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
      toast.error('Kiralamalar yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = rentals.filter(
      (rental) =>
        rental.customer?.name?.toLowerCase().includes(query.toLowerCase()) ||
        rental.customer?.surname?.toLowerCase().includes(query.toLowerCase()) ||
        rental.vehicle?.model_name?.toLowerCase().includes(query.toLowerCase()) ||
        rental.vehicle?.plate_number?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredRentals(filtered);
  };

  const resetAddForm = () => {
    setAddForm({
      customer_id: '',
      vehicle_id: '',
      rental_start_date: '',
      rental_end_date: '',
    });
  };

  const handleAdd = () => {
    resetAddForm();
    setIsAddDialogOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!addForm.customer_id || !addForm.vehicle_id || !addForm.rental_start_date) {
      toast.error('Müşteri, araç ve başlangıç tarihi zorunludur.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('customer_vehicles').insert({
        customer_id: addForm.customer_id,
        vehicle_id: parseInt(addForm.vehicle_id),
        rental_start_date: addForm.rental_start_date,
        rental_end_date: addForm.rental_end_date || null,
      });

      if (error) throw error;

      toast.success('Kiralama başarıyla oluşturuldu.');
      setIsAddDialogOpen(false);
      resetAddForm();
      refetchRentals();
    } catch (error) {
      console.error('Error creating rental:', error);
      toast.error('Kiralama oluşturulurken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rental: RentalWithDetails) => {
    setSelectedRental(rental);
    setEditForm({
      customer_id: rental.customer_id,
      vehicle_id: rental.vehicle_id.toString(),
      rental_start_date: rental.rental_start_date.split('T')[0],
      rental_end_date: rental.rental_end_date ? rental.rental_end_date.split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRental) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('customer_vehicles')
        .update({
          customer_id: editForm.customer_id,
          vehicle_id: parseInt(editForm.vehicle_id),
          rental_start_date: editForm.rental_start_date,
          rental_end_date: editForm.rental_end_date || null,
        })
        .eq('id', selectedRental.id);

      if (error) throw error;

      toast.success('Kiralama güncellendi.');
      setIsEditDialogOpen(false);
      refetchRentals();
    } catch (error) {
      console.error('Error updating rental:', error);
      toast.error('Güncelleme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndRental = async (rental: RentalWithDetails) => {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('customer_vehicles')
        .update({
          rental_end_date: new Date().toISOString(),
        })
        .eq('id', rental.id);

      if (error) throw error;

      toast.success('Kiralama sonlandırıldı.');
      refetchRentals();
    } catch (error) {
      console.error('Error ending rental:', error);
      toast.error('Kiralama sonlandırılırken hata oluştu.');
    }
  };

  const handleDelete = async () => {
    if (!selectedRental) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('customer_vehicles')
        .delete()
        .eq('id', selectedRental.id);

      if (error) throw error;

      toast.success('Kiralama silindi.');
      setIsDeleteDialogOpen(false);
      refetchRentals();
    } catch (error) {
      console.error('Error deleting rental:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isActive = (rental: RentalWithDetails) => {
    return !rental.rental_end_date || new Date(rental.rental_end_date) > new Date();
  };

  const columns = [
    {
      header: 'Müşteri',
      accessor: (rental: RentalWithDetails) => (
        <Link href={`/customers/${rental.customer_id}`} className="hover:underline">
          <div>
            <p className="font-medium">
              {rental.customer?.name} {rental.customer?.surname}
            </p>
            <p className="text-sm text-muted-foreground">{rental.customer?.email}</p>
          </div>
        </Link>
      ),
    },
    {
      header: 'Araç',
      accessor: (rental: RentalWithDetails) => (
        <Link href={`/vehicles/${rental.vehicle_id}`} className="hover:underline">
          <div>
            <p className="font-medium">{rental.vehicle?.model_name}</p>
            <p className="text-sm text-muted-foreground">{rental.vehicle?.plate_number}</p>
          </div>
        </Link>
      ),
    },
    {
      header: 'Başlangıç',
      accessor: (rental: RentalWithDetails) =>
        new Date(rental.rental_start_date).toLocaleDateString('tr-TR'),
    },
    {
      header: 'Bitiş',
      accessor: (rental: RentalWithDetails) =>
        rental.rental_end_date
          ? new Date(rental.rental_end_date).toLocaleDateString('tr-TR')
          : '-',
    },
    {
      header: 'Durum',
      accessor: (rental: RentalWithDetails) => (
        <Badge variant={isActive(rental) ? 'default' : 'secondary'}>
          {isActive(rental) ? 'Aktif' : 'Bitti'}
        </Badge>
      ),
    },
  ];

  const userCanDelete = canDelete(profile?.role, 'rentals');
  const activeRentals = rentals.filter(isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kiralamalar</h1>
          <p className="text-muted-foreground">Müşteri kiralama yönetimi</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kiralama
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Toplam Kiralama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rentals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktif Kiralama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRentals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sonlanan Kiralama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{rentals.length - activeRentals}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kiralama Listesi</CardTitle>
          <CardDescription>
            Tüm müşteri kiralamalarını görüntüleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredRentals}
            columns={columns}
            keyExtractor={(rental) => rental.id.toString()}
            isLoading={isLoading}
            searchPlaceholder="Müşteri adı, araç modeli veya plaka ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz kiralama bulunmamaktadır."
            actions={(rental) => (
              <div className="flex items-center justify-end gap-2">
                {isActive(rental) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEndRental(rental)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Sonlandır
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(rental)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {userCanDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedRental(rental);
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

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kiralama Ekle</DialogTitle>
            <DialogDescription>
              Müşteriye araç kiralama kaydı oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-customer">Müşteri *</Label>
              <Select
                value={addForm.customer_id}
                onValueChange={(value) => setAddForm({ ...addForm, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.surname} - {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-vehicle">Araç *</Label>
              <Select
                value={addForm.vehicle_id}
                onValueChange={(value) => setAddForm({ ...addForm, vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Araç seçin" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.model_name} - {vehicle.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-start">Başlangıç Tarihi *</Label>
              <Input
                id="add-start"
                type="date"
                value={addForm.rental_start_date}
                onChange={(e) => setAddForm({ ...addForm, rental_start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-end">Bitiş Tarihi</Label>
              <Input
                id="add-end"
                type="date"
                value={addForm.rental_end_date}
                onChange={(e) => setAddForm({ ...addForm, rental_end_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Boş bırakılırsa kiralama aktif olarak işaretlenir
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kiralama Düzenle</DialogTitle>
            <DialogDescription>
              Kiralama bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Müşteri *</Label>
              <Select
                value={editForm.customer_id}
                onValueChange={(value) => setEditForm({ ...editForm, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.surname} - {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vehicle">Araç *</Label>
              <Select
                value={editForm.vehicle_id}
                onValueChange={(value) => setEditForm({ ...editForm, vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.model_name} - {vehicle.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start">Başlangıç Tarihi *</Label>
              <Input
                id="edit-start"
                type="date"
                value={editForm.rental_start_date}
                onChange={(e) => setEditForm({ ...editForm, rental_start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">Bitiş Tarihi</Label>
              <Input
                id="edit-end"
                type="date"
                value={editForm.rental_end_date}
                onChange={(e) => setEditForm({ ...editForm, rental_end_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Kiralamayı Sil"
        description="Bu kiralama kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
