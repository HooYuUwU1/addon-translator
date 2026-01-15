
import JSZip from 'jszip';
import { FileToTranslate } from '../types';

export class FileService {
  static async processAddonFile(file: File): Promise<{ zip: JSZip; files: FileToTranslate[] }> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const filesToTranslate: FileToTranslate[] = [];

    const entries = Object.keys(loadedZip.files);

    for (const path of entries) {
      const entry = loadedZip.files[path];
      if (entry.dir) continue;

      const extension = path.split('.').pop()?.toLowerCase();
      
      // Bỏ qua các file binary chắc chắn không chứa text cần dịch
      if (['png', 'tga', 'wav', 'ogg', 'fsb', 'bin', 'dat', 'pyc'].includes(extension || '')) continue;

      const content = await entry.async('string');

      if (extension === 'lang') {
        filesToTranslate.push({ path, content, type: 'lang', status: 'pending', selected: true });
      } else if (extension === 'json' || extension === 'json5') {
        // Kiểm tra xem JSON có chứa các từ khóa hiển thị không
        const textKeywords = [
          '"name"', '"description"', '"display_name"', '"text"', '"label"', 
          '"title"', '"subtitle"', '"value"', '"header"', '"footer"',
          '"rawtext"', '"translate"'
        ];
        const isManifest = path.toLowerCase().endsWith('manifest.json');
        const hasDisplayText = textKeywords.some(kw => content.includes(kw));
                             
        if (isManifest || hasDisplayText) {
          filesToTranslate.push({ path, content, type: 'json', status: 'pending', selected: true });
        }
      } else if (extension === 'js' || extension === 'ts') {
        // Scripts thường chứa thông báo hoặc tên item trong code
        if (content.includes("'") || content.includes('"') || content.includes('`')) {
          filesToTranslate.push({ path, content, type: 'js', status: 'pending', selected: true });
        }
      } else if (extension === 'mcfunction') {
        // Commands chứa /say, /tellraw, /titleraw có text hiển thị
        if (content.includes('say ') || content.includes('rawtext') || content.includes('#')) {
          filesToTranslate.push({ path, content, type: 'mcfunction', status: 'pending', selected: true });
        }
      } else if (extension === 'txt' || extension === 'md') {
        // Tài liệu hướng dẫn hoặc credits
        if (content.trim().length > 0) {
          filesToTranslate.push({ path, content, type: 'txt', status: 'pending', selected: true });
        }
      }
    }

    return { zip: loadedZip, files: filesToTranslate };
  }

  static async generateTranslatedAddon(
    originalZip: JSZip, 
    translatedFiles: FileToTranslate[], 
    originalFileName: string,
    targetLangCode: string
  ): Promise<Blob> {
    const newZip = new JSZip();
    
    // Copy toàn bộ file gốc
    const paths = Object.keys(originalZip.files);
    for (const path of paths) {
      const file = originalZip.files[path];
      if (file.dir) {
        newZip.folder(path);
      } else {
        const content = await file.async('uint8array');
        newZip.file(path, content);
      }
    }

    // Ghi đè các file đã dịch
    for (const f of translatedFiles) {
      if (f.translatedContent && f.status === 'completed') {
        let targetPath = f.path;
        // Tự động tạo file .lang mới tương ứng với mã ngôn ngữ đích nếu nằm trong texts/
        if (f.path.includes('texts/') && f.path.endsWith('.lang')) {
          const dir = f.path.substring(0, f.path.lastIndexOf('/') + 1);
          targetPath = `${dir}${targetLangCode}.lang`;
        }
        newZip.file(targetPath, f.translatedContent);
      }
    }

    return await newZip.generateAsync({ type: 'blob' });
  }
}
