import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ChevronDown, 
  School,
  Loader2,
  RefreshCw,
  Edit2,
  List,
  AlertTriangle
} from 'lucide-react';
import { GardenDecorations } from './GardenDecorations';
import { AppSettings, StudentItem, ClassItem } from '../types';
import { firestoreService } from '../services/firestoreService';
import { sheetService } from '../services/sheetService';
import { getDirectCsvUrl } from '../config/spreadsheetConfig';

interface LoginProps {
  username: string;
  setUsername: (name: string) => void;
  userClass: string;
  setUserClass: (className: string) => void;
  onLogin: (e: React.FormEvent) => void;
  onOpenAdmin?: () => void;
  settings?: AppSettings;
}

export const Login: React.FC<LoginProps> = ({ 
  username, 
  setUsername, 
  userClass, 
  setUserClass, 
  onLogin,
  onOpenAdmin,
  settings
}) => {
  const logoUrl = settings?.logoUrl || "https://i.ibb.co.com/kVLW5n61/logo-smpn-1-bengkalis-kecil-Copy.png";
  const welcomeTitle = settings?.homeWelcomeTitle || "Selamat Datang di Modul Berkebun SMPN 1 Bengkalis";
  const quoteText = settings?.homeQuote || "“Satu langkah kecil hari ini, Menyelamatkan hidup di masa depan”";

  // Dynamic states for Spreadsheet / DB loaded data initialized immediately from local browser cache
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    try {
      const cached = firestoreService.getClassesSync();
      return Array.isArray(cached) && cached.length > 0 ? cached : [];
    } catch {
      return [];
    }
  });

  const [students, setStudents] = useState<StudentItem[]>(() => {
    try {
      const cached = firestoreService.getStudentsSync();
      return Array.isArray(cached) && cached.length > 0 ? cached : [];
    } catch {
      return [];
    }
  });

  // Zero-latency: If local cache already contains classes, do not block the user with a loader!
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = firestoreService.getClassesSync();
      return !cached || cached.length === 0;
    } catch {
      return true;
    }
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Custom input toggler: 'select' is easier, 'manual' is for custom typing
  const [inputMode, setInputMode] = useState<'select' | 'manual'>('select');

  // Load classes and students dynamically
  const loadDynamicData = async (forceSync = false) => {
    try {
      if (forceSync || classes.length === 0) {
        setLoading(true);
      }
      setErrorMsg(null);

      // 1. Cek konfigurasi langsung terlebih dahulu, lalu remote Firestore
      const directUrl = getDirectCsvUrl();

      let freshSettings = null;
      try {
        freshSettings = await firestoreService.fetchRemoteSettings();
      } catch (e) {
        console.warn("Direct remote settings fetch note:", e);
      }
      
      if (!freshSettings) {
        freshSettings = await firestoreService.getSettings();
      }
      
      const csvUrl = directUrl || freshSettings?.studentCsvUrl || settings?.studentCsvUrl;

      if (csvUrl && csvUrl.trim().startsWith('http')) {
        // Hapus data lama terlebih dahulu jika tombol Segarkan ditekan secara manual
        if (forceSync) {
          setClasses([]);
          setStudents([]);
        }

        // Unduh data siswa dan kelas terbaru langsung dari link spreadsheet CSV
        const res = await sheetService.pullStudentsFromCsv(csvUrl);
        if (res.success && res.classes && res.students && res.classes.length > 0) {
          setClasses(res.classes);
          setStudents(res.students);
          // SIMPAN DI LOKAL BROWSER AGAR LOGIN SELANJUTNYA INSTAN
          await firestoreService.replaceAllClasses(res.classes);
          await firestoreService.replaceAllStudents(res.students);
          return;
        } else if (forceSync) {
          setErrorMsg(res.message || "Gagal menarik data dari link CSV Google Spreadsheet.");
        }
      } else if (forceSync) {
        setErrorMsg("Belum ada link CSV. Silakan atur link CSV.");
      }

      // Fallback: gunakan data kelas dari cache unduhan CSV lokal sebelumnya jika ada
      const savedClasses = firestoreService.getClassesSync();
      const savedStudents = firestoreService.getStudentsSync();
      if (savedClasses && savedClasses.length > 0) {
        setClasses(savedClasses);
        if (savedStudents && savedStudents.length > 0) {
          setStudents(savedStudents);
        }
      }
    } catch (err: any) {
      console.warn("Gagal memuat data siswa:", err);
      if (forceSync) {
        setErrorMsg(err?.message || "Gagal menghubungkan Google Spreadsheet. Pastikan link valid dan di-publish sebagai CSV.");
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadDynamicData();
  }, [settings?.studentCsvUrl]);

  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (!userClass) return [];
    return students.filter(s => s.userClass && s.userClass.toUpperCase() === userClass.toUpperCase());
  }, [students, userClass]);

  // Reset name selection when class changes to prevent student mismatch
  const handleClassChange = (newClass: string) => {
    setUserClass(newClass);
    setUsername(''); // Clear previous selected student name
  };

  return (
    <div id="app-wrapper" className="w-full h-screen overflow-hidden relative leaf-pattern" style={{ background: '#410052', fontFamily: "'Nunito', sans-serif" }}>
      <GardenDecorations />

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="bg-black/25 backdrop-blur-md p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/15 shadow-2xl max-w-xl w-full flex flex-col items-center">
          
          {/* Header Title & Animated Logo */}
          <div className="flex flex-col items-center gap-3 mb-3">
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              style={{ perspective: 1000 }}
            >
              <img 
                src={logoUrl} 
                alt="Logo Sekolah" 
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <h1 id="hero-title" className="text-xl md:text-3xl font-black leading-tight whitespace-pre-line" style={{ fontFamily: "'Playfair Display', serif", color: '#f3e8ff' }}>
              {welcomeTitle}
            </h1>
          </div>

          {/* Decorative line */}
          <div className="flex items-center gap-3 my-1.5">
            <div style={{ background: '#d8b4fe', height: '2px', width: '40px', borderRadius: '2px' }}></div>
            <span className="text-lg">🍇</span>
            <div style={{ background: '#d8b4fe', height: '2px', width: '40px', borderRadius: '2px' }}></div>
          </div>

          {/* Subtitle / Quote */}
          <div className="space-y-1 mb-2">
            <p id="hero-subtitle" className="text-sm md:text-base max-w-md leading-relaxed mx-auto italic" style={{ color: '#d8b4fe', opacity: 0.9 }}>
              {quoteText}
            </p>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex flex-col items-center gap-2 my-8 text-purple-200">
              <Loader2 className="animate-spin text-purple-300" size={32} />
              <p className="text-sm font-bold tracking-wide">Mohon Bersabar</p>
            </div>
          ) : (
            <div className="mt-1 w-full max-w-xs md:max-w-md">
              <form onSubmit={onLogin} className="flex flex-col gap-4">
                
                {/* 1. SELECT KELAS (DYNAMIC FROM SPREADSHEET / FIREBASE) */}
                <div className="relative w-full text-left">
                  <label className="text-[11px] text-purple-200 font-bold block mb-1 px-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <School size={13} className="text-purple-300" />
                      Pilih Kelas Anda:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSyncing(true);
                        loadDynamicData(true);
                      }}
                      disabled={isSyncing}
                      className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold select-none disabled:opacity-50"
                      title="Tarik pembaruan dari Spreadsheet"
                    >
                      <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                      <span>Segarkan</span>
                    </button>
                  </label>
                  <div className="relative">
                    <select
                      id="login-class-select"
                      value={userClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-5 py-3 md:py-3.5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all outline-hidden appearance-none cursor-pointer bg-white/95 border-purple-300 text-purple-950 hover:border-purple-400 focus:border-purple-600 shadow-md"
                    >
                      <option value="">-- PILIH KELAS --</option>
                      
                      {/* Dynamically Loaded Classes */}
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name || cls.id}>
                          Kelas {cls.name || cls.id}
                        </option>
                      ))}

                      {/* Fallback & Special Roles */}
                      <option value="TAMU">AKSES TAMU</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-900">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* 2. STUDENT NAME SELECTOR (DYNAMIC) */}
                <div className="relative w-full text-left">
                  <label className="text-[11px] text-purple-200 font-bold block mb-1 px-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-purple-300" />
                      Nama Siswa:
                    </span>
                  </label>

                  <div className="relative">
                    {/* Never show 'gurusmp' by default - it is secret */}
                    {(() => {
                      const displayUsername = username.toLowerCase() === 'gurusmp' ? '' : username;
                      return userClass && userClass !== 'TAMU' && filteredStudents.length > 0 ? (
                        // Dropdown Mode for easier student selection
                        <div className="relative">
                          <select
                            id="login-name-select"
                            value={displayUsername}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={!userClass}
                            className="w-full px-5 py-3 md:py-3.5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all outline-hidden appearance-none cursor-pointer bg-white/95 border-purple-300 text-purple-950 hover:border-purple-400 focus:border-purple-600 shadow-md disabled:bg-slate-200 disabled:cursor-not-allowed"
                          >
                            <option value="">-- PILIH NAMA ANDA --</option>
                            {filteredStudents.map((std) => (
                              <option key={std.id} value={std.name}>
                                {std.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-900">
                            <ChevronDown size={20} />
                          </div>
                        </div>
                      ) : (
                        // Manual Input Mode when no student list or for TAMU
                        <input 
                          id="login-name-input"
                          type="text" 
                          value={displayUsername}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder=""
                          className="w-full pl-5 pr-5 py-3 md:py-3.5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all outline-hidden bg-white/95 border-purple-300 text-purple-950 hover:border-purple-400 focus:border-purple-600 shadow-md placeholder:text-slate-400"
                          autoComplete="off"
                          disabled={!userClass}
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  id="login-submit-btn"
                  type="submit" 
                  className="btn-garden pulse-glow inline-flex items-center justify-center gap-2.5 px-8 py-3.5 md:py-4 rounded-2xl text-lg md:text-xl font-bold tracking-wide mt-2 shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-purple-600/30"
                  style={{ border: 'none' }}
                > 
                  <span>MASUK BELAJAR</span> 
                </button>
              </form>
            </div>
          )}

          {/* Tagline */}
          <p id="tagline" className="mt-5 text-xs md:text-sm tracking-widest uppercase" style={{ color: '#d8b4fe', opacity: 0.7 }}>
            🍇 Modul Pembelajaran IPA Berkelanjutan 🍇
          </p>
          <p className="mt-1 text-[10px] font-bold tracking-wide" style={{ color: '#d8b4fe', opacity: 0.85 }}>
            SMP NEGERI 1 BENGKALIS
          </p>
        </div>
      </main>
    </div>
  );
};
