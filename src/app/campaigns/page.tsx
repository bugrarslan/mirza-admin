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
import { Switch } from '@/components/ui/switch';
import { deleteFile, extractPathFromUrl, replaceFile, uploadFile } from '@/lib/storage';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { canDelete, useAuthStore } from '@/stores/authStore';
import { Campaign, CreateCampaignInput } from '@/types/database';
import { ExternalLink, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { profile } = useAuthStore();

  const [formData, setFormData] = useState<CreateCampaignInput>({
    title: '',
    image_url: '',
    target_url: '',
    is_active: true,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchCampaigns = async () => {
      const supabase = createClient();
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal);

        if (error) {
          if (error.message?.includes('aborted')) return;
          throw error;
        }

        if (isMounted) {
          setCampaigns(data || []);
          setFilteredCampaigns(data || []);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching campaigns:', error);
          toast.error('Kampanyalar yüklenirken hata oluştu.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCampaigns();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const refetchCampaigns = async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
      setFilteredCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Kampanyalar yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = campaigns.filter((campaign) =>
      campaign.title.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCampaigns(filtered);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      target_url: '',
      is_active: true,
    });
    setIsEditing(false);
    setSelectedCampaign(null);
    setSelectedFile(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      title: campaign.title,
      image_url: campaign.image_url || '',
      target_url: campaign.target_url || '',
      is_active: campaign.is_active,
    });
    setIsEditing(true);
    setIsFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Kampanya başlığı zorunludur.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      // Eğer yeni bir dosya seçildiyse, önce yükle
      if (selectedFile) {
        const uploadOptions = {
          bucket: 'campaign-images' as const,
          folder: 'campaigns',
          maxSizeInMB: 5,
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        };

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

      const dataToSave = { ...formData, image_url: finalImageUrl };

      if (isEditing && selectedCampaign) {
        const { error } = await supabase
          .from('campaigns')
          .update(dataToSave)
          .eq('id', selectedCampaign.id);

        if (error) throw error;
        toast.success('Kampanya güncellendi.');
      } else {
        const { error } = await supabase.from('campaigns').insert(dataToSave);

        if (error) throw error;
        toast.success('Kampanya eklendi.');
      }

      setIsFormDialogOpen(false);
      resetForm();
      refetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Kaydetme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (campaign: Campaign) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);

      if (error) throw error;

      toast.success(campaign.is_active ? 'Kampanya devre dışı bırakıldı.' : 'Kampanya aktifleştirildi.');
      refetchCampaigns();
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast.error('İşlem sırasında hata oluştu.');
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      // Önce Storage'dan görseli sil
      if (selectedCampaign.image_url) {
        const imagePath = extractPathFromUrl(selectedCampaign.image_url, 'campaign-images');
        if (imagePath) {
          await deleteFile('campaign-images', imagePath);
        }
      }

      // Sonra veritabanından sil
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      toast.success('Kampanya silindi.');
      setIsDeleteDialogOpen(false);
      refetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Silme sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Kampanya',
      accessor: (campaign: Campaign) => (
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 rounded bg-muted flex items-center justify-center overflow-hidden relative">
            {campaign.image_url ? (
              <Image
                src={campaign.image_url}
                alt={campaign.title}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <Megaphone className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{campaign.title}</p>
            {campaign.target_url && (
              <a
                href={campaign.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Link
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Durum',
      accessor: (campaign: Campaign) => (
        <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
          {campaign.is_active ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      header: 'Oluşturulma Tarihi',
      accessor: (campaign: Campaign) =>
        new Date(campaign.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  const userCanDelete = canDelete(profile?.role, 'campaigns');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kampanyalar</h1>
          <p className="text-muted-foreground">Kampanya yönetimi</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kampanya
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kampanya Listesi</CardTitle>
          <CardDescription>
            Toplam {campaigns.length} kampanya bulunmaktadır.
            {' '}({campaigns.filter(c => c.is_active).length} aktif)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCampaigns}
            columns={columns}
            keyExtractor={(campaign) => campaign.id}
            isLoading={isLoading}
            searchPlaceholder="Kampanya başlığı ile ara..."
            onSearch={handleSearch}
            emptyMessage="Henüz kampanya bulunmamaktadır."
            actions={(campaign) => (
              <div className="flex items-center justify-end gap-2">
                <Switch
                  checked={campaign.is_active}
                  onCheckedChange={() => handleToggleActive(campaign)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(campaign)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {userCanDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCampaign(campaign);
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
            <DialogTitle>{isEditing ? 'Kampanya Düzenle' : 'Yeni Kampanya'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Kampanya bilgilerini güncelleyin.' : 'Yeni kampanya bilgilerini girin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık *</Label>
              <Input
                id="title"
                placeholder="Kampanya başlığı"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <FileUploader
                label="Kampanya Görseli"
                currentUrl={formData.image_url}
                onFileSelect={setSelectedFile}
                maxSizeInMB={5}
                allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                accept="image/jpeg,image/png,image/webp"
                showPreview
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_url">Hedef URL</Label>
              <Input
                id="target_url"
                placeholder="https://..."
                value={formData.target_url || ''}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Aktif</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
        title="Kampanyayı Sil"
        description={`"${selectedCampaign?.title}" kampanyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </div>
  );
}
