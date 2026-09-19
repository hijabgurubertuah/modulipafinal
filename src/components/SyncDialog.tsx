import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  CloudDownload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  BookOpen, 
  HelpCircle, 
  Gamepad2, 
  HardDrive, 
  X,
  Send,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { syncService, SyncStatus } from '../services/syncService';
import { AppSettings, AppModule } from '../types';

interface SyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (data: { modules?: AppModule[]; settings?: AppSettings }) => void;
}

export const SyncDialog: React.FC<SyncDialogProps> = ({ isOpen, onClose, onSyncComplete }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSyncStatus(syncService.getSyncStatus());
      setResultMessage(null);
      setProgressPercent(0);
      setCurrentStep('');
    }
  }, [isOpen]);

  const handleStartSync = async () => {
    setIsSyncing(true);
    setResultMessage(null);
    setProgressPercent(10);
    setCurrentStep('Menghubungkan ke server...');

    try {
      const result = await syncService.checkAndSyncFromCloud((step, pct) => {
        setCurrentStep(step);
        setProgressPercent(pct);
      });

      setSyncStatus(syncService.getSyncStatus());
      
      if (result.success) {
        setResultMessage({
          type: 'success',
          text: result.message
        });
        if (onSyncComplete) {
          // Trigger parent refresh
          onSyncComplete({});
        }
      } else {
        setResultMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: `Terjadi kendala: ${err?.message || 'Gagal tersambung'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFlushPendingOnly = async () => {
    setIsSyncing(true);
    try {
      const res = await syncService.flushPendingScores((msg) => setCurrentStep(msg));
      setSyncStatus(syncService.getSyncStatus());
      setResultMessage({
        type: 'success',
        text: `Berhasil mengirimkan ${res.count} nilai kuis ke Firebase Cloud!`
      });
    } catch (e: any) {
      setResultMessage({
        type: 'error',
        text: `Gagal mengirim nilai pending: ${e?.message || 'Koneksi gagal'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="sync-dialog-backdrop"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="sync-dialog-card"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-slate-100 overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button 
            id="sync-dialog-close-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CloudDownload size={24} className={isSyncing ? "animate-bounce" : ""} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Sinkronisasi Materi
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Hemat Kuota
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Mode Offline Aktif • Zero Read Quota saat Belajar
              </p>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 mb-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Membuka modul, video, simulasi, dan game berjalan <strong>100% dari memori perangkat</strong>. Hanya tombol di bawah ini yang akan membaca pembaruan dari Firebase bila ada perubahan materi dari Guru.
            </p>
          </div>

          {/* Device Local Cache Status */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                <BookOpen size={12} className="text-emerald-400" />
                <span>Modul</span>
              </div>
              <div className="text-lg font-black text-white">{syncStatus.moduleCount}</div>
              <div className="text-[10px] text-slate-400">Tersimpan</div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                <HelpCircle size={12} className="text-cyan-400" />
                <span>Bank Kuis</span>
              </div>
              <div className="text-lg font-black text-white">{syncStatus.quizCount}</div>
              <div className="text-[10px] text-slate-400">Tersimpan</div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                <Gamepad2 size={12} className="text-purple-400" />
                <span>Game Edukasi</span>
              </div>
              <div className="text-lg font-black text-white">{syncStatus.gameCount}</div>
              <div className="text-[10px] text-slate-400">Tersimpan</div>
            </div>
          </div>

          {/* Sync Metadata Row */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 space-y-2 mb-5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <HardDrive size={13} />
                Terakhir Diperbarui:
              </span>
              <span className="font-bold text-slate-200">
                {syncService.getFormattedLastSync()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                {syncStatus.isOnline ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-rose-400" />}
                Status Jaringan:
              </span>
              <span className={`font-bold ${syncStatus.isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {syncStatus.isOnline ? 'Online (Terhubung)' : 'Offline (Tanpa Internet)'}
              </span>
            </div>
          </div>

          {/* Pending scores banner if any */}
          {syncStatus.pendingScoresCount > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-200">
                    {syncStatus.pendingScoresCount} Nilai Kuis Belum Terkirim
                  </div>
                  <div className="text-[10px] text-amber-300/80">
                    Tersimpan aman di HP/laptop karena offline saat kuis selesai.
                  </div>
                </div>
              </div>
              <button
                onClick={handleFlushPendingOnly}
                disabled={isSyncing || !syncStatus.isOnline}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Send size={12} />
                Kirim
              </button>
            </div>
          )}

          {/* Syncing Progress Indicator */}
          {isSyncing && (
            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-2">
                  <RefreshCw size={13} className="animate-spin text-emerald-400" />
                  {currentStep || 'Memproses...'}
                </span>
                <span className="font-mono text-emerald-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <motion.div
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Result Alert */}
          {resultMessage && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-2xl mb-5 text-xs font-medium flex items-start gap-2.5 ${
                resultMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {resultMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{resultMessage.text}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              id="sync-now-button"
              onClick={handleStartSync}
              disabled={isSyncing}
              className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Cek & Unduh Pembaruan Sekarang'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
