import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, File, Image, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileValidation {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  blockedExtensions?: string[];
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  uploading: boolean;
  error?: string;
}

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  files?: File[];
  maxFiles?: number;
  validation?: FileValidation;
  accept?: string;
  showPreview?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  variant?: "default" | "compact" | "dropzone";
}

const DEFAULT_VALIDATION: FileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  blockedExtensions: ['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'dll', 'scr'],
};

const IMAGE_VALIDATION: FileValidation = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

const DESIGN_VALIDATION: FileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
};

export { DEFAULT_VALIDATION, IMAGE_VALIDATION, DESIGN_VALIDATION };

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return Image;
  if (file.type === 'application/pdf') return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileUpload({
  onFilesSelected,
  onFileRemove,
  files = [],
  maxFiles = 5,
  validation = DEFAULT_VALIDATION,
  accept,
  showPreview = true,
  uploading = false,
  uploadProgress = 0,
  disabled = false,
  className,
  label = "Selecionar arquivo",
  description,
  variant = "default",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (validation.maxSize && file.size > validation.maxSize) {
      return `Arquivo muito grande. Máximo: ${formatFileSize(validation.maxSize)}`;
    }

    // Check allowed types
    if (validation.allowedTypes && !validation.allowedTypes.includes(file.type)) {
      const extensions = validation.allowedTypes
        .map(t => t.split('/')[1].toUpperCase())
        .join(', ');
      return `Formato inválido. Use: ${extensions}`;
    }

    // Check blocked extensions
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (validation.blockedExtensions?.includes(ext)) {
      return 'Tipo de arquivo não permitido por segurança';
    }

    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles: File[] = [];
    const errors: string[] = [];
    
    Array.from(fileList).forEach(file => {
      // Check max files limit
      if (files.length + newFiles.length >= maxFiles) {
        errors.push(`Máximo de ${maxFiles} arquivos permitido`);
        return;
      }

      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      newFiles.push(file);

      // Generate preview for images
      if (showPreview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => ({
            ...prev,
            [files.length + newFiles.indexOf(file)]: e.target?.result as string
          }));
        };
        reader.readAsDataURL(file);
      }
    });

    // Show errors
    errors.forEach(error => toast.error(error));

    if (newFiles.length > 0) {
      onFilesSelected(newFiles);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    setPreviews(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    onFileRemove?.(index);
  };

  const canAddMore = files.length < maxFiles && !disabled && !uploading;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-colors",
            dragActive 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50",
            variant === "compact" && "p-3",
            variant === "default" && "p-6",
            variant === "dropzone" && "p-8"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleInputChange}
            disabled={disabled || uploading}
          />
          
          <div 
            className="flex flex-col items-center justify-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className={cn(
              "text-muted-foreground mb-2",
              variant === "compact" ? "h-5 w-5" : "h-8 w-8"
            )} />
            <p className={cn(
              "font-medium text-foreground",
              variant === "compact" ? "text-sm" : "text-base"
            )}>
              {label}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              ou arraste e solte aqui
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Enviando... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
            </span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const FileIcon = getFileIcon(file);
            const preview = previews[index];
            const isImage = file.type.startsWith('image/');

            return (
              <div 
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg group"
              >
                {/* Preview or Icon */}
                {showPreview && isImage && preview ? (
                  <img 
                    src={preview} 
                    alt={file.name}
                    className="h-10 w-10 object-cover rounded border border-border"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove Button */}
                {onFileRemove && !uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* File Count */}
      {maxFiles > 1 && (
        <p className="text-xs text-muted-foreground text-right">
          {files.length}/{maxFiles} arquivos
        </p>
      )}
    </div>
  );
}

// Simple image upload grid for inspiration/reference files
interface ImageUploadGridProps {
  images: File[];
  previews: string[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  maxImages?: number;
  disabled?: boolean;
  validation?: FileValidation;
}

export function ImageUploadGrid({
  images,
  previews,
  onAdd,
  onRemove,
  maxImages = 3,
  disabled = false,
  validation = IMAGE_VALIDATION,
}: ImageUploadGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (validation.maxSize && file.size > validation.maxSize) {
      return `Arquivo muito grande. Máximo: ${formatFileSize(validation.maxSize)}`;
    }
    if (validation.allowedTypes && !validation.allowedTypes.includes(file.type)) {
      return 'Formato inválido. Use: JPG, PNG, GIF, WebP ou SVG';
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      e.target.value = '';
      return;
    }

    onAdd(file);
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {previews.map((preview, index) => (
        <div key={index} className="relative aspect-square">
          <img 
            src={preview} 
            alt={`Imagem ${index + 1}`}
            className="w-full h-full object-cover rounded-lg border border-border" 
          />
          <button 
            type="button"
            onClick={() => onRemove(index)}
            disabled={disabled}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      
      {images.length < maxImages && !disabled && (
        <label className="aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleChange}
          />
        </label>
      )}
    </div>
  );
}
