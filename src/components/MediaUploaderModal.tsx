import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FolderOpen,
  Link2,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Trash2,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Layers,
  AlignLeft,
  AlignRight,
  Maximize2,
  Grid,
  Columns,
  Sparkles,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AutoResizeTextarea } from './AutoResizeTextarea';

export type ImageLayoutType = 'single' | 'grid2' | 'grid3' | 'floatLeft' | 'floatRight';

export interface InsertImageData {
  url: string;
  caption?: string;
  layout: ImageLayoutType;
  alt?: string;
}

export interface MediaUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (imageData: InsertImageData) => void;
  webAppUrl?: string;
  defaultFolderId?: string;
}

interface DriveFileItem {
  fileId: string;
  fileName: string;
  directUrl: string;
  viewUrl?: string;
  mimeType?: string;
  size?: number;
  createdDate?: string;
}

/**
 * Normalizes any Google Drive link or standard image link into a high-speed direct rendering URL
 */
export const normalizeMediaImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Format: drive.google.com/file/d/FILE_ID/view or open?id=FILE_ID or thumbnail?id=FILE_ID
  if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com')) {
    const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      const fileId = idMatch[1];
      // Format lh3/thumbnail enables fast direct rendering in <img> tags
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  return trimmed;
};

/**
 * Formats byte sizes into human readable format (KB / MB)
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Generates clean, secure, responsive HTML snippet for rich text insertion with contenteditable="false" wrapper
 */
export const insertImageHtmlToEditor = (data: InsertImageData): string => {
  const directUrl = normalizeMediaImageUrl(data.url);
  const altText = data.alt ? data.alt.replace(/"/g, '&quot;') : (data.caption || 'Gambar Materi').replace(/"/g, '&quot;');
  const captionHtml = data.caption && data.caption.trim() 
    ? `<figcaption class="mt-2 text-center text-xs font-medium text-slate-500 italic">${data.caption.trim()}</figcaption>` 
    : '';

  let containerClass = 'my-4 clear-both';
  let figureClass = 'flex flex-col items-center max-w-full';
  let imgClass = 'rounded-2xl shadow-md border border-slate-200/80 object-cover max-h-[500px] transition-all hover:shadow-lg';

  if (data.layout === 'floatLeft') {
    containerClass = 'float-left mr-5 mb-4 my-2 max-w-[280px] sm:max-w-[340px] clear-left';
    imgClass = 'w-full rounded-2xl shadow-md border border-slate-200/80 object-cover';
  } else if (data.layout === 'floatRight') {
    containerClass = 'float-right ml-5 mb-4 my-2 max-w-[280px] sm:max-w-[340px] clear-right';
    imgClass = 'w-full rounded-2xl shadow-md border border-slate-200/80 object-cover';
  } else if (data.layout === 'grid2') {
    containerClass = 'my-4 w-full';
    figureClass = 'w-full flex flex-col items-center';
    imgClass = 'w-full rounded-2xl shadow-md border border-slate-200/80 object-cover';
  } else if (data.layout === 'grid3') {
    containerClass = 'my-4 w-full';
    figureClass = 'w-full flex flex-col items-center';
    imgClass = 'w-full rounded-2xl shadow-md border border-slate-200/80 object-cover';
  } else {
    // Single / Full Width
    containerClass = 'my-4 w-full flex justify-center clear-both';
    figureClass = 'w-full max-w-3xl flex flex-col items-center';
    imgClass = 'w-full max-h-[520px] rounded-2xl shadow-md border border-slate-200/80 object-cover';
  }

  return `
    <div class="${containerClass}" contenteditable="false" data-media-type="image" data-layout="${data.layout}">
      <figure class="${figureClass}">
        <img src="${directUrl}" alt="${altText}" class="${imgClass}" loading="lazy" />
        ${captionHtml}
      </figure>
    </div>
    <p><br></p>
  `.trim();
};

