import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  HelpCircle,
  Users,
  GraduationCap,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Lock,
  Search,
  Filter,
  Download,
  Upload,
  ArrowLeft,
  Video,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Layers,
  Database,
  Activity,
  LogOut,
  FolderOpen,
  Palette,
  LayoutTemplate,
  Globe,
  Home as HomeIcon,
  PanelLeft,
  RotateCcw,
  Sliders,
  EyeOff,
  ShieldCheck,
  Gamepad2,
  Code2,
  Info,
  PlayCircle,
  Cloud,
  GripVertical,
  ChevronRight,
  Menu,
  AlertTriangle,
  CheckSquare,
  Square,
  CheckCheck,
  Loader2,
  Flame,
  LogIn,
  Clock
} from 'lucide-react';
import { 
  AppModule, 
  ModulePage, 
  QuizConfig, 
  QuizQuestion, 
  ClassItem, 
  StudentItem, 
  ScoreRecord, 
  ActivityLog, 
  AppSettings,
  GameItem
} from '../types';
import { firestoreService } from '../services/firestoreService';
import { sheetService } from '../services/sheetService';
import { DEFAULT_SETTINGS } from '../services/defaultData';
import { extractSpreadsheetId } from '../services/googleSheetsDirectService';
import { resolveCsvUrl, resolveSheetUrl } from '../config/spreadsheetConfig';
import { IconComponent } from './IconComponent';
import { VideoPlayer, getCleanVideoEmbedUrl } from './VideoPlayer';
import { CustomGameRenderer } from './CustomGameRenderer';
import { AdminGameManager } from './AdminGameManager';
import { FirebaseUsageDashboard } from './FirebaseUsageDashboard';
import { GAME_TEMPLATES } from '../utils/gameTemplates';
import { compressImage } from '../utils/imageCompressor';
import { normalizeImageUrl, testImageLoad } from '../utils/imageUrlHelper';
import { SyncDialog } from './SyncDialog';
import { RichTextEditor } from './RichTextEditor';
import { AdminAppScriptManager } from './AdminAppScriptManager';

