import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  UploadCloud,
  HelpCircle,
  Sparkles,
  Link2,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldCheck,
  Play
} from 'lucide-react';
import { AppSettings } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE, APPS_SCRIPT_DEPLOY_STEPS } from '../utils/appsScriptCode';

interface AdminAppScriptManagerProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => Promise<void>;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminAppScriptManager: React.FC<AdminAppScriptManagerProps> = ({
  settings,
  onSaveSettings,
  showNotification
}) => {
  const [scriptUrlInput, setScriptUrlInput] = useState<string>(
    settings.driveUploadScriptUrl || settings.googleAppsScriptUrl || ''
  );
  const [folderIdInput, setFolderIdInput] = useState<string>(
    settings.driveFolderId || ''
  );

  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const [showCodeDetails, setShowCodeDetails] = useState(true);

  // Copy full Code.gs script to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setIsCopiedCode(true);
      showNotification('Kode Google Apps Script berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setIsCopiedCode(false), 3000);
    } catch (err) {
      showNotification('Gagal menyalin kode ke clipboard.', 'error');
    }
  };

  // Test Web App URL with Ping action
  const handleTestConnection = async () => {
    if (!scriptUrlInput || !scriptUrlInput.trim()) {
      showNotification('Harap masukkan URL Web App Google Apps Script terlebih dahulu.', 'error');
      setTestStatus({
        type: 'error',
        message: 'URL Web App tidak boleh kosong.'
      });
      return;
    }

    if (!scriptUrlInput.trim().startsWith('https://script.google.com/')) {
      showNotification('Format URL tidak valid. URL harus dimulai dengan "https://script.google.com/macros/s/.../exec"', 'error');
      setTestStatus({
        type: 'error',
        message: 'Format URL harus merupakan link Web App Google Apps Script (/exec).'
      });
      return;
    }

    setIsTesting(true);
    setTestStatus({ type: 'idle', message: 'Menghubungi server Google Apps Script...' });

    try {
      const pingUrl = `${scriptUrlInput.trim()}${scriptUrlInput.includes('?') ? '&' : '?'}action=ping`;
      const res = await fetch(pingUrl);
      const data = await res.json();

      if (data && (data.success || data.status === 'ok' || data.status === 'online')) {
        setTestStatus({
          type: 'success',
          message: 'Koneksi Berhasil! Google Apps Script online dan siap menerima file gambar ke Drive.'
        });
        showNotification('Koneksi Google Apps Script terverifikasi aktif!', 'success');
      } else {
        throw new Error(data.error || data.message || 'Respon dari script tidak sesuai.');
      }
    } catch (err: any) {
      console.warn('Apps Script test connection error:', err);
      setTestStatus({
        type: 'error',
        message: `Gagal terhubung: ${err.message || 'Pastikan opsi "Who has access" diatur ke "Anyone" saat Deployment'}.`
      });
      showNotification('Gagal menghubungi Web App. Periksa konfigurasi deploy Apps Script.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Save settings to Firebase
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedSettings: AppSettings = {
        ...settings,
        googleAppsScriptUrl: scriptUrlInput.trim(),
        driveUploadScriptUrl: scriptUrlInput.trim(),
        driveFolderId: folderIdInput.trim()
      };

      await onSaveSettings(updatedSettings);
      showNotification('Konfigurasi Google Apps Script berhasil disimpan ke Firebase!', 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Code2 size={20} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Integrasi Google Apps Script (Drive Media Uploader)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi backend Google Drive untuk mengunggah gambar materi, kelola galeri cloud, dan simpan link otomatis ke Firebase.
          </p>
        </div>

        <a
          href="https://script.google.com/home/start"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ExternalLink size={14} />
          <span>Buka Google Apps Script</span>
        </a>
      </div>

      {/* SECTION 1: URL CONFIGURATION & TEST CONNECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Link2 size={16} className="text-indigo-600" />
          <span>Pengaturan Link Web App Google Apps Script</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              URL Web App Apps Script (Wajib berakhiran <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/exec</code>)
            </label>
            <input
              type="url"
              value={scriptUrlInput}
              onChange={(e) => setScriptUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Dihasilkan setelah Anda memilih menu <strong>Deploy &gt; New deployment &gt; Web App</strong> di Apps Script.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ID Folder Google Drive (Opsional)
            </label>
            <input
              type="text"
              value={folderIdInput}
              onChange={(e) => setFolderIdInput(e.target.value)}
              placeholder="Contoh: 15u_RpWrMHwTRDau0H..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Biarkan kosong jika ingin otomatis membuat folder bernama <code>App_Media_Uploads</code> di Drive.
            </p>
          </div>
        </div>

        {/* Test Result Message */}
        {testStatus.type !== 'idle' && (
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${
              testStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {testStatus.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-semibold">{testStatus.message}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isTesting || !scriptUrlInput}
            onClick={handleTestConnection}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Play size={13} className={isTesting ? 'animate-spin' : 'text-indigo-600'} />
            <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi (Test Ping)'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Menyimpan ke Firebase...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Simpan ke Firebase</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: STEP-BY-STEP DEPLOYMENT GUIDE */}
      <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <span>Panduan Langkah Penerapan (Deployment Guide)</span>
          </h3>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
            6 Langkah Mudah
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {APPS_SCRIPT_DEPLOY_STEPS.map((step) => (
            <div
              key={step.step}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {step.step}
                </span>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">
                  {step.title}
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: CODE.GS FULL SCRIPT VIEWER WITH COPY BUTTON */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Code Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FileCode size={16} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Code.gs — Kode Google Apps Script Lengkap
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                JavaScript / Google Apps Script Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {isCopiedCode ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Salin Seluruh Kode Script</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowCodeDetails(!showCodeDetails)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title={showCodeDetails ? 'Sembunyikan Kode' : 'Tampilkan Kode'}
            >
              {showCodeDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Code Block Container */}
        {showCodeDetails && (
          <div className="p-4 sm:p-5 overflow-x-auto max-h-[480px] overflow-y-auto font-mono text-[11px] sm:text-xs leading-relaxed bg-slate-950/50">
            <pre className="text-emerald-300 selection:bg-indigo-600 selection:text-white">
              <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