export const MediaUploaderModal: React.FC<MediaUploaderModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
  webAppUrl = '',
  defaultFolderId = ''
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'url'>('upload');

  // Form & Selection State
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageLayout, setImageLayout] = useState<ImageLayoutType>('single');

  // Tab 1: Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [customFileName, setCustomFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2: Gallery state
  const [galleryFiles, setGalleryFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [gallerySearch, setGallerySearch] = useState('');
  const [isDeletingFileId, setIsDeletingFileId] = useState<string | null>(null);

  // Tab 3: URL state
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [urlPreviewStatus, setUrlPreviewStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedImageUrl('');
      setImageCaption('');
      setImageAlt('');
      setImageLayout('single');
      setSelectedFile(null);
      setFilePreview('');
      setCustomFileName('');
      setUploadError('');
      setExternalUrlInput('');
      setUrlPreviewStatus('idle');

      // Auto-load gallery if URL exists and user switches to gallery
      if (webAppUrl && activeTab === 'gallery' && galleryFiles.length === 0) {
        fetchGalleryFiles();
      }
    }
  }, [isOpen]);

  // Load gallery when tab switches to gallery
  useEffect(() => {
    if (isOpen && activeTab === 'gallery' && galleryFiles.length === 0 && webAppUrl) {
      fetchGalleryFiles();
    }
  }, [activeTab, isOpen, webAppUrl]);

  // File selection handler
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Hanya file gambar (JPG, PNG, WebP, GIF) yang didukung.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal adalah 10 MB.');
      return;
    }

    setSelectedFile(file);
    setUploadError('');
    setCustomFileName(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFilePreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Perform upload to Google Apps Script Web App
  const handleUploadToDrive = async () => {
    if (!selectedFile || !filePreview) {
      setUploadError('Silakan pilih file gambar terlebih dahulu.');
      return;
    }

    if (!webAppUrl || !webAppUrl.trim()) {
      setUploadError('URL Google Apps Script belum dikonfigurasi di tab "Kode App Script".');
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg('Menyiapkan file...');
    setUploadError('');

    try {
      // Extract pure base64 data
      const base64Data = filePreview.split(',')[1] || filePreview;
      const fileExt = selectedFile.name.split('.').pop() || 'png';
      const finalFileName = `${customFileName.trim() || 'gambar_materi'}.${fileExt}`;

      setUploadProgressMsg('Mengunggah ke Google Drive...');

      const payload = {
        action: 'upload',
        fileData: base64Data,
        fileName: finalFileName,
        mimeType: selectedFile.type,
        folderId: defaultFolderId || undefined
      };

      const response = await fetch(webAppUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // text/plain avoids CORS preflight blockage in Apps Script
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      const result = await response.json();

      if (result.success && (result.directUrl || result.fileId)) {
        const resolvedUrl = result.directUrl || `https://lh3.googleusercontent.com/d/${result.fileId}`;
        setSelectedImageUrl(resolvedUrl);
        setImageAlt(customFileName || selectedFile.name);
        setUploadProgressMsg('Berhasil diunggah!');
        
        // Add to local gallery cache
        const newFileItem: DriveFileItem = {
          fileId: result.fileId,
          fileName: result.fileName || finalFileName,
          directUrl: resolvedUrl,
          viewUrl: result.viewUrl,
          mimeType: selectedFile.type,
          size: selectedFile.size,
          createdDate: new Date().toISOString()
        };
        setGalleryFiles(prev => [newFileItem, ...prev]);
      } else {
        throw new Error(result.error || result.message || 'Gagal mengunggah file ke Google Drive.');
      }
    } catch (err: any) {
      console.error('Upload to Drive error:', err);
      setUploadError(err.message || 'Gagal menghubungi server Google Apps Script. Pastikan Web App di-deploy dengan akses Anyone.');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch gallery list from Google Drive
  const fetchGalleryFiles = async () => {
    if (!webAppUrl || !webAppUrl.trim()) {
      setGalleryError('URL Google Apps Script belum dikonfigurasi di tab "Kode App Script".');
      return;
    }

    setIsLoadingGallery(true);
    setGalleryError('');

    try {
      const response = await fetch(`${webAppUrl.trim()}?action=list_files&folderId=${encodeURIComponent(defaultFolderId || '')}&limit=60`);
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.files)) {
        setGalleryFiles(data.files);
      } else if (Array.isArray(data)) {
        setGalleryFiles(data);
      } else {
        throw new Error(data.error || 'Format data galeri tidak dikenali.');
      }
    } catch (err: any) {
      console.warn('Fetch gallery error:', err);
      // Fallback: try POST
      try {
        const postRes = await fetch(webAppUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'list_files', folderId: defaultFolderId || undefined })
        });
        const postData = await postRes.json();
        if (postData.success && Array.isArray(postData.files)) {
          setGalleryFiles(postData.files);
          return;
        }
      } catch {}
      setGalleryError('Tidak dapat memuat galeri dari Drive. Pastikan skrip Web App aktif & terhubung.');
    } finally {
      setIsLoadingGallery(false);
    }
  };

  // Delete file from Drive
  const handleDeleteGalleryFile = async (fileItem: DriveFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Yakin ingin memindahkan "${fileItem.fileName}" ke Sampah Google Drive?`)) {
      return;
    }

    setIsDeletingFileId(fileItem.fileId);

    try {
      const response = await fetch(webAppUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete_file', fileId: fileItem.fileId })
      });

      const res = await response.json();
      if (res.success) {
        setGalleryFiles(prev => prev.filter(f => f.fileId !== fileItem.fileId));
        if (selectedImageUrl.includes(fileItem.fileId)) {
          setSelectedImageUrl('');
        }
      } else {
        alert(res.error || 'Gagal menghapus file di Drive.');
      }
    } catch (err: any) {
      alert(`Gagal menghapus file: ${err.message}`);
    } finally {
      setIsDeletingFileId(null);
    }
  };

  // URL Tab: test image load
  const handleTestExternalUrl = () => {
    if (!externalUrlInput.trim()) return;
    const normalized = normalizeMediaImageUrl(externalUrlInput.trim());
    setSelectedImageUrl(normalized);

    const testImg = new Image();
    testImg.onload = () => {
      setUrlPreviewStatus('valid');
    };
    testImg.onerror = () => {
      setUrlPreviewStatus('invalid');
    };
    testImg.src = normalized;
  };

  // Submit and insert
  const handleInsert = () => {
    if (!selectedImageUrl.trim()) {
      alert('Pilih atau masukkan URL gambar terlebih dahulu.');
      return;
    }

    onInsertImage({
      url: selectedImageUrl.trim(),
      caption: imageCaption.trim(),
      layout: imageLayout,
      alt: imageAlt.trim() || imageCaption.trim() || 'Gambar Materi'
    });

    onClose();
  };

  if (!isOpen) return null;

  const filteredGallery = galleryFiles.filter(f => 
    f.fileName.toLowerCase().includes(gallerySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/20 rounded-xl">
              <ImageIcon size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold leading-tight">Pengunggah & Galeri Media Drive</h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Sisipkan gambar ke dalam materi pembelajaran dengan tata letak rapi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'upload'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UploadCloud size={15} />
            <span>1. Unggah ke Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'gallery'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FolderOpen size={15} />
            <span>2. Galeri Media Drive {galleryFiles.length > 0 && `(${galleryFiles.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'url'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Link2 size={15} />
            <span>3. Tautan Langsung / URL</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* TAB 1: UNGGAH KE GOOGLE DRIVE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!webAppUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-800">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold">Google Apps Script belum terhubung:</span>
                    <p className="mt-0.5 text-[11px] text-amber-700">
                      Silakan buka tab <strong>"Kode App Script"</strong> di sidebar Admin untuk menempelkan URL Web App Apps Script.
                    </p>
                  </div>
                </div>
              )}

              {/* File Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                    : filePreview
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {filePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={filePreview}
                      alt="Pratinjau Lokal"
                      className="max-h-40 rounded-xl shadow-md border border-slate-200 object-contain"
                    />
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {selectedFile?.name} ({formatFileSize(selectedFile?.size)}) • Klik untuk ganti file
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        Tarik & Lepaskan gambar ke sini, atau <span className="text-emerald-600 underline">Pilih File</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Mendukung format PNG, JPG, JPEG, WebP, dan GIF (Maks. 10 MB)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {selectedFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama File / Alt Text</label>
                    <AutoResizeTextarea
                      rows={1}
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="Misal: Struktur Daun Monokotil"
                      className="w-full max-w-full min-w-0 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={isUploading || !webAppUrl}
                      onClick={handleUploadToDrive}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{uploadProgressMsg || 'Mengunggah...'}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} />
                          <span>Unggah ke Google Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {selectedImageUrl && !uploadError && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">Gambar siap disisipkan!</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    Google Drive Direct Link
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GALERI MEDIA DRIVE */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <AutoResizeTextarea
                    rows={1}
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="Cari nama gambar di Google Drive..."
                    className="w-full max-w-full min-w-0 pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  disabled={isLoadingGallery || !webAppUrl}
                  onClick={fetchGalleryFiles}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isLoadingGallery ? 'animate-spin' : ''} />
                  <span>Segarkan Galeri</span>
                </button>
              </div>

              {galleryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{galleryError}</span>
                </div>
              )}

              {isLoadingGallery ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                  <p className="text-xs">Memuat daftar file dari Google Drive...</p>
                </div>
              ) : filteredGallery.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <FolderOpen size={32} className="text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">Belum ada gambar di galeri Drive</p>
                  <p className="text-[11px] text-slate-500">
                    Gunakan Tab "Unggah ke Google Drive" untuk menambahkan gambar pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                  {filteredGallery.map((file) => {
                    const isSelected = selectedImageUrl === file.directUrl;
                    const isDeleting = isDeletingFileId === file.fileId;

                    return (
                      <div
                        key={file.fileId}
                        onClick={() => {
                          setSelectedImageUrl(file.directUrl);
                          setImageAlt(file.fileName.replace(/\.[^/.]+$/, ''));
                        }}
                        className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all bg-slate-50 flex flex-col ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="relative aspect-video w-full bg-slate-200 overflow-hidden">
                          <img
                            src={file.directUrl}
                            alt={file.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback thumbnail if direct fails
                              const img = e.currentTarget;
                              if (!img.src.includes('thumbnail')) {
                                img.src = `https://drive.google.com/thumbnail?id=${file.fileId}&sz=w400`;
                              }
                            }}
                          />
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white p-1 rounded-lg shadow-sm">
                              <Check size={12} />
                            </span>
                          )}
                        </div>

                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <p className="font-bold text-slate-800 text-[11px] truncate" title={file.fileName}>
                            {file.fileName}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>{formatFileSize(file.size)}</span>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={(e) => handleDeleteGalleryFile(file, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus gambar dari Drive"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TAUTAN LANGSUNG / URL EKSTERNAL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tempel URL Gambar Eksternal / Google Drive
                </label>
                <div className="flex gap-2">
                  <AutoResizeTextarea
                    rows={1}
                    value={externalUrlInput}
                    onChange={(e) => {
                      setExternalUrlInput(e.target.value);
                      setUrlPreviewStatus('idle');
                    }}
                    placeholder="https://images.unsplash.com/... atau https://drive.google.com/file/d/.../view"
                    className="flex-1 min-w-0 max-w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleTestExternalUrl}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    Cek Gambar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ✨ Link Google Drive biasa akan otomatis dikonversi menjadi direct image renderer (lh3 format).
                </p>
              </div>

              {urlPreviewStatus === 'invalid' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Gambar tidak dapat dimuat dari URL tersebut. Pastikan link dapat diakses publik.</span>
                </div>
              )}

              {selectedImageUrl && urlPreviewStatus === 'valid' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-bold">Gambar valid dan siap digunakan!</span>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* BOTTOM CONFIGURATION: LAYOUT & CAPTION                            */}
          {/* ----------------------------------------------------------------- */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-600" />
              <span>Konfigurasi Format & Tata Letak Penyisipan</span>
            </h4>

            {/* Layout options */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setImageLayout('single')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  imageLayout === 'single'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Maximize2 size={16} className={imageLayout === 'single' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-[11px]">Lebar Penuh</span>
              </button>

              <button
                type="button"
                onClick={() => setImageLayout('grid2')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  imageLayout === 'grid2'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Columns size={16} className={imageLayout === 'grid2' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-[11px]">Grid 2 Kolom</span>
              </button>

              <button
                type="button"
                onClick={() => setImageLayout('grid3')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  imageLayout === 'grid3'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Grid size={16} className={imageLayout === 'grid3' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-[11px]">Grid 3 Kolom</span>
              </button>

              <button
                type="button"
                onClick={() => setImageLayout('floatLeft')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  imageLayout === 'floatLeft'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlignLeft size={16} className={imageLayout === 'floatLeft' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-[11px]">Float Kiri</span>
              </button>

              <button
                type="button"
                onClick={() => setImageLayout('floatRight')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 col-span-2 sm:col-span-1 ${
                  imageLayout === 'floatRight'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlignRight size={16} className={imageLayout === 'floatRight' ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-[11px]">Float Kanan</span>
              </button>
            </div>

            {/* Caption input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Keterangan Gambar / Caption (Opsional)
              </label>
              <AutoResizeTextarea
                rows={1}
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Contoh: Gambar 1.1 Tahapan Pembelahan Sel Mitosis"
                className="w-full max-w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            {/* Live visual preview box */}
            {selectedImageUrl && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-600 text-[11px] block">Pratinjau Hasil Penyisipan:</span>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center max-h-56 overflow-y-auto">
                  <img
                    src={normalizeMediaImageUrl(selectedImageUrl)}
                    alt={imageAlt || imageCaption || 'Pratinjau'}
                    className={`rounded-xl object-contain max-h-40 border border-slate-200 shadow-xs ${
                      imageLayout === 'floatLeft' || imageLayout === 'floatRight' ? 'max-w-[200px]' : 'w-full'
                    }`}
                  />
                  {imageCaption && (
                    <p className="mt-2 text-center text-xs text-slate-500 italic font-serif">
                      {imageCaption}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!selectedImageUrl}
            onClick={handleInsert}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            <span>Sisipkan ke Isi Materi</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
