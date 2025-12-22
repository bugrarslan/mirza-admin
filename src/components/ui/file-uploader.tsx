import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FileUploaderProps {
  label: string;
  currentUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  maxSizeInMB?: number;
  allowedTypes?: string[];
  accept?: string;
  showPreview?: boolean;
}

export function FileUploader({
  label,
  currentUrl,
  onFileSelect,
  maxSizeInMB = 10,
  allowedTypes = ['image/*'],
  accept = 'image/*',
  showPreview = true,
}: FileUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // currentUrl değiştiğinde preview'ı güncelle
  useEffect(() => {
    if (currentUrl && !selectedFile) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl, selectedFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    onFileSelect(file);

    // Show preview for images
    if (file.type.startsWith('image/') && showPreview) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = selectedFile?.type.startsWith('image/') || currentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Preview */}
      {showPreview && previewUrl && (
        <div className="relative w-full h-48 overflow-hidden border rounded-lg bg-muted">
          {isImage ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="object-contain w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <FileText className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* File Input */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id={`file-upload-${label.replace(/\s/g, '-')}`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          {selectedFile ? (
            <span className="truncate">{selectedFile.name}</span>
          ) : (
            <>Dosya Seç</>
          )}
        </Button>
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        {selectedFile 
          ? `Seçili: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)` 
          : `Maksimum dosya boyutu: ${maxSizeInMB}MB${allowedTypes ? ` • İzin verilen tipler: ${allowedTypes.map(t => t.replace('/*', '').replace('application/', '')).join(', ')}` : ''}`
        }
      </p>
    </div>
  );
}
