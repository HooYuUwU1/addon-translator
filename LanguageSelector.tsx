
import React from 'react';
import { SupportLanguage } from '../types';

interface Props {
  label: string;
  selected: SupportLanguage;
  onChange: (lang: SupportLanguage) => void;
  allowAuto?: boolean;
}

const LanguageSelector: React.FC<Props> = ({ label, selected, onChange, allowAuto = false }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400">{label}</label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as SupportLanguage)}
        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
      >
        {Object.values(SupportLanguage).map((lang) => {
          if (lang === SupportLanguage.AUTO && !allowAuto) return null;
          return (
            <option key={lang} value={lang}>
              {lang}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default LanguageSelector;
