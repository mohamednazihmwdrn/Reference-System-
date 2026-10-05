import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, ExternalLink, Maximize2 } from 'lucide-react';

interface PhotoLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  imageUrl,
  onClose,
  title,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!imageUrl) return null;

  const handleToggleZoom = () => {
    setZoom((prev) => (prev > 1.2 ? 1 : 2.2));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200">
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between text-white p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent shrink-0 z-20">
        <div className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[50vw]">
          {title || 'معاينة الصورة بالحجم الكامل'}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.4, 4))}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer"
            title="تكبير (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.4, 0.7))}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer"
            title="تصغير (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer"
            title="تدوير الصورة"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-blue-400 transition-all cursor-pointer"
            title="فتح الرابط الأصلي"
          >
            <ExternalLink className="w-5 h-5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white mr-1 shadow-lg transition-all cursor-pointer"
            title="إغلاق (X)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Full-Screen Image Viewport */}
      <div 
        className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 cursor-grab active:cursor-grabbing relative"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onDoubleClick={handleToggleZoom}
      >
        <div
          className="transition-transform duration-150 ease-out origin-center flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={imageUrl}
            alt="Full Preview"
            onClick={handleToggleZoom}
            className="max-h-[88vh] max-w-[98vw] w-auto h-auto object-contain rounded-lg shadow-2xl cursor-pointer"
            title="انقر مرتين للتكبير والتصغير السريع"
          />
        </div>
      </div>

      {/* Bottom Floating Hint */}
      <div className="p-2.5 bg-gradient-to-t from-black/80 to-transparent text-center text-xs text-slate-300 font-medium z-10 flex items-center justify-center gap-3">
        <span>💡 انقر على الصورة للتكبير / التصغير</span>
        <span>·</span>
        <button
          type="button"
          onClick={onClose}
          className="underline hover:text-white font-bold text-red-400 cursor-pointer"
        >
          إغلاق العرض (X)
        </button>
      </div>

    </div>
  );
};
