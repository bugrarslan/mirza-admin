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
import { Document, Profile, Vehicle } from '@/types/database';
import { Download, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const documentTypes = [
  { value: 'invoice', label: 'Fatura' },
  { value: 'contract', label: 'Sözleşme' },
  { value: 'receipt', label: 'Makbuz' },
  { value: 'other', label: 'Diğer' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { profile } = useAuthStore();

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    document_type: '',
    file_path: '',
    file_name: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const [documentsResult, customersResult, vehiclesResult] = await Promise.all([
        supabase
          .from('documents')
          .select('*, customer:profiles!documents_customer_id_fkey(*), vehicle:vehicles(*)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'customer'),
        supabase.from('vehicles').select('*'),
      ]);

      if (documentsResult.error) throw documentsResult.error;

      setDocuments(documentsResult.data || []);
      setFilteredDocuments(documentsResult.data || []);
      setCustomers(customersResult.data || []);
      setVehicles(vehiclesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = documents.filter(
      (doc) =>
        doc.file_name?.toLowerCase().includes(query.toLowerCase()) ||
        doc.customer?.name?.toLowerCase().includes(query.toLowerCase()) ||
        doc.customer?.surname?.toLowerCase().includes(query.toLowerCase()) ||
        doc.vehicle?.plate_number?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDocuments(filtered);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      vehicle_id: '',
      document_type: '',
      file_path: '',
      file_name: '',
    });
    setSelectedFile(null);
    setIsEditing(false);
    setSelectedDocument(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const handleEdit = (document: Document) => {
    setSelectedDocument(document);
    setFormData({
      customer_id: document.customer_id,
      vehicle_id: document.vehicle_id?.toString() || '',
      document_type: document.document_type,
      file_path: document.file_path,
      file_name: document.file_name || '',
    });
    setIsEditing(true);
    setIsFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.customer_id || !formData.document_type) {
      toast.error('Müşteri ve belge tipi zorunludur.');
      return;
    }

    if (!selectedFile && !formData.file_path) {
      toast.error('Lütfen bir dosya seçin.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      let finalFilePath = formData.file_path;
      let finalFileName = formData.file_name;

      // Eğer yeni bir dosya seçildiyse, önce yükle
      if (selectedFile) {
        const uploadOptions = {
          bucket: 'documents' as const,
          folder: `customer-${formData.customer_id}`,
          maxSizeInMB: 10,
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        };

        // Güncelleme ise ve eski dosya varsa, eski dosyayı sil
        if (isEditing && formData.file_path) {
          const result = await replaceFile(formData.file_path, selectedFile, uploadOptions);
          if (!result.success || !result.url) {
            toast.error(result.error || 'Dosya yükleme başarısız oldu.');
            setIsSubmitting(false);
            return;
          }
          finalFilePath = result.url;
        } else {
          const result = await uploadFile(selectedFile, uploadOptions);
          if (!result.success || !result.url) {
            toast.error(result.error || 'Dosya yükleme başarısız oldu.');
            setIsSubmitting(false);
            return;
          }
          finalFilePath = result.url;
        }

        // Dosya adı form data'dan kullanılır (kullanıcı değiştirmiş olabilir)
        // Eğer boşsa, seçilen dosyanın adını kullan
        finalFileName = formData.file_name || selectedFile.name;
      }

      const saveData: any = {
        customer_id: formData.customer_id,
        document_type: formData.document_type,
        file_path: finalFilePath,
        file_name: finalFileName || null,
      };

      if (formData.vehicle_id) {
        saveData.vehicle_id = parseInt(formData.vehicle_id);
      } else {
        saveData.vehicle_id = null;
      }

      let error;
      if (isEditing && selectedDocument) {
        const result = await supabase.from('documents').update(saveData).eq('id', selectedDocument.id);
        error = result.error;
      } else {
        const result = await supabase.from('documents').insert(saveData);
        error = result.error;
      }

      if (error) throw error;

      toast.success(isEditing ? 'Belge güncellendi.' : 'Belge eklendi.');
      setIsFormDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Kaydetme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      // Önce Storage'dan dosyayı sil
      if (selectedDocument.file_path) {
        const filePath = extractPathFromUrl(selectedDocument.file_path, 'documents');
        if (filePath) {
          await deleteFile('documents', filePath);
        }
      }

      // Sonra veritabanından sil
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', selectedDocument.id);

      if (error) throw error;

      toast.success('Belge silindi.');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      invoice: 'Fatura',
      contract: 'Sözleşme',
      receipt: 'Makbuz',
      other: 'Diğer',
    };

    const typeColors: Record<string, string> = {
      invoice: 'bg-blue-100 text-blue-800',
      contract: 'bg-purple-100 text-purple-800',
      receipt: 'bg-green-100 text-green-800',
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
      header: 'Belge',
      accessor: (doc: Document) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded bg-muted">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{doc.file_name || 'Belge'}</p>
            <p className="text-sm text-muted-foreground">{getDocumentTypeBadge(doc.document_type)}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Müşteri',
      accessor: (doc: Document) => (
        <Link href={`/customers/${doc.customer_id}`} className="hover:underline">
          {doc.customer?.name} {doc.customer?.surname}
        </Link>
      ),
    },
    {
      header: 'Araç',
      accessor: (doc: Document) =>
        doc.vehicle ? (
          <Link href={`/vehicles/${doc.vehicle_id}`} className="hover:underline">
            {doc.vehicle.plate_number}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      header: 'Görüldü',
      accessor: (doc: Document) => (
        <Badge variant={doc.isSeen_customer ? 'default' : 'secondary'}>
          {doc.isSeen_customer ? 'Evet' : 'Hayır'}
        </Badge>
      ),
    },
    {
      header: 'Tarih',
      accessor: (doc: Document) =>
        new Date(doc.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  const userCanDelete = canDelete(profile?.role, 'documents');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Belgeler</h1>
          <p className="text-muted-foreground">Belge yönetimi</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Belge
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Belge Listesi</CardTitle>
          <CardDescription>
            Toplam {documents.length} belge bulunmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredDocuments}
            columns={columns}
            keyExtractor={(doc) => doc.id}
            isLoading={isLoading}
            searchPlaceholder="Belge adı, müşteri veya plaka ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz belge bulunmamaktadır."
            actions={(doc) => (
              <div className="flex items-center justify-end gap-2">
                {doc.file_path && (
                  <a href={doc.file_path} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(doc)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                {userCanDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedDocument(doc);
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

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isFormDialogOpen} 
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Belge Düzenle' : 'Yeni Belge Ekle'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Belge bilgilerini güncelleyin.' : 'Yeni belge bilgilerini girin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Müşteri *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                disabled={isEditing}
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
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Müşteri düzenlenemez. Belgeyi silip yeni müşteri için tekrar ekleyebilirsiniz.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_id">Araç (Opsiyonel)</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
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
            <div className="space-y-2">
              <Label htmlFor="document_type">Belge Tipi *</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value) => setFormData({ ...formData, document_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Belge tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FileUploader
                label="Belge Dosyası *"
                currentUrl={formData.file_path}
                onFileSelect={(file) => {
                  if (!formData.customer_id) {
                    toast.error('Önce müşteri seçin.');
                    return;
                  }
                  setSelectedFile(file);
                  // Dosya seçildiğinde file_name'i otomatik doldur (kullanıcı değiştirebilir)
                  if (file) {
                    setFormData({ ...formData, file_name: file.name });
                  }
                }}
                maxSizeInMB={10}
                allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                showPreview={false}
              />
              <p className="text-xs text-muted-foreground">
                {!formData.customer_id 
                  ? 'Önce müşteri seçin, sonra dosya yükleyebilirsiniz.' 
                  : 'PDF veya görsel dosyaları kabul eder (max 10MB).'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file_name">Dosya Adı</Label>
              <Input
                id="file_name"
                placeholder="Örn: Araç Kiralama Sözleşmesi.pdf"
                value={formData.file_name}
                onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Dosya seçildiğinde otomatik doldurulur, isterseniz değiştirebilirsiniz.
              </p>
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
        title="Belgeyi Sil"
        description={`"${selectedDocument?.file_name || 'Bu belge'}" belgesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
