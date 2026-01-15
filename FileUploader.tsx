
import React, { useRef, useState } from 'react';
import { Upload, FileCode, CheckCircle2 } from 'lucide-react';

interface Props {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUploader: React.FC<Props> = ({ onFileSelect, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
        dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/50'
      } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.mcpack,.mcaddon"
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-slate-300">
          <Upload size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Tải lên Addon Minecraft</h3>
          <p className="text-slate-400 text-sm mt-1">
            Hỗ trợ .zip, .mcpack, .mcaddon
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg"
        >
          Chọn file
        </button>
      </div>
    </div>
  );
};

export default FileUploader;
