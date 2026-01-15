
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  FileBox, 
  Languages, 
  Download, 
  Settings2, 
  Info, 
  Zap, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  FileCode, 
  ArrowRight, 
  Edit3, 
  X, 
  Save, 
  Eye, 
  RotateCcw, 
  History,
  Square,
  CheckSquare,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  FileText,
  Terminal
} from 'lucide-react';
import JSZip from 'jszip';
import FileUploader from './components/FileUploader';
import LanguageSelector from './components/LanguageSelector';
import { SupportLanguage, FileToTranslate, LANGUAGE_CODES } from './types';
import { FileService } from './services/fileService';
import { GeminiService } from './services/geminiService';

const STORAGE_KEY = 'mc_addon_translator_progress';

const App: React.FC = () => {
  const [sourceLanguage, setSourceLanguage] = useState<SupportLanguage>(SupportLanguage.AUTO);
  const [targetLanguage, setTargetLanguage] = useState<SupportLanguage>(SupportLanguage.VIETNAMESE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [originalZip, setOriginalZip] = useState<JSZip | null>(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [filesToTranslate, setFilesToTranslate] = useState<FileToTranslate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [tempEditedContent, setTempEditedContent] = useState<string>('');

  const geminiService = useMemo(() => new GeminiService(), []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSourceLanguage(parsed.sourceLanguage || SupportLanguage.AUTO);
        setTargetLanguage(parsed.targetLanguage || SupportLanguage.VIETNAMESE);
        setOriginalFileName(parsed.originalFileName || '');
        setFilesToTranslate(parsed.filesToTranslate || []);
      } catch (e) {
        console.error("Failed to load saved progress", e);
      }
    }
  }, []);

  useEffect(() => {
    if (filesToTranslate.length > 0 || originalFileName) {
      const stateToSave = {
        sourceLanguage,
        targetLanguage,
        originalFileName,
        filesToTranslate
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [sourceLanguage, targetLanguage, originalFileName, filesToTranslate]);

  const filteredFiles = useMemo(() => {
    return filesToTranslate.filter(f => 
      f.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filesToTranslate, searchTerm]);

  const clearProgress = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tiến trình hiện tại và bắt đầu lại không?")) {
      localStorage.removeItem(STORAGE_KEY);
      setOriginalZip(null);
      setOriginalFileName('');
      setFilesToTranslate([]);
      setResultBlob(null);
      setError(null);
      setProgress({ current: 0, total: 0, name: '' });
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setResultBlob(null);
    try {
      const { zip, files } = await FileService.processAddonFile(file);
      setOriginalZip(zip);
      setOriginalFileName(file.name);
      
      if (filesToTranslate.length > 0 && originalFileName === file.name) {
        const mergedFiles = files.map(newFile => {
          const existing = filesToTranslate.find(f => f.path === newFile.path);
          if (existing && existing.status === 'completed') {
            return { ...newFile, translatedContent: existing.translatedContent, status: 'completed' as const, selected: existing.selected };
          }
          return newFile;
        });
        setFilesToTranslate(mergedFiles);
      } else {
        setFilesToTranslate(files);
      }
      
      if (files.length === 0) {
        setError("Không tìm thấy file nào chứa text cần dịch trong addon này.");
      }
    } catch (err) {
      console.error(err);
      setError("Đã có lỗi xảy ra khi đọc file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const translateSingleFile = async (idx: number, list: FileToTranslate[]): Promise<string> => {
    const file = list[idx];
    switch (file.type) {
      case 'lang':
        return await geminiService.translateLangFile(file.content, sourceLanguage, targetLanguage);
      case 'json':
        return await geminiService.translateJsonFile(file.content, sourceLanguage, targetLanguage);
      case 'js':
        // Sử dụng logic dịch Script chuyên sâu cho .js và .ts
        return await geminiService.translateScriptFile(file.content, sourceLanguage, targetLanguage);
      case 'mcfunction':
        return await geminiService.translateMcFunctionFile(file.content, sourceLanguage, targetLanguage);
      case 'txt':
        return await geminiService.translateTextFile(file.content, sourceLanguage, targetLanguage);
      default:
        return file.content;
    }
  };

  const retryFile = async (idx: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    const updatedList = [...filesToTranslate];
    updatedList[idx] = { ...updatedList[idx], status: 'translating' };
    setFilesToTranslate(updatedList);
    try {
      const result = await translateSingleFile(idx, updatedList);
      updatedList[idx] = { ...updatedList[idx], translatedContent: result, status: 'completed' };
      setFilesToTranslate([...updatedList]);
      if (originalZip && updatedList.filter(f => f.selected).every(f => f.status === 'completed')) {
        await packageAddon(updatedList);
      }
    } catch (err) {
      updatedList[idx] = { ...updatedList[idx], status: 'error' };
      setFilesToTranslate([...updatedList]);
      setError(`Lỗi khi dịch: ${updatedList[idx].path}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startTranslation = async () => {
    const selectedFiles = filesToTranslate.filter(f => f.selected);
    const filesToProcess = selectedFiles.filter(f => f.status !== 'completed');
    if (selectedFiles.length === 0 || !originalZip) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: filesToProcess.length, name: '' });
    const updatedList: FileToTranslate[] = [...filesToTranslate];
    try {
      let currentProgressCount = 0;
      for (let i = 0; i < updatedList.length; i++) {
        if (!updatedList[i].selected || updatedList[i].status === 'completed') continue;
        currentProgressCount++;
        setProgress(prev => ({ ...prev, current: currentProgressCount, name: updatedList[i].path }));
        try {
          const result = await translateSingleFile(i, updatedList);
          updatedList[i] = { ...updatedList[i], translatedContent: result, status: 'completed' };
        } catch (fileErr) {
          updatedList[i] = { ...updatedList[i], status: 'error' };
        }
        setFilesToTranslate([...updatedList]);
      }
      if (updatedList.some(f => f.status === 'completed')) await packageAddon(updatedList);
      const errorsCount = updatedList.filter(f => f.selected && f.status === 'error').length;
      if (errorsCount > 0) setError(`Xong với ${errorsCount} file lỗi.`);
    } catch (err) {
      setError("Đã có lỗi hệ thống.");
    } finally {
      setIsProcessing(false);
    }
  };

  const packageAddon = async (list: FileToTranslate[]) => {
    if (!originalZip) return;
    const blob = await FileService.generateTranslatedAddon(
      originalZip,
      list,
      originalFileName,
      LANGUAGE_CODES[targetLanguage]
    );
    setResultBlob(blob);
  };

  const toggleFileSelection = (path: string) => {
    if (isProcessing) return;
    const idx = filesToTranslate.findIndex(f => f.path === path);
    if (idx === -1) return;
    const newList = [...filesToTranslate];
    newList[idx] = { ...newList[idx], selected: !newList[idx].selected };
    setFilesToTranslate(newList);
  };

  const toggleAllVisibleSelection = () => {
    if (isProcessing) return;
    const allVisibleSelected = filteredFiles.every(f => f.selected);
    const newList = filesToTranslate.map(f => {
      const isVisible = filteredFiles.some(ff => ff.path === f.path);
      if (isVisible) return { ...f, selected: !allVisibleSelected };
      return f;
    });
    setFilesToTranslate(newList);
  };

  const openEditor = (path: string) => {
    const idx = filesToTranslate.findIndex(f => f.path === path);
    if (idx === -1) return;
    setEditingFileIndex(idx);
    setTempEditedContent(filesToTranslate[idx].translatedContent || '');
  };

  const saveEdit = async () => {
    if (editingFileIndex === null) return;
    const newList = [...filesToTranslate];
    newList[editingFileIndex] = { ...newList[editingFileIndex], translatedContent: tempEditedContent, status: 'completed' };
    setFilesToTranslate(newList);
    setEditingFileIndex(null);
    if (originalZip && newList.filter(f => f.selected).every(f => f.status === 'completed')) {
      await packageAddon(newList);
    }
  };

  const downloadResult = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    const ext = originalFileName.split('.').pop();
    a.download = `${baseName}_${targetLanguage}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allVisibleSelected = filteredFiles.length > 0 && filteredFiles.every(f => f.selected);
  const someSelected = filesToTranslate.some(f => f.selected);
  const hasUnsavedProgress = filesToTranslate.length > 0 && !originalZip;
  const errorFilesCount = filesToTranslate.filter(f => f.selected && f.status === 'error').length;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'json': return <FileCode size={18} />;
      case 'lang': return <Languages size={18} />;
      case 'js': return <FileCode size={18} className="text-yellow-400" />;
      case 'mcfunction': return <Terminal size={18} className="text-emerald-400" />;
      case 'txt': return <FileText size={18} className="text-slate-400" />;
      default: return <FileBox size={18} />;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 text-slate-200">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Zap className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">MCPE Addon Translator</h1>
            <p className="text-slate-400 text-sm">Dịch trực tiếp trong Script & Commands</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {filesToTranslate.length > 0 && (
            <button onClick={clearProgress} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors">
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 text-sm">
            <Info size={14} /> Gemini 3 Flash
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-6">
              <Settings2 size={20} className="text-emerald-500" /> Cấu hình
            </h2>
            <div className="flex flex-col gap-6">
              <LanguageSelector label="Từ" selected={sourceLanguage} onChange={setSourceLanguage} allowAuto={true} />
              <div className="flex justify-center -my-2 text-slate-600"><ArrowRight size={20} className="rotate-90 lg:rotate-0" /></div>
              <LanguageSelector label="Sang" selected={targetLanguage} onChange={setTargetLanguage} />
              
              {!originalZip ? (
                <div className="space-y-4">
                  {hasUnsavedProgress && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2 text-amber-200 text-xs">
                      <History size={16} className="shrink-0" />
                      <p>Khôi phục tiến trình. Hãy tải lại file <b>{originalFileName}</b>.</p>
                    </div>
                  )}
                  <FileUploader onFileSelect={handleFileSelect} isLoading={isProcessing} />
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileBox className="text-emerald-400 shrink-0" size={24} />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate">{originalFileName}</p>
                      <p className="text-xs text-slate-500">Addon đã sẵn sàng</p>
                    </div>
                  </div>
                  <button onClick={() => { setOriginalZip(null); setOriginalFileName(''); setFilesToTranslate([]); setProgress({current:0,total:0,name:''}); setResultBlob(null); localStorage.removeItem(STORAGE_KEY); }} className="text-slate-500 hover:text-red-400">
                    <X size={20} />
                  </button>
                </div>
              )}

              {originalZip && !resultBlob && (
                <button disabled={isProcessing || !someSelected} onClick={startTranslation} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Languages size={20} />}
                  {isProcessing ? 'Đang dịch...' : 'Bắt đầu dịch'}
                </button>
              )}

              {resultBlob && (
                <button onClick={downloadResult} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                  <Download size={20} /> Tải về Addon đã dịch
                </button>
              )}
            </div>
          </section>

          {error && (
            <div className={`rounded-xl p-4 flex gap-3 text-sm border ${errorFilesCount > 0 ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-red-500/10 border-red-500/50 text-red-200'}`}>
              <AlertCircle size={20} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">File có thể dịch ({filesToTranslate.length})</h2>
                {filesToTranslate.length > 0 && (
                  <button onClick={toggleAllVisibleSelection} disabled={isProcessing} className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 disabled:opacity-50">
                    {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />} {allVisibleSelected ? 'Bỏ chọn' : 'Chọn hết'}
                  </button>
                )}
              </div>
              
              {filesToTranslate.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" placeholder="Tìm theo tên file hoặc thư mục..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none" />
                </div>
              )}
            </div>

            {filesToTranslate.length > 0 ? (
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[550px] scrollbar-thin scrollbar-thumb-slate-700">
                {filteredFiles.map((file) => (
                  <div key={file.path} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${file.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' : file.status === 'error' ? 'bg-red-500/10 border-red-500/30' : file.selected ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <button onClick={() => toggleFileSelection(file.path)} disabled={isProcessing} className="text-emerald-500">
                        {file.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <span className={file.status === 'completed' ? 'text-emerald-400' : 'text-slate-500'}>{getFileIcon(file.type)}</span>
                      <div className="overflow-hidden">
                        <span className="text-sm font-mono block truncate" title={file.path}>{file.path}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{file.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {file.status === 'completed' ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditor(file.path)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><Edit3 size={16} /></button>
                          <CheckCircle className="text-emerald-500" size={16} />
                        </div>
                      ) : file.status === 'error' ? (
                        <button onClick={() => retryFile(filesToTranslate.findIndex(f => f.path === file.path))} className="p-1.5 bg-red-500/20 rounded-lg text-red-400" disabled={isProcessing}><RefreshCw size={16} /></button>
                      ) : (
                        file.status === 'pending' && isProcessing && progress.name === file.path && <Loader2 className="text-emerald-500 animate-spin" size={16} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50 text-center">
                <Filter size={48} />
                <p>Hệ thống hỗ trợ dịch "sạch" trong file code.<br/>Giữ nguyên cú pháp, chỉ dịch lời thoại.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Editor Modal */}
      {editingFileIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <Eye className="text-emerald-500" size={20} />
                <h3 className="font-semibold truncate">So sánh bản dịch</h3>
              </div>
              <button onClick={() => setEditingFileIndex(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X size={20} /></button>
            </div>
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
              <div className="flex flex-col gap-2 overflow-hidden">
                <label className="text-xs font-bold text-slate-500 uppercase">Gốc ({filesToTranslate[editingFileIndex].type})</label>
                <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-[11px] text-slate-400 overflow-auto border border-slate-800 whitespace-pre">
                  {filesToTranslate[editingFileIndex].content}
                </div>
              </div>
              <div className="flex flex-col gap-2 overflow-hidden">
                <label className="text-xs font-bold text-emerald-500 uppercase">Dịch ({targetLanguage})</label>
                <textarea value={tempEditedContent} onChange={(e) => setTempEditedContent(e.target.value)} className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-[11px] text-white overflow-auto border border-emerald-500/30 outline-none resize-none whitespace-pre" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button onClick={() => setEditingFileIndex(null)} className="px-4 py-2 text-sm text-slate-400">Hủy</button>
              <button onClick={saveEdit} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"><Save size={18} /> Lưu & Áp dụng</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-8 text-center text-slate-600 text-[10px] border-t border-slate-900">
        <p>Tối ưu hóa dịch thuật: Bảo vệ code (JavaScript/TypeScript), chỉ dịch nội dung hiển thị.</p>
      </footer>
    </div>
  );
};

export default App;