interface AdminDashboardProps {
  onBackToStudentView: (targetModule?: number) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToStudentView,
  onLogout
}) => {
  // --- Navigation Tab State ---
  const [activeTab, setActiveTab] = useState<
    'materi' | 'kuis' | 'game' | 'kelas' | 'siswa' | 'nilai' | 'log' | 'spreadsheet' | 'pengaturan' | 'firebase' | 'appscript'
  >('materi');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMobileModuleSidebarOpen, setIsMobileModuleSidebarOpen] = useState<boolean>(false);

  // --- Settings Sub-Tab State ---
  const [settingsSubTab, setSettingsSubTab] = useState<
    'branding' | 'sidebar' | 'home' | 'general'
  >('branding');

  // --- Data State ---
  const [modules, setModules] = useState<AppModule[]>([]);
  const [quizzes, setQuizzes] = useState<QuizConfig[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // --- Module Editing State ---
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [editingModule, setEditingModule] = useState<AppModule | null>(null);
  const [editingPage, setEditingPage] = useState<ModulePage | null>(null);
  const [isPageEditorOpen, setIsPageEditorOpen] = useState<boolean>(false);
  const [pageEditorTab, setPageEditorTab] = useState<'content' | 'game'>('content');
  const [gameEditorSubTab, setGameEditorSubTab] = useState<'code' | 'preview'>('code');
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);
  const [isGameSelectorModalOpen, setIsGameSelectorModalOpen] = useState<boolean>(false);
  const [gameSelectorSearch, setGameSelectorSearch] = useState<string>('');
  const [gameSelectorCategory, setGameSelectorCategory] = useState<string>('ALL');

  // --- Quiz Editing State ---
  const [selectedQuizModule, setSelectedQuizModule] = useState<number>(1);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const [quizTestAnswer, setQuizTestAnswer] = useState<string | null>(null);

  // --- Class & Student State ---
  const [newClassName, setNewClassName] = useState<string>('');
  const [isAddingClass, setIsAddingClass] = useState<boolean>(false);
  const [isUpdatingClassId, setIsUpdatingClassId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isSavingSingleModule, setIsSavingSingleModule] = useState<boolean>(false);
  const [isSavingStudent, setIsSavingStudent] = useState<boolean>(false);
  const [isImportingStudents, setIsImportingStudents] = useState<boolean>(false);
  const [isSavingPage, setIsSavingPage] = useState<boolean>(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState<boolean>(false);
  const [isSavingGame, setIsSavingGame] = useState<boolean>(false);
  const [studentFilterClass, setStudentFilterClass] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Partial<StudentItem>>({
    name: '',
    userClass: '',
    nisn: '',
    status: 'Aktif'
  });
  const [bulkStudentText, setBulkStudentText] = useState<string>('');
  const [bulkStudentClass, setBulkStudentClass] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  // --- Bulk Checkbox Selections ---
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // --- Delete Confirmation Modal State ---
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'class' | 'student' | 'question' | 'page' | 'bulk_classes' | 'bulk_students';
    id: string | number;
    title: string;
    subtitle?: string;
    warningNote?: string;
    targetName?: string;
    data?: any;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);

  // --- Scores Filter ---
  const [scoreFilterClass, setScoreFilterClass] = useState<string>('ALL');
  const [scoreFilterModule, setScoreFilterModule] = useState<string>('ALL');
  const [scoreSearch, setScoreSearch] = useState<string>('');

  // --- Copy Notification & Sheet Sync State ---
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [isTestingSheetConnection, setIsTestingSheetConnection] = useState<boolean>(false);
  const [sheetTestResult, setSheetTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
    classesCount?: number;
    studentsCount?: number;
    scoresCount?: number;
    classList?: string[];
  } | null>(null);

  // --- Logo URL Testing State ---
  const [logoUrlInput, setLogoUrlInput] = useState<string>('');
  const [isTestingLogoUrl, setIsTestingLogoUrl] = useState<boolean>(false);
  const [logoUrlFeedback, setLogoUrlFeedback] = useState<{ status: 'valid' | 'invalid' | 'idle'; message: string }>({
    status: 'idle',
    message: ''
  });

  const [isDomainHelpModalOpen, setIsDomainHelpModalOpen] = useState<boolean>(false);
  const [domainCopied, setDomainCopied] = useState<boolean>(false);

  // --- Student CSV Import State ---
  const [studentCsvUrl, setStudentCsvUrl] = useState<string>('');
  const [isPullingCsv, setIsPullingCsv] = useState<boolean>(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState<string>('');
  const [csvInput, setCsvInput] = useState<string>('');

  // --- Load Initial Data ---
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [m, q, c, s, sc, l, st, g] = await Promise.all([
        firestoreService.getModules(),
        firestoreService.getQuizzes(),
        firestoreService.getClasses(),
        firestoreService.getStudents(),
        firestoreService.getScores(),
        firestoreService.getActivityLogs(),
        firestoreService.getSettings(),
        firestoreService.getGames()
      ]);

      setModules(m);
      setQuizzes(q);
      setClasses(c);
      setStudents(s);
      setScores(sc);
      setLogs(l);

      if (c.length > 0) {
        const firstCls = c[0].name || c[0].id;
        setEditingStudent(prev => ({
          ...prev,
          userClass: prev.userClass && c.some(item => (item.name || item.id) === prev.userClass) ? prev.userClass : firstCls
        }));
        setBulkStudentClass(prev => prev && c.some(item => (item.name || item.id) === prev) ? prev : firstCls);
      }
      const activeSettings = {
        ...DEFAULT_SETTINGS,
        ...st,
        googleAppsScriptUrl: st.googleAppsScriptUrl?.trim() || DEFAULT_SETTINGS.googleAppsScriptUrl
      };
      setSettings(activeSettings);
      setStudentCsvUrl(activeSettings.studentCsvUrl || '');
      setSpreadsheetInput(activeSettings.sheetUrl || activeSettings.sheetId || '');
      setCsvInput(activeSettings.studentCsvUrl || '');
      setGames(g);
      if (activeSettings.logoUrl) {
        setLogoUrlInput(activeSettings.logoUrl);
      }

      if (m.length > 0) {
        const defaultMod = m.find(item => item.id === 1) || m[0];
        setSelectedModuleId(defaultMod.id);
        setEditingModule(defaultMod);
        setSelectedQuizModule(prev => m.some(item => item.id === prev) ? prev : defaultMod.id);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  // --- Handlers: Game Management ---
  const handleSaveGameFromManager = async (game: GameItem) => {
    try {
      await firestoreService.saveGame(game);
      const refreshed = await firestoreService.getGames();
      setGames(refreshed);
      showNotification(`Game "${game.title}" berhasil disimpan & disinkronkan ke Firebase!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan game: ${err?.message || 'Error'}`, 'error');
      throw err;
    }
  };

  const handleDeleteGameFromManager = async (gameId: string) => {
    const target = games.find(g => g.id === gameId);
    if (!window.confirm(`Yakin ingin menghapus game "${target?.title || gameId}" dari Firebase?`)) {
      return;
    }
    try {
      await firestoreService.deleteGame(gameId);
      const refreshed = await firestoreService.getGames();
      setGames(refreshed);
      showNotification('Game berhasil dihapus dari Firebase.', 'success');
    } catch (err: any) {
      showNotification(`Gagal menghapus game: ${err?.message || 'Error'}`, 'error');
      throw err;
    }
  };

  const handleSyncAllGamesFromManager = async () => {
    setIsCloudSyncing(true);
    showNotification('Sedang menyinkronkan semua game ke Cloud Firebase...', 'info');
    try {
      for (const g of games) {
        await firestoreService.saveGame(g);
      }
      const refreshed = await firestoreService.getGames();
      setGames(refreshed);
      showNotification(`Semua (${refreshed.length}) game berhasil disinkronkan ke Cloud Firebase!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal sinkronisasi game: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleResetDefaultGamesFromManager = async () => {
    if (!window.confirm('Muat ulang dan sinkronkan semua game modular bawaan (Game 1, Game 2, Game 3, Memory) dan template ke Firebase Firestore?')) {
      return;
    }
    setIsCloudSyncing(true);
    showNotification('Memuat ulang game bawaan ke Cloud Firebase...', 'info');
    try {
      const defaultList = firestoreService.getDefaultGamesList();
      for (const g of defaultList) {
        await firestoreService.saveGame(g);
      }
      const refreshed = await firestoreService.getGames();
      setGames(refreshed);
      showNotification('Game modular bawaan & template berhasil dimuat ulang dan tersimpan di Firebase!', 'success');
    } catch (err: any) {
      showNotification(`Gagal memuat game: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleEmbedGameToModuleFromManager = async (
    game: GameItem,
    moduleId: number,
    mode: 'new_page' | 'replace_page',
    pageId?: number
  ) => {
    const targetMod = modules.find(m => m.id === moduleId);
    if (!targetMod) {
      showNotification('Modul materi tidak ditemukan.', 'error');
      return;
    }

    const updatedPages = [...(targetMod.pages || [])];
    if (mode === 'new_page') {
      const newPageId = updatedPages.length > 0 ? Math.max(...updatedPages.map(p => p.id)) + 1 : 1;
      const newPage: ModulePage = {
        id: newPageId,
        title: game.title,
        content: game.description || 'Selesaikan tantangan game edukasi interaktif ini untuk melanjutkan materi berikutnya.',
        isGame: true,
        gameId: game.id,
        gameType: game.type,
        gameCode: game.code || '',
        gameInstructions: game.instructions || 'Ikuti petunjuk permainan dengan teliti.',
        gamePassScore: game.passScore || 100
      };
      updatedPages.push(newPage);
    } else {
      if (!pageId) {
        showNotification('Halaman tujuan belum dipilih.', 'error');
        return;
      }
      const pIdx = updatedPages.findIndex(p => p.id === pageId);
      if (pIdx >= 0) {
        updatedPages[pIdx] = {
          ...updatedPages[pIdx],
          title: game.title,
          isGame: true,
          gameId: game.id,
          gameType: game.type,
          gameCode: game.code || '',
          gameInstructions: game.instructions || updatedPages[pIdx].gameInstructions || 'Ikuti petunjuk permainan.',
          gamePassScore: game.passScore || 100
        };
      }
    }

    const updatedModule: AppModule = {
      ...targetMod,
      pages: updatedPages
    };

    try {
      await firestoreService.saveModule(updatedModule);
      const updatedModules = modules.map(m => m.id === updatedModule.id ? updatedModule : m);
      setModules(updatedModules);
      if (selectedModuleId === updatedModule.id) {
        setEditingModule(updatedModule);
      }
      showNotification(`Game "${game.title}" berhasil disematkan ke dalam Modul ${updatedModule.id}!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal menyematkan game ke modul: ${err?.message || 'Error'}`, 'error');
    }
  };

  // --- Handlers: Cloud Sync (1-Click Sync All to Cloud) ---
  const handleSyncMateriAndGamesToCloud = async () => {
    setIsCloudSyncing(true);
    showNotification('Sedang mengunggah & menyinkronkan seluruh materi modul dan game edukasi ke Cloud Firebase...', 'info');
    try {
      const res = await firestoreService.syncAllModulesAndGamesToCloud(modules, games, (step, pct) => {
        setSyncStatusMsg(`${step} (${pct}%)`);
      });
      await loadAllData();
      if (res.success) {
        showNotification(res.message, 'success');
      } else {
        showNotification(res.message, 'error');
      }
    } catch (err: any) {
      showNotification(`Gagal sinkronisasi: ${err?.message || 'Error jaringan'}`, 'error');
    } finally {
      setIsCloudSyncing(false);
      setSyncStatusMsg('');
    }
  };

  const handleSyncAllModulesAndQuizzesToCloud = async () => {
    setIsCloudSyncing(true);
    showNotification('Sedang menyinkronkan seluruh modul materi, kuis, game, dan kelas aktif ke Firebase...', 'info');
    try {
      const res = await firestoreService.syncAllCurrentDataToCloud(
        modules, 
        quizzes, 
        games, 
        classes, 
        settings, 
        (step, pct) => {
          setSyncStatusMsg(`${step} (${pct}%)`);
        }
      );
      if (res.success) {
        showNotification('Semua data Modul Materi, Kuis, Game & Kelas berhasil tersinkron ke Firebase!', 'success');
      } else {
        showNotification(res.message, 'error');
      }
    } catch (err: any) {
      showNotification(`Gagal sinkronisasi: ${err?.message || 'Error jaringan'}`, 'error');
    } finally {
      setIsCloudSyncing(false);
      setSyncStatusMsg('');
    }
  };

  // --- Handlers: Modules ---
  const handleSelectModuleForEdit = (mod: AppModule) => {
    setSelectedModuleId(mod.id);
    setEditingModule(JSON.parse(JSON.stringify(mod)));
  };

  const handleToggleModulePublished = async (modId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = modules.find(m => m.id === modId);
    if (!target) return;
    const nextPublished = target.isPublished === false ? true : false;
    const updatedMod: AppModule = {
      ...target,
      isPublished: nextPublished
    };
    
    // 1. Optimistic state update
    const updatedList = modules.map(m => m.id === modId ? updatedMod : m);
    setModules(updatedList);
    
    if (editingModule && editingModule.id === modId) {
      setEditingModule(updatedMod);
    }
    
    // 2. Persist to storage and Firestore
    try {
      await firestoreService.saveModule(updatedMod);
      showNotification(
        nextPublished 
          ? `Modul ${target.id} (${target.title}) sekarang DITAMPILKAN ke siswa.` 
          : `Modul ${target.id} (${target.title}) sekarang DISEMBUNYIKAN dari siswa.`,
        nextPublished ? 'success' : 'info'
      );
    } catch (err: any) {
      console.warn('Firestore toggle module published warning:', err);
    }
  };

  const handleSaveModuleMeta = async () => {
    if (!editingModule || isSavingSingleModule) return;
    setIsSavingSingleModule(true);
    try {
      await firestoreService.saveModule(editingModule);
      showNotification(`Perubahan Modul ${editingModule.id} ("${editingModule.title || `Modul ${editingModule.id}`}") berhasil disimpan ke Firebase!`, 'success');
      const updated = modules.map(m => m.id === editingModule.id ? editingModule : m);
      setModules(updated);
    } catch (e: any) {
      showNotification(`Gagal menyimpan modul: ${e?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSavingSingleModule(false);
    }
  };

  const handleAddNewModule = async () => {
    const nextId = modules.length > 0 ? Math.max(...modules.map(m => m.id)) + 1 : 1;
    const newMod: AppModule = {
      id: nextId,
      title: `Modul ${nextId}`,
      subtitle: `Materi Modul Baru ${nextId}`,
      password: '',
      icon: 'BookOpen',
      order: nextId,
      isPublished: true,
      pages: [
        {
          id: 0,
          title: 'Pengantar Modul',
          titleSize: 'lg',
          content: 'Tuliskan pengantar materi untuk modul ini di sini.',
          triggerQuestion: 'Apa yang ingin kamu pelajari hari ini?'
        }
      ]
    };

    const updated = [...modules, newMod];
    setModules(updated);
    setSelectedModuleId(newMod.id);
    setEditingModule(newMod);
    setSelectedQuizModule(newMod.id);
    
    // Save to storage and cloud
    await firestoreService.saveModule(newMod);
    showNotification(`Modul baru (${newMod.title}) berhasil dibuat!`, 'success');
  };

  const handleDeleteModule = async (modId: number) => {
    const targetModule = modules.find(m => m.id === modId);
    const modTitle = targetModule?.title || `Modul ${modId}`;
    if (!window.confirm(`Yakin ingin menghapus ${modTitle}? Tindakan ini akan menghapus modul dan halaman materinya.`)) {
      return;
    }
    
    // 1. Optimistic state update
    const updated = modules.filter(m => m.id !== modId);
    setModules(updated);
    
    if (selectedModuleId === modId) {
      const nextSelected = updated.length > 0 ? updated[0] : null;
      setSelectedModuleId(nextSelected ? nextSelected.id : null);
      setEditingModule(nextSelected);
    }
    if (selectedQuizModule === modId) {
      setSelectedQuizModule(updated.length > 0 ? updated[0].id : 1);
    }
    setQuizzes(prev => prev.filter(q => q.moduleNumber !== modId));

    // 2. Perform delete in storage and firestore
    try {
      await firestoreService.deleteModule(modId);
      showNotification(`${modTitle} berhasil dihapus!`, 'success');
    } catch (err: any) {
      console.warn('Delete module background notification:', err);
      showNotification(`${modTitle} dihapus dari daftar lokal.`, 'success');
    }
  };

  // --- Handlers: Pages within Module ---
  const handleOpenPageEditor = (page?: ModulePage) => {
    if (!editingModule) return;
    if (page) {
      setEditingPage(JSON.parse(JSON.stringify(page)));
      setPageEditorTab(page.isGame ? 'game' : 'content');
    } else {
      const nextId = editingModule.pages.length > 0 ? Math.max(...editingModule.pages.map(p => p.id)) + 1 : 0;
      setEditingPage({
        id: nextId,
        title: `Halaman ${nextId + 1}`,
        titleSize: 'lg',
        content: '',
        triggerQuestion: '',
        isGame: false
      });
      setPageEditorTab('content');
    }
    setGameEditorSubTab('code');
    setIsPageEditorOpen(true);
  };

  const handleOpenAddGame = async () => {
    if (!editingModule) return;
    if (games.length === 0) {
      try {
        const loadedGames = await firestoreService.getGames();
        setGames(loadedGames);
      } catch {}
    }
    setGameSelectorSearch('');
    setGameSelectorCategory('ALL');
    setIsGameSelectorModalOpen(true);
  };

  const handleSelectGameForModule = async (selectedGame: GameItem) => {
    if (!editingModule) return;
    const nextId = editingModule.pages.length > 0 ? Math.max(...editingModule.pages.map(p => p.id)) + 1 : 0;
    
    const newGamePage: ModulePage = {
      id: nextId,
      title: selectedGame.title || `Game Edukasi ${nextId + 1}`,
      titleSize: 'lg',
      content: selectedGame.instructions || selectedGame.description || '',
      triggerQuestion: '',
      isGame: true,
      gameId: selectedGame.id,
      gameType: selectedGame.type,
      gameCode: selectedGame.code,
      gameInstructions: selectedGame.instructions || '',
      gamePassScore: selectedGame.passScore || 70
    };

    const updatedPages = [...editingModule.pages, newGamePage];
    const updatedModule: AppModule = { ...editingModule, pages: updatedPages };
    
    setEditingModule(updatedModule);
    setModules(modules.map(m => m.id === updatedModule.id ? updatedModule : m));
    setIsGameSelectorModalOpen(false);
    showNotification(`Game "${selectedGame.title}" ditambahkan ke Draf Modul ${updatedModule.id}. Tekan 'Simpan Modul ke Firebase' untuk mempublikasikan.`, 'info');
  };

  const handleOpenCustomCodeGameEditor = () => {
    setIsGameSelectorModalOpen(false);
    if (!editingModule) return;
    const nextId = editingModule.pages.length > 0 ? Math.max(...editingModule.pages.map(p => p.id)) + 1 : 0;
    setEditingPage({
      id: nextId,
      title: `Game Interaktif ${nextId + 1}`,
      titleSize: 'lg',
      content: '',
      triggerQuestion: '',
      isGame: true,
      gameType: 'custom_html',
      gameCode: GAME_TEMPLATES[0]?.code || '',
      gameInstructions: 'Pilihlah huruf yang tepat untuk mengungkap kata misteri!'
    });
    setPageEditorTab('game');
    setGameEditorSubTab('code');
    setIsPageEditorOpen(true);
  };

  const handleSavePage = async () => {
    if (!editingModule || !editingPage) return;
    if (isSavingPage) return;
    setIsSavingPage(true);
    
    try {
      // Ensure isGame is synced with active tab if needed
      const finalPage: ModulePage = {
        ...editingPage,
        isGame: pageEditorTab === 'game' || !!editingPage.isGame
      };

      const pages = [...editingModule.pages];
      const index = pages.findIndex(p => p.id === finalPage.id);
      if (index >= 0) {
        pages[index] = finalPage;
      } else {
        pages.push(finalPage);
      }

      const updatedModule = { ...editingModule, pages };
      setEditingModule(updatedModule);
      setModules(modules.map(m => m.id === updatedModule.id ? updatedModule : m));
      setIsPageEditorOpen(false);
      setEditingPage(null);
      showNotification(`Halaman "${finalPage.title}" berhasil disimpan ke Draf Modul ${updatedModule.id}. Tekan 'Simpan Perubahan Modul ke Firebase' untuk menyimpan ke Cloud!`, 'info');
    } catch (err: any) {
      showNotification(`Gagal menyimpan halaman: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingPage(false);
    }
  };

  const handleDeletePage = async (pageId: number) => {
    if (!editingModule) return;
    if (editingModule.pages.length <= 1) {
      showNotification('Modul minimal harus memiliki 1 halaman.', 'error');
      return;
    }
    const pageObj = editingModule.pages.find(p => p.id === pageId);
    setDeleteModal({
      isOpen: true,
      type: 'page',
      id: pageId,
      targetName: pageObj?.title || `Halaman #${pageId + 1}`,
      title: `Hapus Halaman "${pageObj?.title || `Halaman ${pageId + 1}`}"?`,
      subtitle: 'Konten atau game pada halaman ini akan dihapus dari draf modul.',
      warningNote: 'Perubahan akan berlaku di draf modul ini.',
      data: { pageId }
    });
  };

  const handleReorderPages = (fromIndex: number, toIndex: number) => {
    if (!editingModule || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= editingModule.pages.length || toIndex >= editingModule.pages.length) return;

    const reorderedPages = [...editingModule.pages];
    const [movedPage] = reorderedPages.splice(fromIndex, 1);
    reorderedPages.splice(toIndex, 0, movedPage);

    const updatedModule: AppModule = {
      ...editingModule,
      pages: reorderedPages
    };

    setEditingModule(updatedModule);
    setModules(modules.map(m => m.id === updatedModule.id ? updatedModule : m));
    showNotification(`Urutan halaman "${movedPage.title || `Halaman ${fromIndex + 1}`}" dipindahkan ke Draf Modul.`, 'info');
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (!editingModule) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editingModule.pages.length) return;
    handleReorderPages(index, targetIndex);
  };

  // --- Handlers: Quizzes ---
  const currentModuleForQuiz = modules.find(m => m.id === selectedQuizModule);
  const currentQuiz = quizzes.find(q => q.moduleNumber === selectedQuizModule) || {
    moduleNumber: selectedQuizModule,
    title: currentModuleForQuiz ? `Kuis ${currentModuleForQuiz.title}` : `Kuis Modul ${selectedQuizModule}`,
    questions: []
  };

  const handleOpenQuestionModal = (q?: QuizQuestion) => {
    if (q) {
      setEditingQuestion(JSON.parse(JSON.stringify(q)));
    } else {
      const nextId = currentQuiz.questions.length > 0 ? Math.max(...currentQuiz.questions.map(x => x.id)) + 1 : 1;
      setEditingQuestion({
        id: nextId,
        question: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' }
        ],
        correctId: 'A',
        explanation: ''
      });
    }
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    if (isSavingQuiz) return;
    setIsSavingQuiz(true);

    try {
      const questions = [...currentQuiz.questions];
      const index = questions.findIndex(q => q.id === editingQuestion.id);
      if (index >= 0) {
        questions[index] = editingQuestion;
      } else {
        questions.push(editingQuestion);
      }

      const updatedQuiz: QuizConfig = {
        ...currentQuiz,
        questions
      };

      await firestoreService.saveQuiz(updatedQuiz);
      const updatedQuizzes = quizzes.some(q => q.moduleNumber === updatedQuiz.moduleNumber)
        ? quizzes.map(q => q.moduleNumber === updatedQuiz.moduleNumber ? updatedQuiz : q)
        : [...quizzes, updatedQuiz];
      setQuizzes(updatedQuizzes);
      setIsQuestionModalOpen(false);
      setEditingQuestion(null);
      showNotification('Soal kuis berhasil disimpan ke Firebase!', 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan soal kuis: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    const qObj = currentQuiz.questions.find(q => q.id === qId);
    setDeleteModal({
      isOpen: true,
      type: 'question',
      id: qId,
      targetName: `Soal #${qId}`,
      title: `Hapus Butir Soal Ini?`,
      subtitle: qObj?.question ? `"${qObj.question.substring(0, 90)}..."` : 'Soal kuis akan dihapus dari modul ini.',
      warningNote: 'Perubahan akan otomatis disimpan ke bank kuis Firebase.',
      data: { qId }
    });
  };

  // --- Handlers: Classes ---
  const handleAddClass = async () => {
    if (isAddingClass) return;
    const trimmed = newClassName.trim().toUpperCase();
    if (!trimmed) {
      showNotification('Nama kelas tidak boleh kosong.', 'error');
      return;
    }
    if (classes.some(c => (c.id || '').toUpperCase() === trimmed || (c.name || '').toUpperCase() === trimmed)) {
      showNotification('Kelas tersebut sudah ada.', 'error');
      return;
    }

    setIsAddingClass(true);
    try {
      const newClassItem: ClassItem = {
        id: trimmed,
        name: trimmed,
        isActive: true,
        studentCount: 0,
        description: `Kelas ${trimmed}`
      };

      // 1. Save directly to Cloud Firestore & local cache
      await firestoreService.saveClass(newClassItem);
      const updatedClasses = [...classes, newClassItem];
      setClasses(updatedClasses);
      setNewClassName('');

      let extraSyncInfo = '';
      // Google Apps Script Web App sync
      if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
        await Promise.allSettled([
          sheetService.syncClassAdded(trimmed),
          sheetService.syncClassesToSheet(updatedClasses)
        ]);
        extraSyncInfo = ' & disinkronkan ke Google Sheet';
      }

      showNotification(`Kelas ${trimmed} berhasil disimpan ke Database Cloud${extraSyncInfo}!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal menambahkan kelas: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsAddingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const target = classes.find(c => c.id === classId || c.name === classId);
    const displayName = target?.name || classId;
    setDeleteModal({
      isOpen: true,
      type: 'class',
      id: classId,
      targetName: displayName,
      title: `Hapus Kelas ${displayName}?`,
      subtitle: `Data kelas "${displayName}" akan dihapus dari aplikasi dan database.`,
      warningNote: `Tab Siswa_${displayName} dan Nilai_${displayName} pada Google Spreadsheet Anda akan dihapus/dibersihkan secara otomatis.`,
      data: target || { id: classId, name: displayName, isActive: true, studentCount: 0 }
    });
  };

  // --- Bulk Selection & Deletion for Classes ---
  const handleToggleSelectClass = (classIdOrName: string) => {
    const key = (classIdOrName || '').trim().toUpperCase();
    setSelectedClassIds(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleToggleSelectAllClasses = () => {
    if (selectedClassIds.length === classes.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map(c => (c.name || c.id).trim().toUpperCase()));
    }
  };

  const handleBulkDeleteClasses = () => {
    if (selectedClassIds.length === 0) return;
    const selectedList = classes.filter(c => selectedClassIds.includes((c.name || c.id).trim().toUpperCase()));
    const names = selectedList.map(c => c.name || c.id);
    setDeleteModal({
      isOpen: true,
      type: 'bulk_classes',
      id: 'bulk_cls',
      targetName: `${selectedList.length} Kelas`,
      title: `Hapus ${selectedList.length} Kelas Terpilih?`,
      subtitle: `Daftar kelas yang akan dihapus: ${names.join(', ')}`,
      warningNote: `Tab Siswa_[KELAS] dan Nilai_[KELAS] untuk ${selectedList.length} kelas ini pada Google Spreadsheet akan otomatis dihapus dan disinkronkan.`,
      data: { items: selectedList, keys: selectedClassIds }
    });
  };

  // --- Bulk Selection & Deletion for Students ---
  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleToggleSelectAllStudents = () => {
    const currentFilteredIds = filteredStudents.map(s => s.id);
    const allFilteredSelected = currentFilteredIds.length > 0 && currentFilteredIds.every(id => selectedStudentIds.includes(id));
    if (allFilteredSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    const selectedList = students.filter(s => selectedStudentIds.includes(s.id));
    setDeleteModal({
      isOpen: true,
      type: 'bulk_students',
      id: 'bulk_std',
      targetName: `${selectedList.length} Siswa`,
      title: `Hapus ${selectedList.length} Data Siswa Terpilih?`,
      subtitle: `Sebanyak ${selectedList.length} akun data siswa akan dihapus dari aplikasi & database.`,
      warningNote: `Data siswa di Google Spreadsheet tab kelas masing-masing akan diperbarui secara otomatis.`,
      data: { items: selectedList, ids: selectedStudentIds }
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setIsDeletingItem(true);

    try {
      if (deleteModal.type === 'class') {
        const cls = (deleteModal.data as ClassItem) || { id: String(deleteModal.id), name: String(deleteModal.targetName || deleteModal.id) };
        const classId = cls.id || String(deleteModal.id);
        const displayName = (cls.name || classId).trim().toUpperCase();

        // 1. Optimistic UI removal
        const updatedClasses = classes.filter(c => 
          (c.id || '').trim().toUpperCase() !== displayName && 
          (c.name || '').trim().toUpperCase() !== displayName
        );
        setClasses(updatedClasses);
        setSelectedClassIds(prev => prev.filter(k => k !== displayName));

        // 2. Perform deletion in local storage and Firestore
        try {
          await firestoreService.deleteClass(classId);
        } catch (e) {
          console.warn('Delete class storage/firestore note:', e);
        }

        // 3. If Google Apps Script is configured, delete tabs and update Ringkasan_Kelas
        if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
          sheetService.syncClassDeleted(displayName).catch(e => console.warn('Auto sync class delete tab error:', e));
          sheetService.syncClassesToSheet(updatedClasses).catch(e => console.warn('Auto sync class delete error:', e));
        }

        showNotification(`Kelas ${displayName} berhasil dihapus & Google Sheet disinkronkan.`, 'success');
      } else if (deleteModal.type === 'bulk_classes') {
        const targetClasses: ClassItem[] = deleteModal.data?.items || [];
        const targetKeys: string[] = deleteModal.data?.keys || targetClasses.map(c => (c.name || c.id).trim().toUpperCase());
        
        // 1. Optimistic UI removal
        const remainingClasses = classes.filter(c => !targetKeys.includes((c.name || c.id).trim().toUpperCase()));
        setClasses(remainingClasses);
        setSelectedClassIds([]);

        // 2. Perform deletion in local storage and Firestore
        for (const cls of targetClasses) {
          try {
            await firestoreService.deleteClass(cls.id || cls.name);
          } catch (e) {
            console.warn('Delete bulk class storage error:', e);
          }
        }

        // 3. Delete from Google Apps Script tabs
        if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
          for (const cls of targetClasses) {
            sheetService.syncClassDeleted(cls.name || cls.id).catch(e => console.warn('Auto sync bulk class delete tab error:', e));
          }
          sheetService.syncClassesToSheet(remainingClasses).catch(e => console.warn('Auto sync bulk classes list error:', e));
        }

        showNotification(`${targetClasses.length} kelas berhasil dihapus & Google Sheet disinkronkan.`, 'success');
      } else if (deleteModal.type === 'student') {
        const studentId = String(deleteModal.id);
        const stdName = deleteModal.targetName || 'Siswa';
        await firestoreService.deleteStudent(studentId);
        const updatedStudents = students.filter(s => s.id !== studentId);
        setStudents(updatedStudents);
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));

        if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
          sheetService.syncStudentsToSheet(updatedStudents).catch(e => console.warn('Auto sync student delete error:', e));
          showNotification(`Data ${stdName} dihapus & Google Sheet diperbarui.`, 'success');
        } else {
          showNotification(`Data ${stdName} dihapus.`, 'success');
        }
      } else if (deleteModal.type === 'bulk_students') {
        const targetStudents: StudentItem[] = deleteModal.data?.items || [];
        const targetIds: string[] = deleteModal.data?.ids || targetStudents.map(s => s.id);

        // 1. Optimistic UI update
        const remainingStudents = students.filter(s => !targetIds.includes(s.id));
        setStudents(remainingStudents);
        setSelectedStudentIds([]);

        // 2. Delete from Firestore
        for (const std of targetStudents) {
          try {
            await firestoreService.deleteStudent(std.id);
          } catch (e) {
            console.warn('Delete bulk student error:', e);
          }
        }

        // 3. Sync to Google Apps Script
        if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
          sheetService.syncStudentsToSheet(remainingStudents).catch(e => console.warn('Auto sync bulk students error:', e));
        }

        showNotification(`${targetStudents.length} data siswa berhasil dihapus & Google Sheet diperbarui.`, 'success');
      } else if (deleteModal.type === 'question') {
        const qId = Number(deleteModal.id);
        const questions = currentQuiz.questions.filter(q => q.id !== qId);
        const updatedQuiz: QuizConfig = { ...currentQuiz, questions };
        await firestoreService.saveQuiz(updatedQuiz);
        setQuizzes(quizzes.map(q => q.moduleNumber === updatedQuiz.moduleNumber ? updatedQuiz : q));
        showNotification('Soal kuis dihapus.', 'success');
      } else if (deleteModal.type === 'page') {
        if (editingModule) {
          const pageId = Number(deleteModal.id);
          const pages = editingModule.pages.filter(p => p.id !== pageId);
          const updatedModule = { ...editingModule, pages };
          setEditingModule(updatedModule);
          setModules(modules.map(m => m.id === updatedModule.id ? updatedModule : m));
          showNotification('Halaman telah dihapus dari Draf Modul lokal.', 'info');
        }
      }
    } catch (err: any) {
      showNotification(`Gagal menghapus: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsDeletingItem(false);
      setDeleteModal(null);
    }
  };

  const handleToggleClassStatus = async (classItem: ClassItem) => {
    if (isUpdatingClassId) return;
    setIsUpdatingClassId(classItem.id);
    try {
      const updated = { ...classItem, isActive: !classItem.isActive };
      await firestoreService.saveClass(updated);
      const updatedClasses = classes.map(c => c.id === updated.id ? updated : c);
      setClasses(updatedClasses);

      if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
        sheetService.syncClassesToSheet(updatedClasses).catch(e => console.warn('Auto sync class status error:', e));
      }
      showNotification(`Status kelas ${classItem.name} berhasil diubah ke ${updated.isActive ? 'Aktif' : 'Non-Aktif'}.`, 'success');
    } catch (err: any) {
      showNotification(`Gagal mengubah status kelas: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsUpdatingClassId(null);
    }
  };

  // --- Handlers: Students ---
  const handleSaveStudent = async () => {
    const resolvedClass = (editingStudent.userClass || (classes[0]?.name || classes[0]?.id || '')).trim().toUpperCase();
    if (!editingStudent.name?.trim() || !resolvedClass) {
      showNotification('Nama siswa dan kelas wajib diisi.', 'error');
      return;
    }
    if (isSavingStudent) return;
    setIsSavingStudent(true);

    try {
      await firestoreService.saveStudent({
        name: editingStudent.name.trim(),
        userClass: resolvedClass,
        nisn: editingStudent.nisn?.trim() || '',
        status: editingStudent.status || 'Aktif',
        id: editingStudent.id
      });

      const refreshed = await firestoreService.getStudents();
      setStudents(refreshed);
      setIsStudentModalOpen(false);
      const nextDefaultClass = studentFilterClass !== 'ALL' && studentFilterClass ? studentFilterClass : (classes[0]?.name || classes[0]?.id || resolvedClass);
      setEditingStudent({ name: '', userClass: nextDefaultClass, nisn: '', status: 'Aktif' });

      let syncMsg = '';
      // Apps Script sync
      if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
        await sheetService.syncStudentsToSheet(refreshed).catch(e => console.warn('Auto sync student error:', e));
        syncMsg = ' & disinkronkan ke Google Sheet';
      }

      showNotification(`Data siswa berhasil disimpan${syncMsg}!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan siswa: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const target = students.find(s => s.id === studentId);
    setDeleteModal({
      isOpen: true,
      type: 'student',
      id: studentId,
      targetName: target?.name || 'Siswa',
      title: `Hapus Data Siswa "${target?.name || 'Siswa'}"?`,
      subtitle: `Siswa Kelas ${target?.userClass || '-'} akan dihapus dari akun dan daftar pembelajaran.`,
      warningNote: `Data siswa di Google Spreadsheet tab Siswa_${target?.userClass || ''} akan otomatis diperbarui.`,
      data: target
    });
  };

  const handleBulkImportStudents = async () => {
    if (!bulkStudentText.trim()) return;
    const lines = bulkStudentText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const targetClass = (bulkStudentClass || (classes[0]?.name || classes[0]?.id || '')).trim().toUpperCase();
    if (!targetClass) {
      showNotification('Harap pilih target kelas terlebih dahulu.', 'error');
      return;
    }
    if (isImportingStudents) return;
    setIsImportingStudents(true);

    try {
      for (const line of lines) {
        // Support "NISN, Nama" or just "Nama"
        let nisn = '';
        let name = line;
        if (line.includes(',') || line.includes('\t')) {
          const parts = line.split(/,|\t/);
          nisn = parts[0]?.trim() || '';
          name = parts[1]?.trim() || parts[0]?.trim();
        }

        await firestoreService.saveStudent({
          name,
          userClass: targetClass,
          nisn,
          status: 'Aktif'
        });
      }

      const refreshed = await firestoreService.getStudents();
      setStudents(refreshed);
      setShowBulkModal(false);
      setBulkStudentText('');

      let syncMsg = '';
      // If Google Sheet is connected, auto sync bulk imported students immediately
      if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim().startsWith('http')) {
        await sheetService.syncStudentsToSheet(refreshed).catch(e => console.warn('Auto sync bulk students error:', e));
        syncMsg = ' & disinkronkan ke Google Sheet';
      }

      showNotification(`Berhasil mengimpor ${lines.length} siswa ke Kelas ${targetClass}${syncMsg}!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal mengimpor siswa: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsImportingStudents(false);
    }
  };

  // --- Handlers: Copy Apps Script Code ---
  const handleCopyAppsScript = () => {
    const code = sheetService.getAppsScriptTemplate(settings.sheetId);
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
    showNotification('Kode Google Apps Script berhasil disalin ke clipboard!', 'success');
  };

  // --- Handlers: Live Test Google Sheet Connection ---
  const handleTestSheetConnection = async () => {
    if (!settings.googleAppsScriptUrl || !settings.googleAppsScriptUrl.trim().startsWith('http')) {
      showNotification('Harap masukkan URL Google Apps Script Web App terlebih dahulu!', 'error');
      return;
    }
    setIsTestingSheetConnection(true);
    setSheetTestResult(null);
    try {
      const res = await sheetService.testConnection(settings.googleAppsScriptUrl);
      setSheetTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs,
        classesCount: res.classesCount,
        studentsCount: res.studentsCount,
        scoresCount: res.scoresCount,
        classList: res.classList
      });
      if (res.success) {
        showNotification(`Koneksi Sukses (${res.latencyMs}ms)! Terdeteksi ${res.classesCount} Kelas & ${res.studentsCount} Siswa.`, 'success');
      } else {
        showNotification(`Uji koneksi gagal: ${res.message}`, 'error');
      }
    } catch (e: any) {
      setSheetTestResult({
        tested: true,
        success: false,
        message: e?.message || 'Gagal terhubung ke Google Apps Script.'
      });
      showNotification(`Uji koneksi gagal: ${e?.message}`, 'error');
    } finally {
      setIsTestingSheetConnection(false);
    }
  };

  // --- Handler: Simpan Konfigurasi Spreadsheet & CSV ke Firebase ---
  const handleSaveSpreadsheetConfig = async () => {
    setIsSavingSettings(true);
    try {
      const rawSheet = spreadsheetInput.trim();
      const rawCsv = csvInput.trim();

      let finalSheetUrl = '';
      let finalSheetId = '';
      if (rawSheet) {
        finalSheetUrl = resolveSheetUrl(rawSheet);
        finalSheetId = extractSpreadsheetId(rawSheet);
      }

      let finalCsvUrl = '';
      if (rawCsv) {
        finalCsvUrl = resolveCsvUrl(rawCsv);
      }

      const updatedSettings: AppSettings = {
        ...settings,
        sheetUrl: finalSheetUrl,
        sheetId: finalSheetId,
        studentCsvUrl: finalCsvUrl
      };

      await firestoreService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setStudentCsvUrl(finalCsvUrl);
      showNotification('Link dan ID berhasil disimpan ke Firebase!', 'success');
    } catch (e: any) {
      showNotification(`Gagal menyimpan: ${e?.message || e}`, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // --- Handlers: Pull Student Data From CSV ---
  const handlePullStudentsFromCsv = async () => {
    if (!studentCsvUrl || !studentCsvUrl.trim().startsWith('http')) {
      showNotification('Harap masukkan URL CSV Google Spreadsheet yang valid!', 'error');
      return;
    }

    setIsPullingCsv(true);
    showNotification('Sedang mengunduh dan menganalisis data CSV dari Google Spreadsheet...', 'info');

    try {
      const result = await sheetService.pullStudentsFromCsv(studentCsvUrl);
      if (!result.success || !result.students || !result.classes) {
        showNotification(result.message || 'Gagal memproses data CSV.', 'error');
        return;
      }

      await firestoreService.replaceAllClasses(result.classes);
      await firestoreService.replaceAllStudents(result.students);

      const updatedSettings = {
        ...settings,
        studentCsvUrl: studentCsvUrl.trim()
      };
      setSettings(updatedSettings);
      await firestoreService.saveSettings(updatedSettings);

      setClasses(result.classes);
      setStudents(result.students);

      showNotification(
        `Berhasil menarik ${result.students.length} siswa dan membuat ${result.classes.length} kelas baru! Semua siswa otomatis diatur rapi per kelas.`,
        'success'
      );
    } catch (err: any) {
      console.error('Error pulling CSV students:', err);
      showNotification(`Gagal menarik data siswa: ${err?.message || err}`, 'error');
    } finally {
      setIsPullingCsv(false);
    }
  };

  // --- Handlers: Pull Data From Google Sheet ---
  const handlePullDataFromSheet = async () => {
    if (!settings.googleAppsScriptUrl || !settings.googleAppsScriptUrl.trim().startsWith('http')) {
      showNotification('Harap masukkan URL Google Apps Script Web App terlebih dahulu!', 'error');
      return;
    }

    setIsSyncingSheet(true);
    setSyncStatusMsg('Menghubungi Google Apps Script & membaca data...');

    try {
      // First save the current URL setting
      await firestoreService.saveSettings(settings);

      const result = await sheetService.fetchDataFromSheet(settings.googleAppsScriptUrl);
      
      if (!result.success) {
        showNotification(result.message, 'error');
        setIsSyncingSheet(false);
        setSyncStatusMsg('');
        return;
      }

      setSyncStatusMsg('Menyinkronkan data ke Firebase Firestore...');

      const newClasses = result.classes || [];
      const newStudents = result.students || [];
      const newScores = result.scores || [];

      // Accurately mirror Google Spreadsheet (if empty in sheet, clears app data too)
      await firestoreService.replaceAllClasses(newClasses);
      await firestoreService.replaceAllStudents(newStudents);
      await firestoreService.replaceAllScores(newScores);

      setClasses(newClasses);
      setStudents(newStudents);
      setScores(newScores);

      showNotification(result.message, 'success');
    } catch (err: any) {
      showNotification(`Gagal sinkronisasi: ${err?.message || 'Error jaringan'}`, 'error');
    } finally {
      setIsSyncingSheet(false);
      setSyncStatusMsg('');
    }
  };

  // --- Handlers: Push Local Data to Google Sheet ---
  const handlePushDataToSheet = async () => {
    if (!settings.googleAppsScriptUrl || !settings.googleAppsScriptUrl.trim().startsWith('http')) {
      showNotification('Harap masukkan URL Web App Google Apps Script terlebih dahulu.', 'error');
      return;
    }

    setIsSyncingSheet(true);
    setSyncStatusMsg('Mengirim data ke Web App Google Apps Script...');

    try {
      const res = await sheetService.syncAllToGoogleSheet(classes, students, scores);
      if (res.success) {
        showNotification('Berhasil! Seluruh data kelas, siswa, dan nilai telah tertulis ke Google Spreadsheet.', 'success');
      } else {
        showNotification(res.message, 'error');
      }
    } catch (err: any) {
      showNotification(`Gagal mengirim data: ${err?.message}`, 'error');
    } finally {
      setIsSyncingSheet(false);
      setSyncStatusMsg('');
    }
  };

  // --- Handlers: Disconnect / Reset Sheet Connection ---
  const handleDisconnectSheet = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan dan mereset koneksi Google Sheet? Anda dapat menghubungkannya kembali kapan saja.')) {
      return;
    }

    const newSettings = {
      ...settings,
      googleAppsScriptUrl: '',
      sheetUrl: '',
      sheetId: ''
    };

    setSettings(newSettings);
    await firestoreService.saveSettings(newSettings);
    showNotification('Koneksi Google Sheet telah direset.', 'success');
  };

  // --- Handlers: Settings & Customization ---
  const handleSaveSettings = async () => {
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      await firestoreService.saveSettings(settings);
      showNotification('Pengaturan & Logo berhasil tersimpan ke Firebase Firestore! Semua pengguna akan melihat perubahannya.', 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan pengaturan ke cloud: ${err?.message || 'Error jaringan'}`, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveTabSettings = async (tabName: 'Logo' | 'Sidebar' | 'Home' | 'Umum') => {
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      let latestSettings = { ...settings };
      if (tabName === 'Logo' && logoUrlInput.trim() && logoUrlInput !== settings.logoUrl && !logoUrlInput.startsWith('data:image')) {
        const normalized = normalizeImageUrl(logoUrlInput.trim());
        latestSettings.logoUrl = normalized;
        setSettings(latestSettings);
      }
      await firestoreService.saveSettings(latestSettings);
      showNotification(`Pengaturan ${tabName} berhasil disimpan ke Firebase!`, 'success');
    } catch (err: any) {
      showNotification(`Gagal menyimpan pengaturan ${tabName}: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetSettingsToDefault = () => {
    if (!window.confirm('Kembalikan semua pengaturan logo, sidebar, dan halaman utama ke default awal?')) return;
    setSettings(DEFAULT_SETTINGS);
    showNotification('Pengaturan dikembalikan ke default. Klik "Simpan Pengaturan" untuk menyimpannya.', 'success');
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran file gambar logo maksimal 5MB.', 'error');
        return;
      }
      try {
        showNotification('Mengompresi logo agar optimal untuk cloud...', 'info');
        const compressedBase64 = await compressImage(file, 400, 0.85);
        const updated = { ...settings, logoUrl: compressedBase64 };
        setSettings(updated);
        setLogoUrlInput(compressedBase64.substring(0, 40) + '... (File Gambar Base64)');
        setLogoUrlFeedback({ status: 'valid', message: 'File gambar logo berhasil diunggah & dikompresi.' });
        await firestoreService.saveSettings(updated);
        showNotification('Logo baru berhasil dikompresi dan disimpan ke Firebase! Semua orang dapat melihat logo baru ini.', 'success');
      } catch (err: any) {
        console.error('Error compressing/saving logo:', err);
        showNotification(`Gagal mengunggah logo: ${err?.message || 'Error'}`, 'error');
      }
    }
  };

  const handleApplyAndSaveLogoUrl = async (customUrl?: string) => {
    const rawUrl = customUrl !== undefined ? customUrl : logoUrlInput;
    if (!rawUrl || !rawUrl.trim()) {
      showNotification('Silakan masukkan link URL gambar logo terlebih dahulu.', 'error');
      return;
    }

    const normalized = normalizeImageUrl(rawUrl);
    setLogoUrlInput(normalized);
    setIsTestingLogoUrl(true);
    setLogoUrlFeedback({ status: 'idle', message: 'Memverifikasi dan memuat gambar logo...' });

    const isValid = await testImageLoad(normalized, 7000);
    setIsTestingLogoUrl(false);

    if (isValid) {
      setLogoUrlFeedback({
        status: 'valid',
        message: 'Gambar berhasil diverifikasi & dimuat!'
      });
      const updated = { ...settings, logoUrl: normalized };
      setSettings(updated);
      try {
        await firestoreService.saveSettings(updated);
        showNotification('URL Logo baru berhasil diterapkan & tersimpan ke Firebase! Semua pengguna yang mengakses link share akan melihat logo ini.', 'success');
      } catch (err: any) {
        showNotification(`URL logo valid, tapi gagal simpan ke cloud: ${err?.message || 'Error'}`, 'error');
      }
    } else {
      setLogoUrlFeedback({
        status: 'invalid',
        message: 'Gambar belum dapat dimuat dari link ini. Pastikan link bersifat publik atau gunakan tombol "Unggah File Logo".'
      });
      const updated = { ...settings, logoUrl: normalized };
      setSettings(updated);
      showNotification('Perhatian: URL gambar tidak merespons. Jika memakai Google Drive, pastikan izin file diatur ke "Siapa saja yang memiliki link".', 'error');
    }
  };

  // --- Filtered Data ---
  const filteredStudents = students.filter(s => {
    const matchClass = studentFilterClass === 'ALL' || s.userClass === studentFilterClass;
    const matchSearch = !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.nisn && s.nisn.includes(studentSearch));
    return matchClass && matchSearch;
  });

  const filteredScores = scores.filter(sc => {
    const matchClass = scoreFilterClass === 'ALL' || sc.userClass === scoreFilterClass;
    const matchMod = scoreFilterModule === 'ALL' || sc.moduleNumber.toString() === scoreFilterModule;
    const matchSearch = !scoreSearch || sc.username.toLowerCase().includes(scoreSearch.toLowerCase());
    return matchClass && matchMod && matchSearch;
  });

  // Calculate statistics
  const totalSubmissions = scores.length;
  const avgScore = totalSubmissions > 0 ? Math.round(scores.reduce((acc, s) => acc + (s.percentage || 0), 0) / totalSubmissions) : 0;
  const passedCount = scores.filter(s => (s.percentage || 0) >= 75).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  // Navigation menu sections for both desktop and mobile drawer
  const navSections = [
    {
      category: 'Konten Pembelajaran',
      items: [
        { id: 'materi' as const, label: 'Materi & Modul', icon: BookOpen, count: modules.length, color: 'text-emerald-600' },
        { id: 'kuis' as const, label: 'Bank Soal & Kuis', icon: HelpCircle, count: quizzes.length, color: 'text-emerald-600' },
        { id: 'game' as const, label: 'Kelola Game', icon: Gamepad2, count: games.length, color: 'text-purple-600', badgeClass: 'bg-purple-100 text-purple-800' }
      ]
    },
    {
      category: 'Siswa & Kelas',
      items: [
        { id: 'nilai' as const, label: 'Rekapitulasi Nilai', icon: BarChart3, count: scores.length, color: 'text-emerald-600' },
        { id: 'log' as const, label: 'Log Aktivitas', icon: Activity, count: undefined, color: 'text-emerald-600' }
      ]
    },
    {
      category: 'Integrasi & Sistem',
      items: [
        { id: 'appscript' as const, label: 'Kode App Script', icon: Code2, count: undefined, color: 'text-indigo-600', badgeClass: 'bg-indigo-100 text-indigo-800' },
        { id: 'spreadsheet' as const, label: 'Login', icon: FileSpreadsheet, count: undefined, color: 'text-emerald-600' },
        { id: 'pengaturan' as const, label: 'Pengaturan Umum', icon: Settings, count: undefined, color: 'text-emerald-600' },
        { id: 'firebase' as const, label: 'Firebase', icon: Flame, count: undefined, color: 'text-amber-600' }
      ]
    }
  ];

  const getActiveTabTitle = () => {
    for (const sec of navSections) {
      const match = sec.items.find(i => i.id === activeTab);
      if (match) return match.label;
    }
    return 'Menu Pengelolaan';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col relative">
      {/* --- FLOATING MOBILE SIDEBAR TRIGGER BUTTONS (2 SEPARATE BUTTONS ON LEFT EDGE) --- */}
      <aside aria-label="Navigasi Menu HP" className="md:hidden">
        {/* Tombol Sidebar Modul (Atas) - Warna Indigo */}
        <button
          id="btn-module-mobile-nav-trigger"
          onClick={() => setIsMobileModuleSidebarOpen(true)}
          className="fixed left-0 top-[calc(50%-44px)] -translate-y-1/2 z-40 w-[30px] h-[72px] bg-indigo-700/90 hover:bg-indigo-800 text-white backdrop-blur-md rounded-r-2xl border border-l-0 border-indigo-400/40 flex items-center justify-center shadow-xl cursor-pointer active:scale-95 transition-all group overflow-hidden"
          title="Buka Daftar Modul"
          aria-label="Buka Daftar Modul"
        >
          <BookOpen size={16} className="text-white opacity-95 group-hover:scale-110 transition-transform" />
        </button>

        {/* Tombol Sidebar Panel Admin (Bawah) - Warna Emerald */}
        <button
          id="btn-admin-mobile-nav-trigger"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="fixed left-0 top-[calc(50%+44px)] -translate-y-1/2 z-40 w-[30px] h-[72px] bg-emerald-800/90 hover:bg-emerald-900 text-white backdrop-blur-md rounded-r-2xl border border-l-0 border-emerald-400/40 flex items-center justify-center shadow-xl cursor-pointer active:scale-95 transition-all group overflow-hidden"
          title="Buka Menu Pengelolaan Admin"
          aria-label="Buka Menu Pengelolaan Admin"
        >
          <Menu size={16} className="text-white opacity-95 group-hover:scale-110 transition-transform" />
        </button>
      </aside>

      {/* --- MOBILE MODULE SIDEBAR DRAWER (SLIDE-OVER FROM LEFT) --- */}
      <AnimatePresence>
        {isMobileModuleSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileModuleSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide-over Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-4/5 max-w-xs bg-white text-slate-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-r border-slate-200"
            >
              {/* Drawer Header */}
              <div className="p-4 bg-gradient-to-r from-indigo-700 to-purple-800 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm shadow-inner">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-wide text-white">Daftar Modul</h2>
                    <p className="text-[10px] text-indigo-100 font-medium">
                      {modules.length} Modul Tersedia
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileModuleSidebarOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  aria-label="Tutup daftar modul"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Module List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    handleAddNewModule();
                    setIsMobileModuleSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Tambah Modul</span>
                </button>

                <div className="space-y-1.5 pt-1">
                  {modules.map(mod => {
                    const isVisible = mod.isPublished !== false;
                    const isSelected = selectedModuleId === mod.id;
                    return (
                      <div
                        key={mod.id}
                        className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectModuleForEdit(mod);
                            setActiveTab('materi');
                            setIsMobileModuleSidebarOpen(false);
                          }}
                          className="flex-1 text-left text-xs font-bold truncate cursor-pointer py-0.5"
                        >
                          Modul {mod.id}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleModulePublished(mod.id, e)}
                          title={isVisible ? "Tampil (Klik untuk sembunyikan)" : "Sembunyi (Klik untuk tampilkan)"}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? isVisible
                                ? 'text-emerald-100 hover:bg-white/20'
                                : 'text-amber-200 hover:bg-white/20'
                              : isVisible
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                        >
                          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* --- MOBILE SIDEBAR DRAWER (SLIDE-OVER FROM LEFT) --- */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide-over Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-4/5 max-w-xs bg-white text-slate-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-r border-slate-200"
            >
              {/* Drawer Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg shadow-inner">
                    👨‍🏫
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-wide text-white">Menu Pengelolaan</h2>
                    <p className="text-[10px] text-emerald-100 font-medium truncate max-w-[170px]">
                      {settings.schoolName || 'Panel Admin & Guru'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  aria-label="Tutup menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Items List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {navSections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {sec.category}
                    </div>
                    <div className="space-y-1">
                      {sec.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-md font-bold'
                                : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                            }`}
                          >
                            <Icon size={16} className={isActive ? 'text-white' : item.color} />
                            <span className="flex-1 truncate">{item.label}</span>
                            {typeof item.count === 'number' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                                isActive ? 'bg-white/25 text-white' : (item.badgeClass || 'bg-slate-200 text-slate-700')
                              }`}>
                                {item.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    onBackToStudentView();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition-colors"
                >
                  <Eye size={14} />
                  <span>Lihat Tampilan Siswa</span>
                </button>
                
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Keluar Admin</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOP ADMIN HEADER (DESKTOP ONLY - TERSEMBUNYI DI HP) --- */}
      <header className="hidden md:flex bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 py-3.5 items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
            👨‍🏫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Panel Admin & Guru
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Firebase Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {settings.schoolName || 'Modul Pembelajaran Digital'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Sinkronisasi offline & cek pembaruan"
          >
            <Cloud size={14} className="text-emerald-600" />
            <span>Sinkronkan Data</span>
          </button>

          <button
            onClick={() => onBackToStudentView()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Eye size={14} />
            <span>Tampilan Siswa</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* --- NOTIFICATION TOAST --- */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-18 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 max-w-md ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : actionMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : actionMessage.type === 'info' ? (
              <RefreshCw size={18} className="text-blue-600 animate-spin shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAIN ADMIN CONTENT LAYOUT --- */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* --- DESKTOP SIDEBAR TABS NAVIGATION --- */}
        <aside className="hidden md:flex w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0 flex-col gap-4 overflow-y-auto">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {sec.category}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {typeof item.count === 'number' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                            item.badgeClass || 'bg-slate-200 text-slate-600'
                          }`}>
                            {item.count}
                          </span>
                        )}
                      </button>

                      {/* Sub-list modul hanya di sidebar */}
                      {item.id === 'materi' && (
                        <div className="pl-3 mt-1 space-y-1 border-l-2 border-emerald-200 ml-3">
                          {modules.map((mod) => {
                            const isSelected = activeTab === 'materi' && selectedModuleId === mod.id;
                            const isVisible = mod.isPublished !== false;
                            return (
                              <div key={mod.id} className="flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('materi');
                                    handleSelectModuleForEdit(mod);
                                  }}
                                  className={`flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all truncate cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                                  }`}
                                >
                                  Modul {mod.id}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleModulePublished(mod.id, e)}
                                  className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                                    isSelected
                                      ? 'text-white hover:bg-emerald-700'
                                      : isVisible
                                      ? 'text-emerald-600 hover:bg-slate-200'
                                      : 'text-amber-600 hover:bg-slate-200'
                                  }`}
                                  title={isVisible ? 'Tampil' : 'Sembunyi'}
                                >
                                  {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={handleAddNewModule}
                            className="w-full mt-1.5 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer border border-emerald-200"
                          >
                            <Plus size={12} />
                            <span>+ Tambah Modul</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* --- MAIN TAB CONTENT AREA --- */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <RefreshCw size={24} className="animate-spin text-emerald-600" />
              <p className="text-xs">Memuat data dari Firebase Firestore...</p>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* TAB 1: KELOLA MATERI & MODUL (FIREBASE)                                  */}
              {/* ========================================================================= */}
              {activeTab === 'materi' && (
                <div className="space-y-5 max-w-7xl">
                  {/* --- AREA DETAIL & EDITOR MODUL TERPILIH --- */}
                  <div className="w-full">
                    {editingModule ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5">
                        {/* Header Modul: Judul & Status Draf */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black shrink-0">
                              Modul {editingModule.id}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                              {editingModule.title || `Modul ${editingModule.id}`}
                            </h3>
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-medium">
                              Mode Draf
                            </span>
                          </div>
                        </div>

                        {/* Module Metadata Form */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Judul Modul
                            </label>
                            <input
                              type="text"
                              value={editingModule.title}
                              onChange={e => {
                                const newTitle = e.target.value;
                                setEditingModule({ ...editingModule, title: newTitle });
                                setModules(prev => prev.map(m => m.id === editingModule.id ? { ...m, title: newTitle } : m));
                              }}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Sub-judul / Topik Materi
                            </label>
                            <input
                              type="text"
                              value={editingModule.subtitle}
                              onChange={e => setEditingModule({ ...editingModule, subtitle: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Password Pembuka Modul (Kosongkan jika bebas)
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: 121212"
                              value={editingModule.password || ''}
                              onChange={e => setEditingModule({ ...editingModule, password: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono"
                            />
                          </div>
                        </div>

                        {/* Pages Section */}
                        <div className="space-y-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPageEditor()}
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 active:scale-95 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>+ Tambah Halaman Materi</span>
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(editingModule.pages || []).map((page, idx) => {
                              const isDraggingThis = draggedPageIndex === idx;
                              const isDragOverThis = dragOverPageIndex === idx && draggedPageIndex !== idx;

                              return (
                                <div
                                  key={page.id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedPageIndex(idx);
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', String(idx));
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverPageIndex !== idx) {
                                      setDragOverPageIndex(idx);
                                    }
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    setDragOverPageIndex(idx);
                                  }}
                                  onDragLeave={(e) => {
                                    e.preventDefault();
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedPageIndex !== null && draggedPageIndex !== idx) {
                                      handleReorderPages(draggedPageIndex, idx);
                                    }
                                    setDraggedPageIndex(null);
                                    setDragOverPageIndex(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedPageIndex(null);
                                    setDragOverPageIndex(null);
                                  }}
                                  className={`rounded-xl p-3 sm:p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 transition-all select-none ${
                                    isDraggingThis
                                      ? 'opacity-40 border-2 border-dashed border-emerald-400 bg-emerald-50/30'
                                      : isDragOverThis
                                      ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/70 shadow-md scale-[1.01]'
                                      : page.isGame
                                      ? 'bg-white border border-indigo-200 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-white hover:border-indigo-300 shadow-xs'
                                      : 'bg-white border border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                    {/* Drag Handle */}
                                    <div
                                      className="p-1.5 text-slate-400 hover:text-slate-700 active:text-emerald-600 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100 transition-colors shrink-0 touch-manipulation"
                                      title="Tarik ke atas atau ke bawah untuk memindahkan urutan"
                                    >
                                      <GripVertical size={16} />
                                    </div>

                                    {/* Reorder Buttons Up/Down for touch / quick click */}
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMovePage(idx, 'up')}
                                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all cursor-pointer touch-manipulation"
                                        title="Pindahkan ke atas (Halaman sebelumnya)"
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === (editingModule.pages?.length || 0) - 1}
                                        onClick={() => handleMovePage(idx, 'down')}
                                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all cursor-pointer touch-manipulation"
                                        title="Pindahkan ke bawah (Halaman berikutnya)"
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                    </div>

                                    {/* Page Number Badge */}
                                    <span
                                      className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center font-bold shrink-0 ${
                                        page.isGame
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                      title={`Posisi Urutan: Halaman ${idx + 1}`}
                                    >
                                      {idx + 1}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-xs font-bold text-slate-900 truncate">
                                          {page.title || `Halaman ${idx + 1}`}
                                        </h5>
                                        {page.isGame && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0 flex items-center gap-1">
                                            <Gamepad2 size={11} />
                                            {page.gameType === 'custom_tsx' ? 'Game TSX/React' : page.gameType === 'custom_html' ? 'Game HTML5' : 'Game Edukasi'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                                        {page.isGame && (
                                          <span className="inline-flex items-center gap-0.5 text-indigo-600 font-semibold">
                                            <Code2 size={11} /> Kode Game Aktif
                                          </span>
                                        )}
                                        {page.videoUrl && (
                                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold">
                                            <Video size={11} /> Video
                                          </span>
                                        )}
                                        {page.imageUrl && (
                                          <span className="inline-flex items-center gap-0.5 text-sky-600 font-semibold">
                                            <ImageIcon size={11} /> Gambar
                                          </span>
                                        )}
                                        {page.quiz && (
                                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
                                            <HelpCircle size={11} /> Pertanyaan Refleksi
                                          </span>
                                        )}
                                        {page.isSheet && (
                                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                                            <FileSpreadsheet size={11} /> Sheet Embed
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPageEditor(page)}
                                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        page.isGame 
                                          ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200' 
                                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                      }`}
                                    >
                                      <Edit size={13} />
                                      <span>{page.isGame ? 'Edit Game' : 'Edit Isi'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePage(page.id)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Hapus Halaman"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Tombol Simpan Perubahan Modul Khusus di Bawah & Tombol Hapus */}
                          <div className="pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => onBackToStudentView(editingModule.id)}
                                className="py-3.5 px-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-sm font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
                                title={`Buka dan uji Modul ${editingModule.id} di tampilan siswa`}
                              >
                                <Eye size={18} />
                                <span>Pratinjau</span>
                              </button>

                              <button
                                type="button"
                                disabled={isSavingSingleModule}
                                onClick={handleSaveModuleMeta}
                                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white rounded-2xl text-sm sm:text-base font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isSavingSingleModule ? (
                                  <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Menyimpan Modul {editingModule.id} ke Firebase...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save size={18} />
                                    <span>Simpan Perubahan Modul {editingModule.id}</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteModule(editingModule.id)}
                                className="p-3.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-2xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center shrink-0"
                                title="Hapus Modul Ini"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <BookOpen size={36} className="text-slate-400 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">Pilih salah satu modul di samping untuk mulai mengedit</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: KELOLA BANK SOAL & KUIS (FIREBASE)                                */}
              {/* ========================================================================= */}
              {activeTab === 'kuis' && (
                <div className="space-y-6 max-w-5xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Kelola Bank Soal & Kuis</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelola butir soal pilihan ganda, kunci jawaban, dan pembahasan kuis untuk setiap modul.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenQuestionModal()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      <Plus size={16} />
                      <span>Tambah Butir Soal</span>
                    </button>
                  </div>

                  {/* Module Quiz Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 mr-1">Pilih Kuis Modul:</span>
                    {modules.length === 0 ? (
                      <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        Belum ada modul di menu "Materi & Modul". Silakan buat modul terlebih dahulu.
                      </span>
                    ) : (
                      modules.map((mod, idx) => {
                        const qCount = quizzes.find(q => q.moduleNumber === mod.id)?.questions?.length || 0;
                        const isSelected = selectedQuizModule === mod.id;
                        return (
                          <button
                            key={`quiz-mod-btn-${mod.id}-${idx}`}
                            onClick={() => setSelectedQuizModule(mod.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{mod.title || `Modul ${mod.id}`}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                              isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {qCount} Soal
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Questions List for Current Module */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Daftar Soal {currentQuiz.title} ({currentQuiz.questions?.length || 0} Soal)
                      </h3>
                    </div>

                    {currentQuiz.questions?.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                        Belum ada butir soal untuk kuis ini. Klik tombol <strong>"Tambah Butir Soal"</strong> di atas atau gunakan tombol <strong>"Inisialisasi Materi (1-Click)"</strong>.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentQuiz.questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 leading-relaxed">
                                    {q.question}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenQuestionModal(q)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                  title="Edit Soal"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Hapus Soal"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Options List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                              {q.options?.map(opt => (
                                <div
                                  key={opt.id}
                                  className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                                    opt.id === q.correctId
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    opt.id === q.correctId ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {opt.id}
                                  </span>
                                  <span className="truncate">{opt.text}</span>
                                  {opt.id === q.correctId && (
                                    <span className="ml-auto text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                                      Kunci
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2.5: KELOLA GAME EDUKASI & KODE (HTML/REACT/MODULAR)                 */}
              {/* ========================================================================= */}
              {activeTab === 'game' && (
                <AdminGameManager
                  games={games}
                  modules={modules}
                  onSaveGame={handleSaveGameFromManager}
                  onDeleteGame={handleDeleteGameFromManager}
                  onSyncAllGames={handleSyncAllGamesFromManager}
                  onResetDefaultGames={handleResetDefaultGamesFromManager}
                  onEmbedGameToModule={handleEmbedGameToModuleFromManager}
                  isSyncing={isCloudSyncing}
                  showNotification={showNotification}
                />
              )}

              {/* ========================================================================= */}
              {/* TAB 3: KELOLA KELAS (GOOGLE SHEET & FIRESTORE)                           */}
              {/* ========================================================================= */}
              {activeTab === 'kelas' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Kelola Daftar Kelas</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Daftar kelas yang dapat dipilih siswa saat login. Otomatis disinkronkan ke Google Sheet.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Action buttons */}
                      {settings.sheetUrl && (
                        <a
                          href={settings.sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          title="Buka file Google Spreadsheet terhubung di tab baru untuk melihat dan mengedit data kelas & siswa"
                        >
                          <FileSpreadsheet size={14} />
                          <span>Buka Google Sheet</span>
                          <ExternalLink size={12} />
                        </a>
                      )}

                      {settings.googleAppsScriptUrl && (
                        <>
                          <button
                            onClick={handlePullDataFromSheet}
                            disabled={isSyncingSheet}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            title="Tarik data kelas dan tab dari Google Sheet"
                          >
                            <RefreshCw size={13} className={isSyncingSheet ? 'animate-spin' : ''} />
                            <span>Tarik dari Sheet</span>
                          </button>

                          <button
                            onClick={async () => {
                              setIsSyncingSheet(true);
                              try {
                                const res = await sheetService.syncClassesToSheet(classes);
                                if (res.success) {
                                  showNotification('Daftar kelas berhasil dikirim dan disamakan ke Google Sheet!', 'success');
                                } else {
                                  showNotification(res.message, 'error');
                                }
                              } catch (e: any) {
                                showNotification('Gagal menyinkronkan kelas ke sheet: ' + e?.message, 'error');
                              } finally {
                                setIsSyncingSheet(false);
                              }
                            }}
                            disabled={isSyncingSheet}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            title="Kirim dan samakan daftar kelas aplikasi ini ke Google Sheet"
                          >
                            <Upload size={13} />
                            <span>Kirim ke Sheet</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add Class Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Masukkan Nama Kelas (misal: 7A, 8A, 9A)..."
                      value={newClassName}
                      disabled={isAddingClass}
                      onChange={e => setNewClassName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isAddingClass && newClassName.trim()) {
                          handleAddClass();
                        }
                      }}
                      className="flex-1 min-w-[200px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-semibold uppercase disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <button
                      onClick={handleAddClass}
                      disabled={isAddingClass || !newClassName.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isAddingClass ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Menambahkan...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={15} />
                          <span>Tambah Kelas</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bulk Selection Bar for Classes */}
                  {selectedClassIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                        <CheckSquare size={16} className="text-rose-600 shrink-0" />
                        <span>{selectedClassIds.length} dari {classes.length} kelas dipilih</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClassIds([])}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-all cursor-pointer"
                        >
                          Batal Pilihan
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDeleteClasses}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Hapus {selectedClassIds.length} Kelas Terpilih</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Classes Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={classes.length > 0 && selectedClassIds.length === classes.length}
                              onChange={handleToggleSelectAllClasses}
                              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              title={selectedClassIds.length === classes.length ? "Batal pilih semua" : "Pilih semua kelas"}
                            />
                          </th>
                          <th className="py-3 px-4">Nama Kelas</th>
                          <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {classes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              <p className="text-xs">Belum ada daftar kelas. Silakan tambah kelas baru atau sinkronkan dari Spreadsheet.</p>
                            </td>
                          </tr>
                        ) : (
                          classes.map((cls, idx) => {
                            const isSelected = selectedClassIds.includes((cls.name || cls.id).trim().toUpperCase());
                            const studentCount = students.filter(s => (s.userClass || '').trim().toUpperCase() === (cls.name || cls.id).trim().toUpperCase()).length;

                            return (
                              <tr 
                                key={`cls-row-${cls.id || cls.name}-${idx}`} 
                                className={`transition-all ${isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/70'}`}
                              >
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectClass(cls.name || cls.id)}
                                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-bold text-slate-900 text-sm">Kelas {cls.name}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => {
                                      setStudentFilterClass(cls.name || cls.id);
                                      setActiveTab('siswa');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                                    title={`Lihat dan kelola ${studentCount} siswa di Kelas ${cls.name}`}
                                  >
                                    <Users size={13} />
                                    <span>{studentCount} Siswa</span>
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    disabled={isUpdatingClassId === cls.id}
                                    onClick={() => handleToggleClassStatus(cls)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-60 inline-flex items-center gap-1 ${
                                      cls.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {isUpdatingClassId === cls.id ? (
                                      <>
                                        <Loader2 size={11} className="animate-spin" />
                                        <span>Menyimpan...</span>
                                      </>
                                    ) : (
                                      cls.isActive ? 'Aktif' : 'Non-Aktif'
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setStudentFilterClass(cls.name || cls.id);
                                        setActiveTab('siswa');
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                      title="Kelola Siswa Kelas Ini"
                                    >
                                      Kelola Siswa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClass(cls.id)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Hapus Kelas"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: DATA SISWA & INFO LOGIN (GOOGLE SHEET & FIRESTORE)                */}
              {/* ========================================================================= */}
              {activeTab === 'siswa' && (
                <div className="space-y-6 max-w-6xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Data Siswa & Info Login</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pantau riwayat login siswa, kelas, dan status progres pembelajaran.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const defaultClass = studentFilterClass !== 'ALL' && studentFilterClass
                            ? studentFilterClass
                            : (classes[0]?.name || classes[0]?.id || '');
                          setBulkStudentClass(defaultClass);
                          setShowBulkModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 cursor-pointer"
                      >
                        <FileSpreadsheet size={14} />
                        <span>Impor Teks Manual</span>
                      </button>
                      <button
                        onClick={() => {
                          const defaultClass = studentFilterClass !== 'ALL' && studentFilterClass
                            ? studentFilterClass
                            : (classes[0]?.name || classes[0]?.id || '');
                          setEditingStudent({ name: '', userClass: defaultClass, nisn: '', status: 'Aktif' });
                          setIsStudentModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>Tambah Siswa Manual</span>
                      </button>
                    </div>
                  </div>

                  {/* Link CSV Google Spreadsheet Section */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <FileSpreadsheet size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Tarik Data Siswa dari Google Spreadsheet (Link CSV)</h3>
                        <p className="text-xs text-slate-500">
                          Tempelkan link CSV Google Spreadsheet yang sudah di-publish ke web untuk memuat daftar siswa dari 7 kelas sekaligus secara otomatis.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Contoh: https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                        value={studentCsvUrl}
                        onChange={e => setStudentCsvUrl(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono"
                      />
                      <button
                        onClick={handlePullStudentsFromCsv}
                        disabled={isPullingCsv || !studentCsvUrl.trim()}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        {isPullingCsv ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Menarik Daftar Siswa...</span>
                          </>
                        ) : (
                          <>
                            <Download size={14} />
                            <span>Tarik Daftar Siswa</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-indigo-900 leading-relaxed">
                      <Info size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Cara Mendapatkan Link CSV:</span> Di Google Sheet Anda, klik menu <span className="font-semibold">File &gt; Share (Bagikan) &gt; Publish to web (Publikasikan ke web)</span>. Pilih tab sheet daftar siswa, ubah format dari Web page menjadi <span className="font-bold">Comma-separated values (.csv)</span>, lalu klik Publish. Salin link yang diberikan dan tempel di atas.
                      </div>
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama siswa atau NISN..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Kelas:</span>
                      <select
                        value={studentFilterClass}
                        onChange={e => setStudentFilterClass(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      >
                        <option value="ALL">Semua Kelas</option>
                        {classes.map((c, idx) => (
                          <option key={`std-cls-filter-${c.id || c.name}-${idx}`} value={c.name}>Kelas {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bulk Selection Bar for Students */}
                  {selectedStudentIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                        <CheckSquare size={16} className="text-rose-600 shrink-0" />
                        <span>{selectedStudentIds.length} data siswa dipilih</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-all cursor-pointer"
                        >
                          Batal Pilihan
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDeleteStudents}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Hapus {selectedStudentIds.length} Siswa Terpilih</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Students Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredStudents.length > 0 &&
                                filteredStudents.every(s => selectedStudentIds.includes(s.id))
                              }
                              onChange={handleToggleSelectAllStudents}
                              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              title={
                                filteredStudents.length > 0 &&
                                filteredStudents.every(s => selectedStudentIds.includes(s.id))
                                  ? "Batal pilih semua"
                                  : "Pilih semua siswa di tabel"
                              }
                            />
                          </th>
                          <th className="py-3 px-4">Nama Siswa</th>
                          <th className="py-3 px-4">Kelas</th>
                          <th className="py-3 px-4">NISN</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Terakhir Login</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Tidak ada data siswa yang sesuai filter.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((std, idx) => {
                            const isSelected = selectedStudentIds.includes(std.id);
                            return (
                              <tr 
                                key={`std-row-${std.id || std.name}-${idx}`} 
                                className={`transition-all ${isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/70'}`}
                              >
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectStudent(std.id)}
                                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900">{std.name}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-semibold rounded-md">
                                    {std.userClass}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-500">{std.nisn || '-'}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold text-[11px]">
                                    {std.status || 'Aktif'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500">{std.lastLogin || '-'}</td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingStudent(std);
                                        setIsStudentModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                      title="Edit Siswa / Ganti Kelas"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(std.id)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Hapus Siswa"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: REKAPITULASI NILAI (GOOGLE SHEET & FIRESTORE)                      */}
              {/* ========================================================================= */}
              {activeTab === 'nilai' && (
                <div className="space-y-6 max-w-6xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Rekapitulasi Nilai Siswa</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Daftar hasil nilai pengerjaan kuis siswa yang tersimpan di Firebase dan Google Sheet.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {settings.sheetUrl && (
                        <a
                          href={settings.sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-200"
                        >
                          <span>Buka Google Sheet</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pengerjaan</span>
                      <p className="text-xl font-black text-slate-900 mt-1">{totalSubmissions}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rata-Rata Nilai</span>
                      <p className="text-xl font-black text-emerald-600 mt-1">{avgScore}%</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tuntas (≥ 75%)</span>
                      <p className="text-xl font-black text-emerald-700 mt-1">{passedCount} Siswa</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Persentase Kelulusan</span>
                      <p className="text-xl font-black text-slate-900 mt-1">{passRate}%</p>
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama siswa..."
                        value={scoreSearch}
                        onChange={e => setScoreSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>

                    <select
                      value={scoreFilterClass}
                      onChange={e => setScoreFilterClass(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    >
                      <option value="ALL">Semua Kelas</option>
                      {classes.map((c, idx) => (
                        <option key={`sc-cls-filter-${c.id || c.name}-${idx}`} value={c.name}>Kelas {c.name}</option>
                      ))}
                    </select>

                    <select
                      value={scoreFilterModule}
                      onChange={e => setScoreFilterModule(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    >
                      <option value="ALL">Semua Modul</option>
                      {modules.map((m, idx) => (
                        <option key={`mod-filter-opt-${m.id}-${idx}`} value={m.id.toString()}>
                          {m.title || `Modul ${m.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scores Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-3 px-4">Nama Siswa</th>
                          <th className="py-3 px-4">Kelas</th>
                          <th className="py-3 px-4">Kuis Modul</th>
                          <th className="py-3 px-4">Skor / Total</th>
                          <th className="py-3 px-4">Persentase</th>
                          <th className="py-3 px-4">Waktu Pengerjaan</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredScores.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Belum ada catatan nilai siswa yang sesuai.
                            </td>
                          </tr>
                        ) : (
                          filteredScores.map((sc, idx) => (
                            <tr key={`sc-row-${sc.id || idx}-${idx}`} className="hover:bg-slate-50/70 transition-all">
                              <td className="py-3 px-4 font-bold text-slate-900">{sc.username}</td>
                              <td className="py-3 px-4 font-semibold">{sc.userClass}</td>
                              <td className="py-3 px-4">Modul {sc.moduleNumber} ({sc.quizTitle})</td>
                              <td className="py-3 px-4 font-mono font-bold">
                                {sc.score} / {sc.totalQuestions}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                  sc.percentage >= 75
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {sc.percentage}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">{sc.date}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Hapus baris nilai ini?')) {
                                      await firestoreService.deleteScore(sc.id);
                                      setScores(scores.filter(s => s.id !== sc.id));
                                      showNotification('Catatan nilai telah dihapus.', 'success');
                                    }
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Hapus Nilai"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 6: LOG AKTIVITAS SISWA                                               */}
              {/* ========================================================================= */}
              {activeTab === 'log' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Log Aktivitas Siswa</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Catatan riwayat login siswa dan penyelesaian tugas kuis secara real-time.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 divide-y divide-slate-100 shadow-xs">
                    {logs.length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-xs">Belum ada log aktivitas tercatat.</p>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={`log-item-${log.id || idx}-${idx}`} className="py-3 flex items-start gap-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase mt-0.5 ${
                            log.action === 'LOGIN' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.action}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              <span className="font-bold">{log.username}</span> ({log.userClass}) &bull; {log.details}
                            </p>
                            <span className="text-[11px] text-slate-400">{log.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 7: LOGIN                                                             */}
              {/* ========================================================================= */}
              {activeTab === 'spreadsheet' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 max-w-4xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Link / ID Spreadsheet
                      </label>
                      <input
                        type="text"
                        placeholder="Link atau ID Spreadsheet"
                        value={spreadsheetInput}
                        onChange={e => setSpreadsheetInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Link / ID CSV
                      </label>
                      <input
                        type="text"
                        placeholder="Link atau ID CSV"
                        value={csvInput}
                        onChange={e => setCsvInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleSaveSpreadsheetConfig}
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                    >
                      {isSavingSettings ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>Simpan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB PENGATURAN LOGO, SIDEBAR, HALAMAN UTAMA & UMUM                       */}
              {/* ========================================================================= */}
              {activeTab === 'pengaturan' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Sub-Tab Navigation */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                      onClick={() => setSettingsSubTab('branding')}
                      className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all text-center justify-center flex items-center ${
                        settingsSubTab === 'branding'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span>Logo</span>
                    </button>
                    <button
                      onClick={() => setSettingsSubTab('sidebar')}
                      className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all text-center justify-center flex items-center ${
                        settingsSubTab === 'sidebar'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span>Sidebar</span>
                    </button>
                    <button
                      onClick={() => setSettingsSubTab('home')}
                      className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all text-center justify-center flex items-center ${
                        settingsSubTab === 'home'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => setSettingsSubTab('general')}
                      className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold transition-all text-center justify-center flex items-center ${
                        settingsSubTab === 'general'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span>Umum</span>
                    </button>
                  </div>

                  {/* --- SUB-TAB 1: LOGO --- */}
                  {settingsSubTab === 'branding' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Live Preview Card */}
                        <div className="md:col-span-1 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center text-white shadow-xl min-h-[280px]">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full mb-4">
                            Live Preview Logo
                          </span>
                          <motion.div
                            animate={settings.logoAnimation !== false ? { rotateY: 360 } : { rotateY: 0 }}
                            transition={settings.logoAnimation !== false ? { duration: 8, repeat: Infinity, ease: "linear" } : undefined}
                            style={{ perspective: 1000 }}
                            className="mb-3 flex items-center justify-center min-h-[100px]"
                          >
                            <img
                              src={settings.logoUrl || "https://i.ibb.co.com/kVLW5n61/logo-smpn-1-bengkalis-kecil-Copy.png"}
                              alt={settings.logoTitle || "Logo"}
                              className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Keep showing default if custom image fails, but don't clear state
                                (e.target as HTMLImageElement).src = "https://i.ibb.co.com/kVLW5n61/logo-smpn-1-bengkalis-kecil-Copy.png";
                              }}
                            />
                          </motion.div>
                          <h4 className="font-black text-sm uppercase tracking-tight">
                            {settings.logoTitle || 'Yuk Berkebun'}
                          </h4>
                          <p className="text-[11px] opacity-70 mt-0.5">
                            {settings.logoSubtitle || 'Modul Digital'}
                          </p>
                        </div>

                        {/* Form Inputs */}
                        <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-slate-800">
                                URL Gambar Logo (Direct Link / Google Drive / Dropbox)
                              </label>
                              {logoUrlFeedback.status === 'valid' && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Link Terverifikasi & Aktif
                                </span>
                              )}
                              {logoUrlFeedback.status === 'invalid' && (
                                <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                  <AlertCircle size={13} /> Gagal Memuat Link
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={logoUrlInput}
                                onChange={e => {
                                  setLogoUrlInput(e.target.value);
                                  setLogoUrlFeedback({ status: 'idle', message: '' });
                                }}
                                onBlur={() => {
                                  if (logoUrlInput && !logoUrlInput.startsWith('data:image')) {
                                    const normalized = normalizeImageUrl(logoUrlInput);
                                    if (normalized !== logoUrlInput) {
                                      setLogoUrlInput(normalized);
                                    }
                                  }
                                }}
                                placeholder="https://... (contoh: link Google Drive, ImgBB, atau URL gambar .png/.jpg)"
                                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyAndSaveLogoUrl()}
                                disabled={isTestingLogoUrl || !logoUrlInput.trim()}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
                              >
                                {isTestingLogoUrl ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Memverifikasi...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={14} />
                                    <span>Terapkan & Simpan URL</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* URL Help & Feedback message */}
                            {logoUrlFeedback.message && (
                              <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                                logoUrlFeedback.status === 'valid' 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : logoUrlFeedback.status === 'invalid'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                <Info size={14} className="shrink-0 mt-0.5" />
                                <div>{logoUrlFeedback.message}</div>
                              </div>
                            )}
                          </div>

                          {/* Upload File & Presets */}
                          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                              <Upload size={14} className="text-emerald-600" />
                              <span>Unggah File Logo dari Komputer (PNG/JPG)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoFileUpload}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                const defaultUrl = 'https://i.ibb.co.com/kVLW5n61/logo-smpn-1-bengkalis-kecil-Copy.png';
                                setLogoUrlInput(defaultUrl);
                                handleApplyAndSaveLogoUrl(defaultUrl);
                              }}
                              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-all"
                            >
                              Preset: SMPN 1 Bengkalis
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                              <label className="block text-xs font-bold text-slate-800 mb-1">
                                Teks Judul Logo
                              </label>
                              <input
                                type="text"
                                value={settings.logoTitle || ''}
                                onChange={e => setSettings({ ...settings, logoTitle: e.target.value })}
                                placeholder="Yuk Berkebun"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-800 mb-1">
                                Teks Subjudul Logo
                              </label>
                              <input
                                type="text"
                                value={settings.logoSubtitle || ''}
                                onChange={e => setSettings({ ...settings, logoSubtitle: e.target.value })}
                                placeholder="Modul Digital"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={settings.logoAnimation !== false}
                                onChange={e => setSettings({ ...settings, logoAnimation: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                              />
                              <span className="text-xs font-bold text-slate-800">
                                Putar logo
                              </span>
                            </label>
                          </div>

                          {/* Tombol Simpan Khusus Tab Logo */}
                          <div className="pt-4 border-t border-slate-200 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleSaveTabSettings('Logo')}
                              disabled={isSavingSettings}
                              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                            >
                              {isSavingSettings ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Menyimpan...</span>
                                </>
                              ) : (
                                <>
                                  <Save size={14} />
                                  <span>Simpan</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUB-TAB 2: SIDEBAR --- */}
                  {settingsSubTab === 'sidebar' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Judul Header Sidebar
                          </label>
                          <input
                            type="text"
                            value={settings.sidebarTitle || ''}
                            onChange={e => setSettings({ ...settings, sidebarTitle: e.target.value })}
                            placeholder="Yuk Berkebun"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Subjudul Header Sidebar
                          </label>
                          <input
                            type="text"
                            value={settings.sidebarSubtitle || ''}
                            onChange={e => setSettings({ ...settings, sidebarSubtitle: e.target.value })}
                            placeholder="Modul Digital"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Catatan / Footer Teks Sidebar
                        </label>
                        <input
                          type="text"
                          value={settings.sidebarFooterText || ''}
                          onChange={e => setSettings({ ...settings, sidebarFooterText: e.target.value })}
                          placeholder="SMPN 1 Bengkalis"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                        />
                      </div>

                      {/* Tombol Simpan Khusus Tab Sidebar */}
                      <div className="pt-4 border-t border-slate-200 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveTabSettings('Sidebar')}
                          disabled={isSavingSettings}
                          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          {isSavingSettings ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Simpan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- SUB-TAB 3: HOME --- */}
                  {settingsSubTab === 'home' && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Judul Sambutan Utama (Welcome Title)
                          </label>
                          <textarea
                            rows={2}
                            value={settings.homeWelcomeTitle || ''}
                            onChange={e => setSettings({ ...settings, homeWelcomeTitle: e.target.value })}
                            placeholder="Selamat Datang di Modul Berkebun SMPN 1 Bengkalis"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                          <p className="text-[11px] text-slate-500 mt-1">
                            Dapat ditulis dalam beberapa baris (Enter) sesuai kebutuhan format teks di layar utama.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Subjudul Sambutan (Opsional)
                          </label>
                          <input
                            type="text"
                            value={settings.homeWelcomeSubtitle || ''}
                            onChange={e => setSettings({ ...settings, homeWelcomeSubtitle: e.target.value })}
                            placeholder="Modul Digital Pembelajaran IPA"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Kata Mutiara / Kutipan Inspirasi
                          </label>
                          <textarea
                            rows={2}
                            value={settings.homeQuote || ''}
                            onChange={e => setSettings({ ...settings, homeQuote: e.target.value })}
                            placeholder='"Janganlah engkau mengucapkan perkataan yang engkau sendiri tidak suka mendengarnya ketika orang lain mengucapkannya kepadamu."'
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden italic"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Teks Tombol Aksi Utama (CTA Button)
                            </label>
                            <input
                              type="text"
                              value={settings.homeButtonText || ''}
                              onChange={e => setSettings({ ...settings, homeButtonText: e.target.value })}
                              placeholder="MULAI BELAJAR"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Teks Hak Cipta / Copyright Footer
                            </label>
                            <input
                              type="text"
                              value={settings.homeCopyright || ''}
                              onChange={e => setSettings({ ...settings, homeCopyright: e.target.value })}
                              placeholder="Copyright © SMPN 1 BENGKALIS"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settings.showHomeQuote !== false}
                              onChange={e => setSettings({ ...settings, showHomeQuote: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                Tampilkan Kutipan Kata Mutiara
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Menampilkan teks motivasi di bawah tombol mulai.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settings.showHomeThemeButton !== false}
                              onChange={e => setSettings({ ...settings, showHomeThemeButton: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                Tampilkan Tombol "Ubah Warna"
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Memungkinkan siswa mengubah palet tema warna langsung dari Home.
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* Tombol Simpan Khusus Tab Home */}
                        <div className="pt-4 border-t border-slate-200 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveTabSettings('Home')}
                            disabled={isSavingSettings}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                          >
                            {isSavingSettings ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Menyimpan...</span>
                              </>
                            ) : (
                              <>
                                <Save size={14} />
                                <span>Simpan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUB-TAB 4: UMUM --- */}
                  {settingsSubTab === 'general' && (
                    <div className="space-y-6">
                      {/* Bagian 1: Identitas Aplikasi & Akses Guru */}
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                          <Sliders size={16} className="text-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Identitas & Keamanan Modul</h4>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Nama Sekolah / Lembaga
                          </label>
                          <input
                            type="text"
                            value={settings.schoolName || ''}
                            onChange={e => setSettings({ ...settings, schoolName: e.target.value })}
                            placeholder="SMPN 1 Bengkalis"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Judul Aplikasi Modul
                          </label>
                          <input
                            type="text"
                            value={settings.appTitle || ''}
                            onChange={e => setSettings({ ...settings, appTitle: e.target.value })}
                            placeholder="Modul Belajar Berkebun IPA SMP"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Password Admin / Guru (Untuk Masuk Panel Ini)
                          </label>
                          <input
                            type="password"
                            value={settings.adminPassword || ''}
                            onChange={e => setSettings({ ...settings, adminPassword: e.target.value })}
                            placeholder="gurusmp"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                          />
                          <p className="text-[11px] text-slate-500 mt-1">
                            Gunakan kata sandi ini saat masuk ke panel melalui tombol Panel Admin.
                          </p>
                        </div>
                      </div>

                      {/* Bagian 2: Pengaturan Halaman Login */}
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                          <LogIn size={16} className="text-purple-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pengaturan Halaman Login</h4>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Judul Sambutan Login
                          </label>
                          <textarea
                            rows={2}
                            value={settings.loginTitle || ''}
                            onChange={e => setSettings({ ...settings, loginTitle: e.target.value })}
                            placeholder="Selamat Datang di Modul Berkebun SMPN 1 Bengkalis"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Kata Mutiara / Kutipan Subjudul Login
                          </label>
                          <textarea
                            rows={2}
                            value={settings.loginSubtitle || ''}
                            onChange={e => setSettings({ ...settings, loginSubtitle: e.target.value })}
                            placeholder="“Satu langkah kecil hari ini, Menyelamatkan hidup di masa depan”"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden italic"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Teks Tombol Masuk
                            </label>
                            <input
                              type="text"
                              value={settings.loginButtonText || ''}
                              onChange={e => setSettings({ ...settings, loginButtonText: e.target.value })}
                              placeholder="MASUK BELAJAR"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Teks Tagline / Footer Login
                            </label>
                            <input
                              type="text"
                              value={settings.loginTagline || ''}
                              onChange={e => setSettings({ ...settings, loginTagline: e.target.value })}
                              placeholder="Modul Pembelajaran IPA Berkelanjutan"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settings.showLoginQuote !== false}
                              onChange={e => setSettings({ ...settings, showLoginQuote: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                Tampilkan Kutipan di Halaman Login
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Menampilkan kalimat kutipan motivasi di bawah judul login.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settings.showLoginLogoAnimation !== false}
                              onChange={e => setSettings({ ...settings, showLoginLogoAnimation: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                Animasi Logo 3D Berputar
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Mengaktifkan animasi putaran halus 3D pada logo sekolah di layar login.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Tombol Simpan Khusus Tab Umum */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveTabSettings('Umum')}
                          disabled={isSavingSettings}
                          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          {isSavingSettings ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Simpan Pengaturan Umum</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 8: FIREBASE USAGE DASHBOARD (PIE & BAR CHARTS, REAL-TIME SPARK QUOTA) */}
              {/* ========================================================================= */}
              {activeTab === 'firebase' && (
                <FirebaseUsageDashboard
                  modules={modules}
                  quizzes={quizzes}
                  games={games}
                  classes={classes}
                  students={students}
                  scores={scores}
                  logs={logs}
                  settings={settings}
                />
              )}

              {/* ========================================================================= */}
              {/* TAB 9: GOOGLE APPS SCRIPT DRIVE INTEGRATION                               */}
              {/* ========================================================================= */}
              {activeTab === 'appscript' && (
                <AdminAppScriptManager
                  settings={settings}
                  onSaveSettings={async (newSettings) => {
                    setSettings(newSettings);
                    await firestoreService.saveSettings(newSettings);
                  }}
                  showNotification={showNotification}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: SUB-MATERI PAGE & INTERACTIVE GAME EDITOR                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isPageEditorOpen && editingPage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                    pageEditorTab === 'game' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-emerald-600'
                  }`}>
                    {pageEditorTab === 'game' ? <Gamepad2 size={18} /> : <BookOpen size={18} />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {pageEditorTab === 'game' ? 'Kelola Game Edukasi Interaktif' : 'Edit Halaman Sub-Materi'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Modul: <strong className="text-slate-700">{editingModule?.title}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPageEditorOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content Area */}
              <div className="space-y-4 text-xs">
                {/* 1. Tombol / Selector Halaman Game (DI ATAS JUDUL HALAMAN, LEBAR PENDEK SESUAI HP) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Halaman Game
                  </label>
                  <select
                    aria-label="Halaman Game"
                    value={editingPage.isGame ? (editingPage.gameId || 'custom') : 'text'}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'text') {
                        setEditingPage({
                          ...editingPage,
                          isGame: false,
                          gameId: undefined
                        });
                        setPageEditorTab('content');
                      } else {
                        const chosen = games.find(g => g.id === val);
                        if (chosen) {
                          setEditingPage({
                            ...editingPage,
                            isGame: true,
                            title: editingPage.title && !editingPage.title.startsWith('Halaman') ? editingPage.title : chosen.title,
                            gameId: chosen.id,
                            gameType: chosen.type,
                            gameCode: chosen.code || '',
                            gameInstructions: chosen.instructions || '',
                            gamePassScore: chosen.passScore || 100
                          });
                        } else {
                          setEditingPage({
                            ...editingPage,
                            isGame: true,
                            gameType: 'custom_html',
                            gameCode: GAME_TEMPLATES[0]?.code || '',
                            gameInstructions: ''
                          });
                        }
                        setPageEditorTab('game');
                      }
                    }}
                    className="w-full sm:w-[220px] px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl font-bold text-xs transition-all cursor-pointer outline-hidden shadow-2xs"
                  >
                    <option value="text">📄 Materi Teks Biasa</option>
                    <optgroup label="Pilih Game Interaktif:">
                      {games.map(g => (
                        <option key={`game-sel-${g.id}`} value={g.id}>
                          🎮 {g.title}
                        </option>
                      ))}
                      {games.length === 0 && (
                        <option value="custom">🎮 Game Interaktif</option>
                      )}
                    </optgroup>
                  </select>
                </div>

                {/* 2. Judul Halaman Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul Halaman</label>
                  <input
                    type="text"
                    value={editingPage.title}
                    onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                    placeholder="Judul halaman..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs sm:text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
                  />
                </div>

                {/* 3. Area Isi Materi: Preview Game (jika isGame) atau RichTextEditor (jika Teks) */}
                {editingPage.isGame ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-950 flex items-center gap-1.5">
                        <Gamepad2 size={15} className="text-purple-600 shrink-0" />
                        <span>Pratinjau Game Interaktif: {editingPage.title}</span>
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white min-h-[300px]">
                      <CustomGameRenderer
                        code={editingPage.gameCode || ''}
                        gameType={editingPage.gameType || 'custom_html'}
                        title={editingPage.title || 'Game Edukasi Interaktif'}
                        instructions={editingPage.gameInstructions}
                        onComplete={(score) => {
                          showNotification(`Uji Coba Berhasil! Skor game: ${score || 100} poin.`, 'success');
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <RichTextEditor
                      label="Teks Konten Materi Lengkap"
                      value={editingPage.content || ''}
                      onChange={val => setEditingPage({ ...editingPage, content: val })}
                      placeholder="Mulai ketik isi materi pembelajaran..."
                      minHeight="320px"
                      webAppUrl={settings.driveUploadScriptUrl || settings.googleAppsScriptUrl}
                      defaultFolderId={settings.driveFolderId}
                    />
                  </div>
                )}

                {/* 4. Pertanyaan Refleksi (Tetap Ada di Bawah Game maupun Teks) */}
                  {editingPage.quiz ? (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <HelpCircle size={15} className="text-amber-600 shrink-0" />
                          <span>Pertanyaan Refleksi</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Stepper Waktu Aktif */}
                          <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl px-2 py-1 shadow-2xs">
                            <Clock size={13} className="text-amber-700 shrink-0" />
                            <button
                              type="button"
                              onClick={() => {
                                const cur = editingPage.quiz?.delaySeconds ?? editingPage.triggerQuestionDelay ?? 10;
                                const next = Math.max(0, cur - 5);
                                setEditingPage({
                                  ...editingPage,
                                  triggerQuestionDelay: next,
                                  quiz: { ...editingPage.quiz!, delaySeconds: next }
                                });
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-xs cursor-pointer transition-colors active:scale-95"
                              title="Kurangi 5 detik"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={editingPage.quiz?.delaySeconds ?? editingPage.triggerQuestionDelay ?? 10}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setEditingPage({
                                  ...editingPage,
                                  triggerQuestionDelay: val,
                                  quiz: { ...editingPage.quiz!, delaySeconds: val }
                                });
                              }}
                              className="w-9 text-center font-bold text-xs bg-transparent border-0 outline-hidden p-0 text-amber-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[11px] font-bold text-amber-800 mr-0.5">dtk</span>
                            <button
                              type="button"
                              onClick={() => {
                                const cur = editingPage.quiz?.delaySeconds ?? editingPage.triggerQuestionDelay ?? 10;
                                const next = cur + 5;
                                setEditingPage({
                                  ...editingPage,
                                  triggerQuestionDelay: next,
                                  quiz: { ...editingPage.quiz!, delaySeconds: next }
                                });
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-xs cursor-pointer transition-colors active:scale-95"
                              title="Tambah 5 detik"
                            >
                              +
                            </button>
                          </div>

                          {/* Tombol Hapus Pertanyaan (Icon Tong Sampah) */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPage({
                                ...editingPage,
                                quiz: undefined,
                                triggerQuestion: ''
                              });
                            }}
                            className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-white border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center"
                            title="Hapus Pertanyaan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Input Kalimat Pertanyaan */}
                      <input
                        type="text"
                        placeholder="Tuliskan pertanyaan refleksi..."
                        value={editingPage.quiz.question}
                        onChange={e => {
                          const qVal = e.target.value;
                          setEditingPage({
                            ...editingPage,
                            triggerQuestion: qVal,
                            quiz: { ...editingPage.quiz!, question: qVal }
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
                      />

                      {/* Options */}
                      <div className="space-y-1.5 pt-1">
                        {editingPage.quiz.options.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="font-bold text-amber-900 w-4 text-center">{opt.id}.</span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const newOpts = [...editingPage.quiz!.options];
                                newOpts[oIdx].text = e.target.value;
                                setEditingPage({
                                  ...editingPage,
                                  quiz: { ...editingPage.quiz!, options: newOpts }
                                });
                              }}
                              placeholder={`Pilihan ${opt.id}...`}
                              className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                            />
                            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-[11px] font-bold text-emerald-800 shrink-0 cursor-pointer hover:bg-emerald-50 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!opt.isCorrect}
                                onChange={e => {
                                  const newOpts = [...editingPage.quiz!.options];
                                  newOpts[oIdx].isCorrect = e.target.checked;
                                  setEditingPage({
                                    ...editingPage,
                                    quiz: { ...editingPage.quiz!, options: newOpts }
                                  });
                                }}
                                className="accent-emerald-600 rounded"
                              />
                              <span>Benar</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                        <HelpCircle size={15} className="text-slate-400" />
                        <span>Pertanyaan Refleksi (Opsional)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPage({
                            ...editingPage,
                            triggerQuestion: editingPage.triggerQuestion || 'Apakah kamu sudah memahami konsep ini?',
                            triggerQuestionDelay: 10,
                            quiz: {
                              question: editingPage.triggerQuestion || 'Apakah kamu sudah memahami konsep ini?',
                              delaySeconds: 10,
                              options: [
                                { id: 'A', text: 'Sudah paham, siap lanjut!', isCorrect: true },
                                { id: 'B', text: 'Masih perlu membaca kembali', isCorrect: false }
                              ]
                            }
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Plus size={14} />
                        <span>Tambah Pertanyaan Refleksi</span>
                      </button>
                    </div>
                  )}
                </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSavingPage}
                  onClick={() => setIsPageEditorOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingPage}
                  onClick={handleSavePage}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                    pageEditorTab === 'game' 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSavingPage ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: QUIZ QUESTION EDITOR                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isQuestionModalOpen && editingQuestion && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">
                  Edit Butir Soal: {currentModuleForQuiz ? currentModuleForQuiz.title : `Modul ${selectedQuizModule}`}
                </h3>
                <button
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pertanyaan</label>
                  <textarea
                    rows={3}
                    value={editingQuestion.question}
                    onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                    placeholder="Tuliskan soal pilihan ganda di sini..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">Pilihan Jawaban (A, B, C, D)</label>
                  {editingQuestion.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                        editingQuestion.correctId === opt.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.id}
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => {
                          const options = [...editingQuestion.options];
                          options[idx].text = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options });
                        }}
                        placeholder={`Teks pilihan ${opt.id}...`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingQuestion({ ...editingQuestion, correctId: opt.id })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          editingQuestion.correctId === opt.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {editingQuestion.correctId === opt.id ? 'Kunci Benar' : 'Jadikan Kunci'}
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pembahasan / Penjelasan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.explanation || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                    placeholder="Alasan mengapa jawaban tersebut benar..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSavingQuiz}
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingQuiz}
                  onClick={handleSaveQuestion}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSavingQuiz ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sedang Menyimpan Soal...</span>
                    </>
                  ) : (
                    <span>Simpan Soal ke Firebase</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: SINGLE STUDENT FORM                                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">Tambah / Edit Data Siswa</h3>
                <button onClick={() => setIsStudentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={editingStudent.name || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    placeholder="Nama siswa..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                  {classes.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium">
                      ⚠️ Belum ada kelas yang dibuat. Silakan tambahkan kelas terlebih dahulu di tab <strong>Kelola Kelas</strong>.
                    </div>
                  ) : (
                    <select
                      value={editingStudent.userClass || (classes[0]?.name || classes[0]?.id || '')}
                      onChange={e => setEditingStudent({ ...editingStudent, userClass: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    >
                      {classes.map((c, idx) => (
                        <option key={`edit-std-cls-${c.id || c.name}-${idx}`} value={c.name || c.id}>
                          Kelas {c.name || c.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN / Nomor Induk (Opsional)</label>
                  <input
                    type="text"
                    value={editingStudent.nisn || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    placeholder="0012345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSavingStudent}
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingStudent}
                  onClick={handleSaveStudent}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSavingStudent ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sedang Menyimpan Siswa...</span>
                    </>
                  ) : (
                    <span>Simpan Siswa</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: PILIH GAME DARI KELOLA GAME / BANK GAME                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isGameSelectorModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300 border border-white/10 shrink-0">
                    <Gamepad2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <span>Pilih Game untuk Disematkan ke Modul</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                        {editingModule ? `Modul ${editingModule.id}` : ''}
                      </span>
                    </h3>
                    <p className="text-xs text-purple-200/80 mt-0.5">
                      Pilih dari daftar game yang tersedia di menu <strong>Kelola Game</strong> untuk langsung dijadikan halaman sub-materi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGameSelectorModalOpen(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Toolbar: Search & Category Filter */}
              {(() => {
                const availableGames = (games && games.length > 0) ? games : firestoreService.getDefaultGamesList();
                const categories = ['ALL', ...Array.from(new Set(availableGames.map(g => g.category || 'Umum')))];
                
                const filteredGames = availableGames.filter(g => {
                  const q = gameSelectorSearch.toLowerCase().trim();
                  const matchesSearch = !q || 
                    (g.title && g.title.toLowerCase().includes(q)) ||
                    (g.description && g.description.toLowerCase().includes(q)) ||
                    (g.category && g.category.toLowerCase().includes(q));
                  const matchesCat = gameSelectorCategory === 'ALL' || (g.category || 'Umum') === gameSelectorCategory;
                  return matchesSearch && matchesCat;
                });

                return (
                  <>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari judul game, kategori, atau materi..."
                            value={gameSelectorSearch}
                            onChange={e => setGameSelectorSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden font-medium"
                          />
                          {gameSelectorSearch && (
                            <button
                              type="button"
                              onClick={() => setGameSelectorSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        {/* Fast Custom Scratch Code Button */}
                        <button
                          type="button"
                          onClick={handleOpenCustomCodeGameEditor}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                          title="Tulis kode game baru secara manual (HTML / React TSX)"
                        >
                          <Code2 size={14} />
                          <span>+ Buat Game Baru dari Kode Kustom</span>
                        </button>
                      </div>

                      {/* Category Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                          Kategori:
                        </span>
                        {categories.map(cat => {
                          const isSelected = gameSelectorCategory === cat;
                          return (
                            <button
                              key={`cat-pill-${cat}`}
                              type="button"
                              onClick={() => setGameSelectorCategory(cat)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                isSelected
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {cat === 'ALL' ? 'Semua Game' : cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Games Grid Container */}
                    <div className="p-5 overflow-y-auto flex-1 bg-slate-100/50">
                      {filteredGames.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 mx-auto flex items-center justify-center">
                            <Gamepad2 size={24} />
                          </div>
                          <p className="text-sm font-bold text-slate-700">Tidak ada game yang cocok dengan pencarian.</p>
                          <p className="text-xs text-slate-400">
                            Coba ubah kata kunci pencarian atau pilih kategori "Semua Game".
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setGameSelectorSearch('');
                              setGameSelectorCategory('ALL');
                            }}
                            className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
                          >
                            Reset Filter
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredGames.map((game, gIdx) => {
                            const isTsx = game.type === 'custom_tsx';
                            const hasCover = !!game.coverUrl;

                            return (
                              <div
                                key={`pick-game-${game.id}-${gIdx}`}
                                className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                              >
                                <div>
                                  {/* Cover / Visual Top */}
                                  <div className="h-28 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center">
                                    {hasCover ? (
                                      <img
                                        src={game.coverUrl}
                                        alt={game.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-white/90 space-y-1">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-300 border border-white/10">
                                          <Gamepad2 size={22} />
                                        </div>
                                        <span className="text-[11px] font-semibold text-purple-200">
                                          {game.category || 'Game Edukasi'}
                                        </span>
                                      </div>
                                    )}

                                    {/* Badges Overlay */}
                                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white border border-white/10 shadow-xs">
                                        {game.category || 'Umum'}
                                      </span>
                                    </div>

                                    <div className="absolute top-2 right-2">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                                        isTsx
                                          ? 'bg-purple-600/90 text-white'
                                          : 'bg-indigo-600/90 text-white'
                                      }`}>
                                        {isTsx ? 'React/TSX' : 'HTML5'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Body */}
                                  <div className="p-3.5 space-y-2">
                                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
                                      {game.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                      {game.description || game.instructions || 'Game interaktif siap pakai untuk menguji pemahaman siswa.'}
                                    </p>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                      <span className="font-semibold text-emerald-700">
                                        KKM: {game.passScore || 70} Poin
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {game.id}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Footer Action */}
                                <div className="p-3 pt-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectGameForModule(game)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  >
                                    <Plus size={14} />
                                    <span>Pilih & Pasang Game</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-500">
                  Ingin membuat atau mengedit bank game? Buka tab <strong>Kelola Game</strong> di menu atas.
                </p>
                <button
                  type="button"
                  onClick={() => setIsGameSelectorModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: BULK STUDENT IMPORT                                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">Impor Massal Daftar Siswa</h3>
                <button onClick={() => setShowBulkModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Kelas</label>
                  {classes.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium">
                      ⚠️ Belum ada kelas yang dibuat. Silakan tambahkan kelas terlebih dahulu di tab <strong>Kelola Kelas</strong>.
                    </div>
                  ) : (
                    <select
                      value={bulkStudentClass || (classes[0]?.name || classes[0]?.id || '')}
                      onChange={e => setBulkStudentClass(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    >
                      {classes.map((c, idx) => (
                        <option key={`bulk-std-cls-${c.id || c.name}-${idx}`} value={c.name || c.id}>
                          Kelas {c.name || c.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Daftar Nama Siswa (1 Nama per baris)
                  </label>
                  <textarea
                    rows={8}
                    value={bulkStudentText}
                    onChange={e => setBulkStudentText(e.target.value)}
                    placeholder="Ahmad Fauzi&#10;Budi Santoso&#10;Citra Lestari&#10;Dewi Anggraini..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-sans"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tips: Anda bisa langsung copy-paste satu kolom nama dari Excel / Google Sheet.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isImportingStudents}
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isImportingStudents || !bulkStudentText.trim()}
                  onClick={handleBulkImportStudents}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all disabled:cursor-not-allowed"
                >
                  {isImportingStudents ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sedang Mengimpor Siswa...</span>
                    </>
                  ) : (
                    <span>Mulai Impor Siswa</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM DELETE CONFIRMATION (RELIABLE & NO IFRAME BLOCK)            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteModal && deleteModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 pb-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {deleteModal.title}
                  </h3>
                  {deleteModal.subtitle && (
                    <p className="text-xs text-slate-500 mt-1">
                      {deleteModal.subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDeletingItem) setDeleteModal(null);
                  }}
                  disabled={isDeletingItem}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Warning Notice Box */}
              {deleteModal.warningNote && (
                <div className="mx-5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <FileSpreadsheet size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Sinkronisasi Google Sheet:</strong> {deleteModal.warningNote}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeletingItem ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Ya, Hapus Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: PANDUAN OTORISASI DOMAIN VERCEL / HOSTING (FIREBASE CONSOLE)      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDomainHelpModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 pb-4 bg-slate-50 border-b border-slate-200 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Globe size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Panduan Izin Domain di Firebase Console
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Solusi agar Login Google berhasil saat aplikasi di-deploy ke Vercel, GitHub Pages, atau Domain Kustom.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDomainHelpModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
                {/* Domain Card */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <p className="font-semibold text-blue-900 mb-1">
                    Domain Aplikasi Anda Saat Ini:
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="flex-1 p-2 bg-white rounded-lg border border-blue-200 font-mono text-xs text-blue-800 font-bold select-all">
                      {typeof window !== 'undefined' ? window.location.hostname : 'domain-anda.vercel.app'}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const host = typeof window !== 'undefined' ? window.location.hostname : '';
                        if (host && navigator.clipboard) {
                          navigator.clipboard.writeText(host);
                          setDomainCopied(true);
                          setTimeout(() => setDomainCopied(false), 2000);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-all shrink-0"
                    >
                      {domainCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{domainCopied ? 'Tersalin!' : 'Salin Domain'}</span>
                    </button>
                  </div>
                </div>

                {/* Step by step */}
                <div className="space-y-3">
                  <p className="font-bold text-slate-900 text-xs">
                    Langkah Mengizinkan Domain (Hanya Perlu 1x):
                  </p>
                  <ol className="space-y-2.5 list-decimal list-inside text-slate-600 leading-relaxed">
                    <li className="pl-1">
                      Buka halaman pengaturan Firebase Auth:{' '}
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0999699449/authentication/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 underline ml-1"
                      >
                        <span>Firebase Console &gt; Authentication &gt; Settings</span>
                        <ExternalLink size={12} />
                      </a>
                    </li>
                    <li className="pl-1">
                      Pilih tab <strong>Settings</strong>, lalu scroll ke bagian <strong>Authorized domains</strong> (Domain yang diizinkan).
                    </li>
                    <li className="pl-1">
                      Klik tombol <strong>Add domain</strong> (Tambah domain).
                    </li>
                    <li className="pl-1">
                      Tempelkan nama domain Anda (misal: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'xyz.vercel.app'}</code>), lalu klik <strong>Add</strong>.
                    </li>
                    <li className="pl-1">
                      <strong>Selesai!</strong> Kembali ke halaman ini dan klik tombol <strong>Login Akun Google Guru</strong> lagi. Login akan langsung berhasil 100%.
                    </li>
                  </ol>
                </div>

                {/* Alternative Notice */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                  <strong>Catatan untuk Siswa:</strong> Siswa tidak perlu login akun Google sama sekali saat belajar atau mengerjakan kuis. Data nilai siswa otomatis tersimpan aman ke database Cloud Firebase dan disinkronkan ke Spreadsheet melalui Apps Script.
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0999699449/authentication/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <ExternalLink size={14} />
                  <span>Buka Firebase Console</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsDomainHelpModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Sync Dialog */}
      <SyncDialog
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncComplete={() => {
          loadAllData();
          showNotification('Data materi dan konfigurasi berhasil disinkronkan dari Cloud!', 'success');
        }}
      />
    </div>
  );
};
