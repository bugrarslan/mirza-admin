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
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { canDelete, useAuthStore } from '@/stores/authStore';
import { Profile } from '@/types/database';
import { Building2, Eye, Pencil, Plus, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuthStore();

  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    name: '',
    surname: '',
    phone: '',
    company_name: '',
    is_company: false,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    company_name: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Müşteriler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(query.toLowerCase()) ||
        customer.surname?.toLowerCase().includes(query.toLowerCase()) ||
        customer.email?.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone?.includes(query) ||
        customer.company_name?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const resetAddForm = () => {
    setAddForm({
      email: '',
      password: '',
      name: '',
      surname: '',
      phone: '',
      company_name: '',
      is_company: false,
    });
  };

  const handleAdd = () => {
    resetAddForm();
    setIsAddDialogOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!addForm.email || !addForm.password || !addForm.name || !addForm.surname) {
      toast.error('E-posta, şifre, ad ve soyad zorunludur.');
      return;
    }

    if (addForm.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (addForm.is_company && !addForm.company_name) {
      toast.error('Kurumsal müşteriler için şirket adı zorunludur.');
      return;
    }

    setIsSubmitting(true);

    const userData = {
      name: addForm.name,
      surname: addForm.surname,
      phone: addForm.phone || null,
      company_name: addForm.is_company ? addForm.company_name : null,
      is_company: addForm.is_company ? true : false,
      role: 'customer',
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: addForm.email,
            password: addForm.password,
            user_metadata: userData,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Müşteri oluşturulamadı');
      }

      if (result.user) {
        toast.success('Müşteri başarıyla oluşturuldu.');
        setIsAddDialogOpen(false);
        resetAddForm();
        setTimeout(() => fetchCustomers(), 1000);
      }
    } catch (error: unknown) {
      console.error('Error creating customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (errorMessage.includes('already') || errorMessage.includes('exists')) {
        toast.error('Bu e-posta adresi zaten kayıtlı.');
      } else {
        toast.error(`Müşteri oluşturulurken hata: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer: Profile) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name || '',
      surname: customer.surname || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company_name: customer.company_name || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          surname: editForm.surname,
          phone: editForm.phone,
          company_name: editForm.company_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast.success('Müşteri bilgileri güncellendi.');
      setIsEditDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Güncelleme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast.success('Müşteri silindi.');
      setIsDeleteDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Müşteri',
      accessor: (customer: Profile) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
            {customer.isCompany ? (
              <Building2 className="w-5 h-5 text-muted-foreground" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {customer.name} {customer.surname}
            </p>
            {customer.isCompany && customer.company_name && (
              <p className="text-sm text-muted-foreground">{customer.company_name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'E-posta',
      accessor: 'email' as keyof Profile,
    },
    {
      header: 'Telefon',
      accessor: 'phone' as keyof Profile,
    },
    {
      header: 'Tip',
      accessor: (customer: Profile) => (
        <Badge variant={customer.isCompany ? 'default' : 'secondary'}>
          {customer.isCompany ? 'Kurumsal' : 'Bireysel'}
        </Badge>
      ),
    },
    {
      header: 'Kayıt Tarihi',
      accessor: (customer: Profile) =>
        new Date(customer.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  const userCanDelete = canDelete(profile?.role, 'customers');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>
          <p className="text-muted-foreground">Müşteri listesi ve yönetimi</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Listesi</CardTitle>
          <CardDescription>
            Toplam {customers.length} kayıtlı müşteri bulunmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCustomers}
            columns={columns}
            keyExtractor={(customer) => customer.id}
            isLoading={isLoading}
            searchPlaceholder="İsim, e-posta veya telefon ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz müşteri bulunmamaktadır."
            actions={(customer) => (
              <div className="flex items-center justify-end gap-2">
                <Link href={`/customers/${customer.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(customer)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                {userCanDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
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
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
            <DialogDescription>
              Yeni müşteri oluşturmak için aşağıdaki bilgileri doldurun.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Ad *</Label>
                <Input
                  id="add-name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-surname">Soyad *</Label>
                <Input
                  id="add-surname"
                  value={addForm.surname}
                  onChange={(e) => setAddForm({ ...addForm, surname: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">E-posta *</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Şifre *</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">En az 6 karakter</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Telefon</Label>
              <Input
                id="add-phone"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="add-isCompany">Kurumsal Müşteri</Label>
                <p className="text-xs text-muted-foreground">
                  Kurumsal müşteri ise aktif edin
                </p>
              </div>
              <Switch
                id="add-isCompany"
                checked={addForm.is_company}
                onCheckedChange={(checked) => setAddForm({ ...addForm, is_company: checked })}
              />
            </div>
            {addForm.is_company && (
              <div className="space-y-2">
                <Label htmlFor="add-company_name">Şirket Adı *</Label>
                <Input
                  id="add-company_name"
                  value={addForm.company_name}
                  onChange={(e) => setAddForm({ ...addForm, company_name: e.target.value })}
                />
              </div>
            )}
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
            <DialogTitle>Müşteri Düzenle</DialogTitle>
            <DialogDescription>
              Müşteri bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Soyad</Label>
                <Input
                  id="surname"
                  value={editForm.surname}
                  onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                E-posta adresi değiştirilemez.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Şirket Adı</Label>
              <Input
                id="company_name"
                value={editForm.company_name}
                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
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
        title="Müşteriyi Sil"
        description={`"${selectedCustomer?.name} ${selectedCustomer?.surname}" isimli müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
