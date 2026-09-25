import React, { useState } from 'react';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Link2,
  FolderOpen,
  Play,
  X,
  FileCode,
  Sparkles
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

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Salin Kode Code.gs
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

  // Test Web App Connection
  const handleTestConnection = async () => {
    if (!scriptUrlInput || !scriptUrlInput.trim()) {
      showNotification('Harap masukkan URL Web App Google Apps Script.', 'error');
      setTestStatus({
        type: 'error',
        message: 'URL Web App tidak boleh kosong.'
      });
      return;
    }

    if (!scriptUrlInput.trim().startsWith('https://script.google.com/')) {
      showNotification('Format URL tidak valid. Harus diawali "https://script.google.com/..."', 'error');
      setTestStatus({
        type: 'error',
        message: 'Format URL harus link Web App Google Apps Script (/exec).'
      });
      return;
    }

    setIsTesting(true);
    setTestStatus({ type: 'idle', message: 'Menghubungi server Apps Script...' });

    try {
      const pingUrl = `${scriptUrlInput.trim()}${scriptUrlInput.includes('?') ? '&' : '?'}action=ping`;
      const res = await fetch(pingUrl);
      const data = await res.json();

      if (data && (data.success || data.status === 'ok' || data.status === 'online')) {
        setTestStatus({
          type: 'success',
          message: 'Koneksi Berhasil! Google Apps Script aktif dan siap digunakan.'
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
      showNotification('Gagal menghubungi Web App.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Simpan Pengaturan
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
      showNotification('Konfigurasi Google Apps Script berhasil disimpan!', 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header Minimalis */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Code2 size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-800">Google Apps Script</h2>
            <p className="text-xs text-slate-500">Integrasi Drive Upload & Media Galeri</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Petunjuk Pop-up Modal */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Petunjuk Deployment"
          >
            <HelpCircle size={15} className="text-indigo-600" />
            <span className="hidden sm:inline">Petunjuk</span>
          </button>

          {/* External Link */}
          <a
            href="https://script.google.com/home/start"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Buka Google Apps Script Console"
          >
            <ExternalLink size={15} />
            <span className="hidden sm:inline">Buka Apps Script</span>
          </a>
        </div>
      </div>

      {/* Card Utama Form Konfigurasi */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL Web App (<code className="text-indigo-600 font-mono text-[11px]">/exec</code>)
            </label>
            <AutoResizeTextarea
              rows={1}
              value={scriptUrlInput}
              onChange={(e) => setScriptUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full max-w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ID Folder Google Drive (Opsional)
            </label>
            <AutoResizeTextarea
              rows={1}
              value={folderIdInput}
              onChange={(e) => setFolderIdInput(e.target.value)}
              placeholder="15u_RpWrMHwTRDau0H..."
              className="w-full max-w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
            />
          </div>
        </div>

        {/* Test Connection Alert */}
        {testStatus.type !== 'idle' && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              testStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testStatus.type === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
            )}
            <span>{testStatus.message}</span>
          </div>
        )}

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting || !scriptUrlInput}
              onClick={handleTestConnection}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play size={13} className={isTesting ? 'animate-spin' : 'text-indigo-600'} />
              <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isCopiedCode ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span>Kode Tersalin</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-slate-600" />
                  <span>Salin Kode Script</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCodeModalOpen(true)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs transition-all cursor-pointer"
              title="Lihat Kode Script Lengkap"
            >
              <FileCode size={15} />
            </button>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* MODAL POPUP PETUNJUK DEPLOYMENT */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Petunjuk Deployment Google Apps Script</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {APPS_SCRIPT_DEPLOY_STEPS.map((step) => (
                <div key={step.step} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {step.step}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800">{step.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW CODE.GS */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-100 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl border border-slate-800 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-white font-mono">Code.gs</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Salin Kode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-slate-900 rounded-xl font-mono text-[11px] leading-relaxed text-emerald-300">
              <pre><code>{GOOGLE_APPS_SCRIPT_CODE}</code></pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
