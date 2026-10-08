/**
 * AlphaQuant AI - Profile Photo & Avatar Selector Modal
 * Supports:
 * 1. Google Play Games style system avatars with categories, preview & one-click selection
 * 2. Upload custom photo (drag & drop, canvas auto-compression, instant preview)
 * 3. Reset to default avatar
 * Fully optimized for both Dark and Light modes.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Check,
  Sparkles,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { SYSTEM_AVATARS, AVATAR_CATEGORIES, SystemAvatar } from '../assets/avatars';
import avatarDefaultImg from '../assets/images/avatar_lead_quant_1791318574843.jpg';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  onSaveAvatar: (avatarUrl: string | undefined) => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSaveAvatar
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'upload'>('system');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Track currently chosen avatar or uploaded preview
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string>(currentAvatarUrl || '');
  const [selectedAvatarMeta, setSelectedAvatarMeta] = useState<SystemAvatar | null>(null);

  // Upload state
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedAvatarUri(currentAvatarUrl || '');
      // Try to find if current avatar matches any system avatar
      const match = SYSTEM_AVATARS.find(a => a.svgDataUri === currentAvatarUrl);
      setSelectedAvatarMeta(match || SYSTEM_AVATARS[0]);
      setUploadPreview(null);
      setUploadError(null);
    }
  }, [isOpen, currentAvatarUrl]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtered avatars
  const filteredAvatars = selectedCategory === 'all'
    ? SYSTEM_AVATARS
    : SYSTEM_AVATARS.filter(a => a.category === selectedCategory);

  // Handle system avatar click
  const handleSelectSystemAvatar = (avatar: SystemAvatar) => {
    setSelectedAvatarUri(avatar.svgDataUri);
    setSelectedAvatarMeta(avatar);
  };

  // Image processing & canvas resizing to keep storage efficient
  const processImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, or GIF).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to crop to square and downscale to 256x256
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setUploadPreview(e.target?.result as string);
          return;
        }

        // Calculate center square crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setUploadPreview(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplySelection = () => {
    if (activeTab === 'system') {
      onSaveAvatar(selectedAvatarUri || undefined);
    } else {
      if (uploadPreview) {
        onSaveAvatar(uploadPreview);
      }
    }
    onClose();
  };

  const handleResetToDefault = () => {
    onSaveAvatar(undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                Profile Photo & Avatar
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose a Google Play Games style persona or upload your own profile image.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-2 bg-slate-50 dark:bg-slate-950/40 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Play Games Avatars</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono">
              {SYSTEM_AVATARS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'system' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid + Live Preview Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Avatars Grid */}
                <div className="lg:col-span-2 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto p-1 pr-2">
                  {filteredAvatars.map(avatar => {
                    const isSelected = selectedAvatarUri === avatar.svgDataUri;
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => handleSelectSystemAvatar(avatar)}
                        className={`group relative p-2 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500 shadow-md scale-102'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm shrink-0 transition-transform group-hover:scale-105">
                          <img
                            src={avatar.svgDataUri}
                            alt={avatar.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate w-full">
                          {avatar.name}
                        </span>

                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Live Preview Card */}
                {selectedAvatarMeta && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Active Selection Preview
                    </div>

                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-cyan-500/30 shadow-lg shrink-0">
                        <img
                          src={selectedAvatarUri || selectedAvatarMeta.svgDataUri}
                          alt={selectedAvatarMeta.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white font-display">
                          {selectedAvatarMeta.name}
                        </h4>
                        <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-800">
                          {selectedAvatarMeta.category.toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                          {selectedAvatarMeta.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Ready to apply to your profile</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>

                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  Click to select photo or drag and drop
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Supports PNG, JPG, WebP or GIF up to 8MB. Auto-cropped to square.
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Uploaded Preview */}
              {uploadPreview && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-cyan-500 shadow-md shrink-0">
                      <img src={uploadPreview} alt="Uploaded Preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Custom Photo Ready
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" />
                        <span>Optimized for profile & terminal display</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUploadPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    Clear Photo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default Avatar</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApplySelection}
              disabled={activeTab === 'upload' && !uploadPreview}
              className={`px-5 py-2 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                activeTab === 'upload' && !uploadPreview
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apply to Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
