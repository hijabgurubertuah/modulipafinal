import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ChevronDown, 
  Search, 
  Check, 
  AlertCircle, 
  GraduationCap, 
  KeyRound, 
  X, 
  ShieldCheck,
  School,
  RefreshCw
} from 'lucide-react';
import { GardenDecorations } from './GardenDecorations';
import { firestoreService } from '../services/firestoreService';
import { sheetService } from '../services/sheetService';
import { AppSettings, ClassItem, StudentItem } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_CLASSES } from '../services/defaultData';
import { normalizeImageUrl } from '../utils/imageUrlHelper';

interface LoginProps {
  username: string;
  setUsername: (name: string) => void;
  userClass: string;
  setUserClass: (className: string) => void;
  onLogin: (e: React.FormEvent) => void;
  onOpenAdmin?: () => void;
  settings?: AppSettings;
}

/**
 * Login component with strict student validation, synchronous class-student linking,
 * searchable auto-filter student dropdown, and hardcoded teacher bypass for 'GURUSMP'.
 */
export const Login: React.FC<LoginProps> = ({ 
  username, 
  setUsername, 
  userClass, 
  setUserClass, 
  onLogin,
  onOpenAdmin,
  settings: propSettings
}) => {
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(propSettings || DEFAULT_SETTINGS);
  const [authError, setAuthError] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  
  // Quick caching and remember login states
  const [isRefreshingCsv, setIsRefreshingCsv] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  // Searchable student dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(username || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (propSettings) {
      setCurrentSettings(propSettings);
    }
  }, [propSettings]);

  useEffect(() => {
    firestoreService.getSettings().then(st => {
      if (st) setCurrentSettings(st);
    }).catch(err => console.error('Error fetching settings in Login:', err));
  }, []);

  const logoUrl = normalizeImageUrl(currentSettings?.logoUrl || "https://i.ibb.co.com/kVLW5n61/logo-smpn-1-bengkalis-kecil-Copy.png");
  const shouldAnimateLogo = currentSettings?.logoAnimation !== false;
  const welcomeTitle = currentSettings?.homeWelcomeTitle || "Selamat Datang di Modul Berkebun SMPN 1 Bengkalis";
  const quoteText = currentSettings?.homeQuote || "“Satu langkah kecil hari ini, Menyelamatkan hidup di masa depan”";

  // Clean old legacy dummy cache if any
  useEffect(() => {
    try {
      const cachedClassesStr = localStorage.getItem('garden_app_classes');
      if (cachedClassesStr) {
        const cachedCls: ClassItem[] = JSON.parse(cachedClassesStr);
        const hasLegacyDummy = cachedCls.some(c => c.id === 'std_8d_jos' || (c.description === 'Kelas Reguler' && cachedCls.length === 9));
        if (hasLegacyDummy) {
          localStorage.removeItem('garden_app_classes');
          localStorage.removeItem('garden_app_students');
        }
      }
    } catch {}
  }, []);

  // Auto load remembered login on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('garden_saved_username');
      const savedClass = localStorage.getItem('garden_saved_userclass');
      if (savedUser && savedClass) {
        setUsername(savedUser);
        setSearchTerm(savedUser);
        setUserClass(savedClass);
      }
    } catch {}
  }, []);

  // Fetch live classes and students
  const loadClassesAndStudents = async (forceRefresh = false) => {
    setIsLoadingData(true);
    setSyncFeedback('');

    // 1. Instantly load from local storage cache on device for zero load latency
    try {
      const cachedClsStr = localStorage.getItem('garden_local_classes');
      const cachedStdStr = localStorage.getItem('garden_local_students');
      if (cachedClsStr && cachedStdStr) {
        const cls = JSON.parse(cachedClsStr);
        const std = JSON.parse(cachedStdStr);
        if (cls.length > 0) setClassesList(cls);
        if (std.length > 0) setAllStudents(std);
        if (!forceRefresh) {
          setIsLoadingData(false);
        }
      }
    } catch (e) {
      console.warn('Error reading local cache:', e);
    }

    try {
      // 2. Fetch latest settings from Firestore
      const activeSettings = await firestoreService.getSettings();
      if (activeSettings) {
        setCurrentSettings(activeSettings);
      }

      // 3. Load strictly from CSV spreadsheet URL if configured, bypassing standard Firestore student list
      if (activeSettings && activeSettings.studentCsvUrl) {
        if (forceRefresh) {
          setIsRefreshingCsv(true);
        }
        const csvRes = await sheetService.pullStudentsFromCsv(activeSettings.studentCsvUrl);
        if (csvRes.success && csvRes.students && csvRes.classes) {
          const validClasses = csvRes.classes.filter(c => c.isActive !== false);
          const validStudents = csvRes.students.filter(s => s.status !== 'Non-Aktif');

          setClassesList(validClasses);
          setAllStudents(validStudents);

          // Save to local device storage for offline and instant instant loads
          localStorage.setItem('garden_local_classes', JSON.stringify(validClasses));
          localStorage.setItem('garden_local_students', JSON.stringify(validStudents));
          
          if (forceRefresh) {
            setSyncFeedback('Berhasil memperbarui daftar nama siswa dari Spreadsheet!');
            setTimeout(() => setSyncFeedback(''), 4500);
          }
        } else if (forceRefresh) {
          setSyncFeedback(`Gagal memperbarui: ${csvRes.message}`);
          setTimeout(() => setSyncFeedback(''), 4500);
        }
      } else {
        // Fallback to normal Firebase loading if no CSV URL is configured
        const [cachedClasses, cachedStudents] = await Promise.all([
          firestoreService.getClasses(),
          firestoreService.getStudents()
        ]);

        const activeClasses = (cachedClasses || []).filter(c => c.isActive !== false);
        const activeStudents = (cachedStudents || []).filter(s => s.status !== 'Non-Aktif');

        if (activeClasses.length > 0) {
          setClassesList(activeClasses);
          localStorage.setItem('garden_local_classes', JSON.stringify(activeClasses));
        }
        if (activeStudents.length > 0) {
          setAllStudents(activeStudents);
          localStorage.setItem('garden_local_students', JSON.stringify(activeStudents));
        }
      }
    } catch (err) {
      console.warn('Background sync error:', err);
    } finally {
      setIsLoadingData(false);
      setIsRefreshingCsv(false);
    }
  };

  useEffect(() => {
    loadClassesAndStudents();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync searchTerm with username prop
  useEffect(() => {
    if (username !== searchTerm) {
      setSearchTerm(username);
    }
  }, [username]);

  // Special Hardcoded Guest Student Item
  const TAMU_STUDENT: StudentItem = useMemo(() => ({
    id: 'guest_tamu_student',
    name: 'TAMU',
    userClass: 'TAMU',
    status: 'Aktif',
    nisn: 'Akun Pengunjung Bebas'
  }), []);

  // Filter students for the selected class (strictly synced with Kelola Kelas & Google Sheet)
  const classStudents = useMemo(() => {
    if (!userClass || userClass === 'guru' || userClass.toUpperCase() === 'TAMU') return [];
    const cleanClass = userClass.trim().toUpperCase();
    return allStudents.filter(s => 
      s.userClass && s.userClass.trim().toUpperCase() === cleanClass && s.status !== 'Non-Aktif' && s.name.toUpperCase() !== 'TAMU'
    ).sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [allStudents, userClass]);

  // Search filtered student suggestions based on user typing
  const filteredStudentSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    // Sesuai instruksi: Jika kelas TIDAK dipilih, tidak perlu muncul list siswa, hanya ada dropdown pilihannya yaitu "TAMU"
    if (!userClass) {
      return [TAMU_STUDENT];
    }

    // Jika kelas dipilih, tampilkan daftar nama siswa kelas tersebut (tidak usah ada TAMU di daftarnya)
    const baseList = [...classStudents];

    if (!query) {
      return baseList;
    }

    return baseList.filter(s => 
      s.name.toLowerCase().includes(query) || 
      (s.nisn && s.nisn.toLowerCase().includes(query))
    );
  }, [classStudents, userClass, searchTerm, TAMU_STUDENT]);

  const handleClassChange = (selectedCls: string) => {
    setAuthError('');
    setUserClass(selectedCls);
    
    // Sesuai instruksi: Jika kelas tidak dipilih atau berganti kelas, kolom nama otomatis kosong
    setUsername('');
    setSearchTerm('');
    
    // Sesuai instruksi: Tidak otomatis keluar dropdown (tidak otomatis terbuka/fokus)
    setIsDropdownOpen(false);
  };

  const handleInputChange = (val: string) => {
    setAuthError('');
    setSearchTerm(val);
    setUsername(val);
    setIsDropdownOpen(true);
  };

  const handleSelectStudent = (student: StudentItem | string) => {
    setAuthError('');
    const studentName = typeof student === 'string' ? student : student.name;
    setUsername(studentName);
    setSearchTerm(studentName);

    if (studentName.toUpperCase() === 'TAMU') {
      setUserClass('TAMU');
    } else if (typeof student !== 'string' && student.userClass && (!userClass || userClass === 'TAMU')) {
      setUserClass(student.userClass);
    }
    setIsDropdownOpen(false);
  };

  const handleClearInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUsername('');
    setSearchTerm('');
    setAuthError('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsDropdownOpen(false);

    const cleanUser = (searchTerm || username).trim();
    const cleanCls = userClass.trim();

    // 1. Secret Teacher Login Bypass (Requires no class selection, completely hidden from UI)
    if (cleanUser.toLowerCase() === 'gurusmp' || cleanCls.toLowerCase() === 'guru') {
      setUserClass('guru');
      setUsername('GURUSMP');
      sheetService.recordLogin('GURUSMP', 'guru');
      if (rememberMe) {
        localStorage.setItem('garden_saved_username', 'GURUSMP');
        localStorage.setItem('garden_saved_userclass', 'guru');
      } else {
        localStorage.removeItem('garden_saved_username');
        localStorage.removeItem('garden_saved_userclass');
      }
      onLogin(e);
      return;
    }

    // 2. TAMU Guest User Bypass (Requires no class selection, allows immediate access to materials)
    if (cleanUser.toUpperCase() === 'TAMU' || cleanCls.toUpperCase() === 'TAMU') {
      setUserClass('TAMU');
      setUsername('TAMU');
      sheetService.recordLogin('TAMU', 'TAMU');
      if (rememberMe) {
        localStorage.setItem('garden_saved_username', 'TAMU');
        localStorage.setItem('garden_saved_userclass', 'TAMU');
      } else {
        localStorage.removeItem('garden_saved_username');
        localStorage.removeItem('garden_saved_userclass');
      }
      onLogin(e);
      return;
    }

    if (!cleanCls) {
      setAuthError('Silakan pilih Kelas Anda terlebih dahulu (atau pilih akun TAMU).');
      return;
    }

    if (!cleanUser) {
      setAuthError('Silakan pilih atau ketik Nama Siswa Anda.');
      return;
    }

    // 2. Student login verification
    let resolvedStudentName = cleanUser;

    if (classStudents.length > 0) {
      const matchedStudent = classStudents.find(s => 
        s.name.trim().toUpperCase() === cleanUser.toUpperCase() || 
        (s.nisn && s.nisn.trim() === cleanUser)
      );

      if (matchedStudent) {
        resolvedStudentName = matchedStudent.name;
      } else {
        // Auto register new student into Firestore
        firestoreService.saveStudent({
          name: cleanUser,
          userClass: cleanCls,
          status: 'Aktif'
        }).catch(err => console.warn('Auto save student warning:', err));
      }
    } else {
      // No roster yet for this class: auto register student to this class in Firestore
      firestoreService.saveStudent({
        name: cleanUser,
        userClass: cleanCls,
        status: 'Aktif'
      }).catch(err => console.warn('Auto save student warning:', err));
    }

    // Set properly capitalized registered name
    setUsername(resolvedStudentName);
    
    // Record login activity in background
    sheetService.recordLogin(resolvedStudentName, cleanCls);

    // Save login details to local storage if rememberMe is checked
    if (rememberMe) {
      localStorage.setItem('garden_saved_username', resolvedStudentName);
      localStorage.setItem('garden_saved_userclass', cleanCls);
    } else {
      localStorage.removeItem('garden_saved_username');
      localStorage.removeItem('garden_saved_userclass');
    }

    // Proceed to app
    onLogin(e);
  };

  // Helper to highlight matching search characters
  const renderHighlightedName = (name: string, query: string) => {
    if (!query) return <span>{name}</span>;
    const index = name.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return <span>{name}</span>;
    
    const before = name.substring(0, index);
    const match = name.substring(index, index + query.length);
    const after = name.substring(index + query.length);

    return (
      <span>
        {before}
        <span className="bg-purple-200 text-purple-900 font-black underline decoration-purple-500 rounded-xs px-0.5">{match}</span>
        {after}
      </span>
    );
  };

  return (
    <div id="app-wrapper" className="w-full h-screen overflow-hidden relative leaf-pattern" style={{ background: '#410052', fontFamily: "'Nunito', sans-serif" }}>
      <GardenDecorations />

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="bg-black/25 backdrop-blur-md p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/15 shadow-2xl max-w-xl w-full flex flex-col items-center">
          
          {/* Header Title & Animated Logo */}
          <div className="fade-up-d1 flex flex-col items-center gap-3 mb-3">
            <motion.div
              animate={shouldAnimateLogo ? { rotateY: 360 } : { rotateY: 0 }}
              transition={shouldAnimateLogo ? { duration: 14, repeat: Infinity, ease: "linear" } : undefined}
              style={{ perspective: 1000 }}
            >
              <img 
                src={logoUrl} 
                alt="Logo Sekolah" 
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://i.ibb.co.com/kVLW5n61/logo-smpn-1-bengkalis-kecil-Copy.png";
                }}
              />
            </motion.div>
            <h1 id="hero-title" className="text-xl md:text-3xl font-black leading-tight whitespace-pre-line" style={{ fontFamily: "'Playfair Display', serif", color: '#f3e8ff' }}>
              {welcomeTitle}
            </h1>
          </div>

          {/* Decorative line */}
          <div className="fade-up-d1 flex items-center gap-3 my-1.5">
            <div style={{ background: '#d8b4fe', height: '2px', width: '40px', borderRadius: '2px' }}></div>
            <span className="text-lg">🍇</span>
            <div style={{ background: '#d8b4fe', height: '2px', width: '40px', borderRadius: '2px' }}></div>
          </div>

          {/* Subtitle / Quote */}
          <div className="fade-up-d2 space-y-1 mb-2">
            <p id="hero-subtitle" className="text-sm md:text-base max-w-md leading-relaxed mx-auto italic" style={{ color: '#d8b4fe', opacity: 0.9 }}>
              {quoteText}
            </p>
          </div>

          {/* Auth Error Notification */}
          <AnimatePresence>
            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fade-up-d2 w-full max-w-xs md:max-w-md mb-3 px-4 py-2.5 bg-rose-950/90 border border-rose-400/80 rounded-2xl text-xs text-rose-100 text-left font-semibold shadow-xl flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">
                  {authError}
                </div>
                <button 
                  onClick={() => setAuthError('')}
                  className="text-rose-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name & Class Input Form */}
          <div className="fade-up-d3 mt-1 w-full max-w-xs md:max-w-md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              
              {/* 1. SELECT KELAS */}
              <div className="relative w-full text-left">
                <label className="text-[11px] text-purple-200 font-bold block mb-1 px-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <School size={13} className="text-purple-300" />
                    Pilih Kelas Anda:
                  </span>
                </label>
                <div className="relative">
                  <select
                    id="login-class-select"
                    value={userClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-5 py-3 md:py-3.5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all outline-hidden appearance-none cursor-pointer bg-white/95 border-purple-300 text-purple-950 hover:border-purple-400 focus:border-purple-600 shadow-md"
                  >
                    <option value="">
                      {isLoadingData ? 'Memuat Daftar Kelas...' : '-- PILIH KELAS --'}
                    </option>
                    {classesList.map((c, idx) => {
                      return (
                        <option key={`cls-${c.id || c.name}-${idx}`} value={c.name}>
                          Kelas {c.name}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-900">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>

              {/* 2. SEARCHABLE STUDENT NAME DROPDOWN */}
              <div className="relative w-full text-left" ref={dropdownRef}>
                <label className="text-[11px] text-purple-200 font-bold block mb-1 px-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-purple-300" />
                    Pilih / Ketik Nama Siswa:
                  </span>
                </label>

                <div className="relative">
                  <input 
                    ref={inputRef}
                    id="login-name-input"
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    onClick={() => setIsDropdownOpen(true)}
                    readOnly={!!userClass}
                    placeholder={userClass ? `Pilih nama Anda...` : `Pilih 'TAMU' atau ketik nama...`}
                    className={`w-full pl-5 pr-12 py-3 md:py-3.5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all outline-hidden bg-white/95 border-purple-300 text-purple-950 hover:border-purple-400 focus:border-purple-600 shadow-md placeholder:text-slate-400 ${userClass ? 'cursor-pointer' : ''}`}
                    autoComplete="off"
                  />

                  {/* Clear / Status Action Icons */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchTerm && !userClass && (
                      <button
                        type="button"
                        onClick={handleClearInput}
                        className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                        title="Hapus ketikan"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className="p-1 text-purple-900 hover:text-purple-700 transition-colors cursor-pointer"
                      title="Buka daftar siswa / akun tamu"
                    >
                      <ChevronDown size={18} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* FLOATING FILTERABLE DROPDOWN MENU */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: userClass ? 6 : -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: userClass ? 6 : -6, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className={`absolute z-50 left-0 right-0 ${userClass ? 'bottom-full mb-2.5' : 'mt-1.5'} bg-white rounded-2xl shadow-2xl border-2 border-purple-300 overflow-hidden max-h-60 flex flex-col text-slate-800`}
                    >
                      {/* Dropdown Student List */}
                      <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1">
                        {filteredStudentSuggestions.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs font-semibold">
                            {userClass && userClass !== 'TAMU' ? (
                              <span>
                                {searchTerm ? `Nama "${searchTerm}" tidak ditemukan di Kelas ${userClass}` : `Belum ada data siswa untuk Kelas ${userClass}`}
                              </span>
                            ) : (
                              <span>Nama tidak ditemukan</span>
                            )}
                          </div>
                        ) : (
                          filteredStudentSuggestions.map((student, idx) => {
                            const isTamu = student.name.toUpperCase() === 'TAMU';
                            const isSelected = username.trim().toUpperCase() === student.name.trim().toUpperCase();
                            return (
                              <button
                                key={`opt-std-${student.id || idx}`}
                                type="button"
                                onClick={() => handleSelectStudent(student)}
                                className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 rounded-xl transition-all cursor-pointer ${
                                  isTamu
                                    ? isSelected
                                      ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300'
                                      : 'bg-amber-50/70 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200/70'
                                    : isSelected 
                                      ? 'bg-purple-100 text-purple-950 font-bold' 
                                      : 'hover:bg-purple-50 text-slate-800 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {isTamu ? (
                                    <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0">
                                      UMUM
                                    </span>
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                  )}
                                  <div className="flex flex-col truncate">
                                    <span className={`text-sm truncate ${isTamu ? 'font-black text-amber-950' : ''}`}>
                                      {renderHighlightedName(student.name, searchTerm)}
                                    </span>
                                    {isTamu ? (
                                      <span className="text-[10px] text-amber-800 font-semibold">
                                        Akun Tamu &bull; Bebas Akses Materi Tanpa Kelas
                                      </span>
                                    ) : student.userClass && !userClass ? (
                                      <span className="text-[10px] text-slate-400">
                                        Kelas {student.userClass}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className={`w-4 h-4 rounded-full ${isTamu ? 'bg-amber-600' : 'bg-purple-600'} text-white flex items-center justify-center shrink-0`}>
                                    <Check size={11} />
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember Me Checkbox & Sync Button Container */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 mt-1 text-[11px] font-bold text-purple-200">
                {/* Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-400 text-purple-600 focus:ring-purple-500 bg-black/25 cursor-pointer"
                  />
                  <span>Simpan login di perangkat ini</span>
                </label>

                {/* Refresh Student Names Button */}
                {currentSettings.studentCsvUrl && (
                  <button
                    type="button"
                    onClick={() => loadClassesAndStudents(true)}
                    disabled={isRefreshingCsv}
                    className="flex items-center gap-1 hover:text-emerald-300 disabled:opacity-50 transition-all cursor-pointer bg-purple-950/40 hover:bg-purple-950/70 border border-purple-400/20 px-2.5 py-1 rounded-full text-[10px]"
                    title="Ambil pembaruan daftar nama siswa terbaru dari Spreadsheet"
                  >
                    <RefreshCw size={11} className={isRefreshingCsv ? 'animate-spin' : ''} />
                    <span>{isRefreshingCsv ? 'Memperbarui...' : 'Perbarui Nama'}</span>
                  </button>
                )}
              </div>

              {/* Sync Feedback Message */}
              {syncFeedback && (
                <div className={`text-[11px] font-semibold text-center mt-1 py-1 px-3 rounded-lg ${syncFeedback.includes('Gagal') ? 'bg-rose-950/50 text-rose-300 animate-pulse' : 'bg-emerald-950/50 text-emerald-300'}`}>
                  {syncFeedback}
                </div>
              )}

              {/* Submit Button */}
              <button 
                id="login-submit-btn"
                type="submit" 
                className="btn-garden pulse-glow inline-flex items-center justify-center gap-2.5 px-8 py-3.5 md:py-4 rounded-2xl text-lg md:text-xl font-bold tracking-wide mt-2 shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-purple-600/30"
                style={{ border: 'none' }}
              > 
                <ShieldCheck size={20} />
                <span>MASUK BELAJAR</span> 
              </button>
            </form>
          </div>

          {/* Tagline */}
          <p id="tagline" className="fade-up-d3 mt-5 text-xs md:text-sm tracking-widest uppercase" style={{ color: '#d8b4fe', opacity: 0.7 }}>
            🍇 Modul Pembelajaran IPA Berkelanjutan 🍇
          </p>
          <p className="fade-up-d3 mt-1 text-[10px] font-bold tracking-wide" style={{ color: '#d8b4fe', opacity: 0.85 }}>
            SMP NEGERI 1 BENGKALIS
          </p>
        </div>
      </main>
    </div>
  );
};
