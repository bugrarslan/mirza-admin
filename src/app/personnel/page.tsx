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
import { isAdmin, useAuthStore } from '@/stores/authStore';
import { Profile, UserRole } from '@/types/database';
import { Pencil, Plus, Shield, Trash2, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function PersonnelPage() {
  const router = useRouter();
  const [personnel, setPersonnel] = useState<Profile[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Profile | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile: currentUser } = useAuthStore();

  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    name: '',
    surname: '',
    phone: '',
    role: 'personnel' as UserRole,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    phone: '',
    role: 'personnel' as UserRole,
  });

  // Check if user is admin, if not redirect
  useEffect(() => {
    if (currentUser && !isAdmin(currentUser.role)) {
      router.push('/');
      toast.error('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
    }
  }, [currentUser, router]);

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'personnel'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPersonnel(data || []);
      setFilteredPersonnel(data || []);
    } catch (error) {
      console.error('Error fetching personnel:', error);
      toast.error('Personel listesi yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = personnel.filter(
      (person) =>
        person.name?.toLowerCase().includes(query.toLowerCase()) ||
        person.surname?.toLowerCase().includes(query.toLowerCase()) ||
        person.email?.toLowerCase().includes(query.toLowerCase()) ||
        person.phone?.includes(query)
    );
    setFilteredPersonnel(filtered);
  };

  const resetAddForm = () => {
    setAddForm({
      email: '',
      password: '',
      name: '',
      surname: '',
      phone: '',
      role: 'personnel',
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

    setIsSubmitting(true);

    const userData = {
      name: addForm.name,
      surname: addForm.surname,
      phone: addForm.phone || null,
      company_name: null,
      is_company: false,
      role: addForm.role,
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
        throw new Error(result.error || 'Kullanıcı oluşturulamadı');
      }

      if (result.user) {
        toast.success('Kullanıcı başarıyla oluşturuldu.');
        setIsAddDialogOpen(false);
        resetAddForm();
        setTimeout(() => fetchPersonnel(), 1000);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already') || error.message?.includes('exists')) {
        toast.error('Bu e-posta adresi zaten kayıtlı.');
      } else {
        toast.error(`Kullanıcı oluşturulurken hata: ${error.message || 'Bilinmeyen hata'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (person: Profile) => {
    setSelectedPerson(person);
    setEditForm({
      name: person.name || '',
      surname: person.surname || '',
      phone: person.phone || '',
      role: person.role,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPerson) return;

    // Prevent changing own role
    if (selectedPerson.id === currentUser?.id && editForm.role !== currentUser.role) {
      toast.error('Kendi rolünüzü değiştiremezsiniz.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          surname: editForm.surname,
          phone: editForm.phone,
          role: editForm.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPerson.id);

      if (error) throw error;

      toast.success('Kullanıcı bilgileri güncellendi.');
      setIsEditDialogOpen(false);
      fetchPersonnel();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Güncelleme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;

    // Prevent deleting yourself
    if (selectedPerson.id === currentUser?.id) {
      toast.error('Kendinizi silemezsiniz.');
      setIsDeleteDialogOpen(false);
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedPerson.id);

      if (error) throw error;

      toast.success('Kullanıcı silindi.');
      setIsDeleteDialogOpen(false);
      fetchPersonnel();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'admin') {
      return (
        <Badge className="text-purple-800 bg-purple-100 hover:bg-purple-100">
          <Shield className="w-3 h-3 mr-1" />
          Yönetici
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <UserCog className="w-3 h-3 mr-1" />
        Personel
      </Badge>
    );
  };

  const columns = [
    {
      header: 'Kullanıcı',
      accessor: (person: Profile) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
            {person.role === 'admin' ? (
              <Shield className="w-5 h-5 text-purple-600" />
            ) : (
              <UserCog className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {person.name} {person.surname}
              {person.id === currentUser?.id && (
                <span className="ml-2 text-xs text-muted-foreground">(Siz)</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{person.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Telefon',
      accessor: 'phone' as keyof Profile,
    },
    {
      header: 'Rol',
      accessor: (person: Profile) => getRoleBadge(person.role),
    },
    {
      header: 'Kayıt Tarihi',
      accessor: (person: Profile) =>
        new Date(person.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  // Don't render if not admin
  if (!currentUser || !isAdmin(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personel Yönetimi</h1>
          <p className="text-muted-foreground">Admin ve personel kullanıcılarını yönetin</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Listesi</CardTitle>
          <CardDescription>
            Toplam {personnel.length} kullanıcı bulunmaktadır.
            {' '}({personnel.filter(p => p.role === 'admin').length} admin, {personnel.filter(p => p.role === 'personnel').length} personel)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredPersonnel}
            columns={columns}
            keyExtractor={(person) => person.id}
            isLoading={isLoading}
            searchPlaceholder="İsim, e-posta veya telefon ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz kullanıcı bulunmamaktadır."
            actions={(person) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(person)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedPerson(person);
                    setIsDeleteDialogOpen(true);
                  }}
                  disabled={person.id === currentUser?.id}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            <DialogDescription>
              Yeni admin veya personel kullanıcı oluşturun.
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
            <div className="space-y-2">
              <Label htmlFor="add-role">Rol *</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) => setAddForm({ ...addForm, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personnel">Personel</SelectItem>
                  <SelectItem value="admin">Yönetici (Admin)</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Ad</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-surname">Soyad</Label>
                <Input
                  id="edit-surname"
                  value={editForm.surname}
                  onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                disabled={selectedPerson?.id === currentUser?.id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personnel">Personel</SelectItem>
                  <SelectItem value="admin">Yönetici (Admin)</SelectItem>
                </SelectContent>
              </Select>
              {selectedPerson?.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground">
                  Kendi rolünüzü değiştiremezsiniz.
                </p>
              )}
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
        title="Kullanıcıyı Sil"
        description={`"${selectedPerson?.name} ${selectedPerson?.surname}" isimli kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
