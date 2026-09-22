import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Link2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  CheckCircle2,
  FileImage,
} from 'lucide-react';
import { uploadImageToSupabase } from '../lib/supabaseStorage';

export interface DualImageInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  placeholder?: string;
  bucketName?: string;
  helperText?: string;
  className?: string;
}

export const DualImageInput: React.FC<DualImageInputProps> = ({
  id,
  label = 'Image',
  value,
  onChange,
  required = false,
  placeholder = 'https://images.unsplash.com/... or paste image URL',
  bucketName = 'product-images',
  helperText,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset image load error whenever value changes
  const handleUrlChange = (newUrl: string) => {
    setImageLoadError(false);
    setUploadError(null);
    setUploadSuccess(false);
    onChange(newUrl);
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);
    setImageLoadError(false);

    // Validate file type
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') || validExtensions.includes(ext);

    if (!isImage) {
      setUploadError('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImageToSupabase(file, bucketName);
      if (result.error) {
        // If Supabase Storage is not set up or offline, load as data URL for instant preview and local storage
        if (file.size <= 3 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
              onChange(dataUrl);
              setUploadSuccess(true);
              setTimeout(() => setUploadSuccess(false), 4000);
            }
          };
          reader.readAsDataURL(file);
          setUploadError(`${result.error} (Image loaded locally as Data URL)`);
        } else {
          setUploadError(result.error);
        }
      } else if (result.url) {
        onChange(result.url);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4000);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload image. Please try pasting a direct image URL.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const triggerFileBrowser = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const hasValue = Boolean(value && value.trim());

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Label and Status */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[#47423B] font-bold text-xs uppercase tracking-wide">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {hasValue && (
            <span className="text-[11px] text-[#7A746B] flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
              Image Set
            </span>
          )}
        </div>
      )}

      {/* Main Dual-Mode Container */}
      <div className="border border-[#D5CEC2] bg-[#FAF8F5] rounded-lg p-3 space-y-3">
        {/* Mode 1: Paste Direct URL */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#595349] uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#C89B4A]" /> Option 1: Direct Image URL
            </span>
            {hasValue && (
              <button
                type="button"
                onClick={() => handleUrlChange('')}
                className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-0.5 font-medium cursor-pointer"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id={id}
              type="url"
              value={value}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder}
              required={required && !hasValue}
              className="w-full pl-3 pr-8 py-2 bg-white border border-[#D5CEC2] rounded text-xs text-[#141414] font-mono focus:border-[#C89B4A] focus:outline-hidden transition-colors"
            />
            {hasValue && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                title="Open image in new tab"
                className="absolute right-2.5 top-2 text-[#7A746B] hover:text-[#141414]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-0.5 items-center">
          <div className="grow border-t border-[#E3DBD0]"></div>
          <span className="shrink mx-2 text-[10px] font-bold text-[#8C857B] uppercase tracking-widest bg-[#FAF8F5] px-2">
            Or Upload Image
          </span>
          <div className="grow border-t border-[#E3DBD0]"></div>
        </div>

        {/* Mode 2: Drag & Drop Zone + Browse Button */}
        <div>
          {/* Hidden standard file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={onFileInputChange}
            disabled={isUploading}
            className="hidden"
          />

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={triggerFileBrowser}
            className={`relative border-2 border-dashed rounded-lg p-3 sm:p-4 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#C89B4A] bg-[#F7F2E7]'
                : 'border-[#D5CEC2] hover:border-[#C89B4A] bg-white'
            } ${isUploading ? 'opacity-75 cursor-wait' : ''}`}
          >
            {isUploading ? (
              <div className="py-2 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-[#C89B4A] animate-spin" />
                <p className="text-xs font-semibold text-[#141414]">
                  Uploading to Supabase Storage...
                </p>
                <p className="text-[10px] text-[#7A746B]">
                  Storing image in bucket "{bucketName}"
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F5F1EA] flex items-center justify-center text-[#C89B4A] shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs text-[#141414]">
                    <span className="hidden sm:inline text-[#595349]">Drag & drop image here, or</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerFileBrowser();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141414] text-white text-[11px] font-semibold uppercase tracking-wider rounded hover:bg-[#C89B4A] hover:text-[#141414] transition-all cursor-pointer shadow-xs"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      Browse File
                    </button>
                    <span className="text-[11px] text-[#7A746B] sm:hidden">(Tap to select from phone)</span>
                  </div>
                  <p className="text-[10px] text-[#8C857B] mt-1">
                    Accepts JPG, PNG, WEBP (up to 10MB). Automatically populates image URL.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Success Banner */}
        {uploadSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Image uploaded to Supabase Storage successfully!</span>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Upload failed</p>
              <p className="text-[11px] text-red-600 mt-0.5">{uploadError}</p>
            </div>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image Preview Thumbnail */}
        {hasValue && (
          <div className="pt-2 border-t border-[#E3DBD0] flex items-center gap-3">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-[#D5CEC2] rounded-md overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
              {imageLoadError ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-amber-50 text-amber-700">
                  <AlertCircle className="w-4 h-4 mb-0.5" />
                  <span className="text-[9px] leading-tight">Preview error</span>
                </div>
              ) : (
                <img
                  src={value}
                  alt="Thumbnail Preview"
                  onError={() => setImageLoadError(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#EAE4D9] text-[#47423B] rounded">
                  {value.includes('supabase') ? 'Supabase Storage' : 'Direct Link'}
                </span>
                <span className="text-[11px] text-[#7A746B]">
                  {imageLoadError ? 'Could not load image preview' : 'Preview active'}
                </span>
              </div>
              <p className="text-[11px] text-[#47423B] truncate font-mono mt-1" title={value}>
                {value}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#C89B4A] hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> View full
                </a>
                <button
                  type="button"
                  onClick={() => handleUrlChange('')}
                  className="text-[11px] font-semibold text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {helperText && (
          <p className="text-[11px] text-[#7A746B]">{helperText}</p>
        )}
      </div>
    </div>
  );
};
