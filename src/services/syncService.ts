import { firestoreService } from './firestoreService';
import { AppModule, QuizConfig, GameItem, AppSettings, ScoreRecord } from '../types';
import { getDefaultModules, getDefaultQuizzes, getDefaultGames, DEFAULT_SETTINGS } from './defaultData';

const SYNC_TIMESTAMP_KEY = 'ipa_last_synced_at';
const PENDING_SCORES_KEY = 'ipa_pending_scores_queue';
const SYNC_EVENT_NAME = 'ipa_data_synced';

export interface SyncStatus {
  lastSyncedAt: string | null;
  moduleCount: number;
  quizCount: number;
  gameCount: number;
  pendingScoresCount: number;
  isOnline: boolean;
  cacheSizeKB: number;
}

// Custom event dispatcher for components to react to data sync
export const notifyDataSynced = (data: { modules?: AppModule[]; settings?: AppSettings }) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: data }));
  }
};

export const syncService = {
  SYNC_EVENT_NAME,

  isOnline: (): boolean => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getLastSyncedTime: (): string | null => {
    try {
      return localStorage.getItem(SYNC_TIMESTAMP_KEY);
    } catch {
      return null;
    }
  },

  getFormattedLastSync: (): string => {
    const raw = syncService.getLastSyncedTime();
    if (!raw) return 'Belum pernah sinkron';
    try {
      const date = new Date(raw);
      if (isNaN(date.getTime())) return raw;
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Tersimpan lokal';
    }
  },

  getPendingScores: (): ScoreRecord[] => {
    try {
      const raw = localStorage.getItem(PENDING_SCORES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  queuePendingScore: (score: ScoreRecord): void => {
    try {
      const existing = syncService.getPendingScores();
      // Avoid duplicate id
      const filtered = existing.filter(s => s.id !== score.id);
      filtered.push(score);
      localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Queue pending score error:', e);
    }
  },

  clearPendingScores: (): void => {
    try {
      localStorage.removeItem(PENDING_SCORES_KEY);
    } catch {}
  },

  getSyncStatus: (): SyncStatus => {
    let moduleCount = 0;
    let quizCount = 0;
    let gameCount = 0;
    let cacheSizeKB = 0;

    try {
      const rawMods = localStorage.getItem('ipa_firestore_cache_modules');
      if (rawMods) {
        moduleCount = (JSON.parse(rawMods) || []).length;
        cacheSizeKB += Math.round(rawMods.length / 1024);
      } else {
        moduleCount = getDefaultModules().length;
      }

      const rawQzs = localStorage.getItem('ipa_firestore_cache_quizzes');
      if (rawQzs) {
        quizCount = (JSON.parse(rawQzs) || []).length;
        cacheSizeKB += Math.round(rawQzs.length / 1024);
      } else {
        quizCount = getDefaultQuizzes().length;
      }

      const rawGms = localStorage.getItem('ipa_firestore_cache_games');
      if (rawGms) {
        gameCount = (JSON.parse(rawGms) || []).length;
        cacheSizeKB += Math.round(rawGms.length / 1024);
      } else {
        gameCount = getDefaultGames().length;
      }
    } catch {}

    const pendingScores = syncService.getPendingScores();

    return {
      lastSyncedAt: syncService.getLastSyncedTime(),
      moduleCount,
      quizCount,
      gameCount,
      pendingScoresCount: pendingScores.length,
      isOnline: syncService.isOnline(),
      cacheSizeKB: Math.max(12, cacheSizeKB)
    };
  },

  // Flush pending offline scores to Firestore
  flushPendingScores: async (onProgress?: (msg: string) => void): Promise<{ count: number; failed: number }> => {
    const pending = syncService.getPendingScores();
    if (pending.length === 0) return { count: 0, failed: 0 };

    onProgress?.(`Mengirim ${pending.length} nilai kuis tertunda ke cloud...`);
    let successCount = 0;
    const remaining: ScoreRecord[] = [];

    for (const score of pending) {
      try {
        await firestoreService.saveScoreDirectToCloud(score);
        successCount++;
      } catch (err) {
        console.warn('Failed flushing pending score:', score.id, err);
        remaining.push(score);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(remaining));
    } else {
      syncService.clearPendingScores();
    }

    return { count: successCount, failed: remaining.length };
  },

  // Main explicit synchronization function
  checkAndSyncFromCloud: async (
    onProgress?: (step: string, percent: number) => void
  ): Promise<{
    success: boolean;
    message: string;
    modulesCount: number;
    quizzesCount: number;
    gamesCount: number;
    pendingSent: number;
    isOffline?: boolean;
  }> => {
    if (!syncService.isOnline()) {
      return {
        success: true,
        isOffline: true,
        message: 'Perangkat sedang offline. Menggunakan materi lengkap yang sudah tersimpan di perangkat.',
        modulesCount: syncService.getSyncStatus().moduleCount,
        quizzesCount: syncService.getSyncStatus().quizCount,
        gamesCount: syncService.getSyncStatus().gameCount,
        pendingSent: 0
      };
    }

    try {
      onProgress?.('Menghubungi Firebase Cloud...', 10);

      // Step 1: Flush any pending scores first
      let pendingSent = 0;
      const pending = syncService.getPendingScores();
      if (pending.length > 0) {
        onProgress?.(`Mengirim ${pending.length} nilai kuis yang tersimpan di HP/laptop...`, 20);
        const res = await syncService.flushPendingScores();
        pendingSent = res.count;
      }

      // Step 2: Fetch Settings
      onProgress?.('Memeriksa konfigurasi dan tema...', 35);
      let remoteSettings: AppSettings | null = null;
      try {
        remoteSettings = await firestoreService.fetchRemoteSettings();
      } catch (e) {
        console.warn('Fetch remote settings note:', e);
      }

      // Step 3: Fetch Games
      onProgress?.('Mengunduh pembaruan bank game edukasi...', 55);
      let remoteGames: GameItem[] = [];
      try {
        remoteGames = await firestoreService.fetchRemoteGames();
      } catch (e) {
        console.warn('Fetch remote games note:', e);
      }

      // Step 4: Fetch Modules
      onProgress?.('Mengunduh seluruh modul materi terbaru...', 75);
      let remoteModules: AppModule[] = [];
      try {
        remoteModules = await firestoreService.fetchRemoteModules();
      } catch (e) {
        console.warn('Fetch remote modules note:', e);
      }

      // Step 5: Fetch Quizzes
      onProgress?.('Mengunduh pembaruan bank kuis...', 90);
      let remoteQuizzes: QuizConfig[] = [];
      try {
        remoteQuizzes = await firestoreService.fetchRemoteQuizzes();
      } catch (e) {
        console.warn('Fetch remote quizzes note:', e);
      }

      // Record last sync timestamp
      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem(SYNC_TIMESTAMP_KEY, nowIso);
      } catch {}

      onProgress?.('Semua materi berhasil tersimpan offline di perangkat!', 100);

      // Notify App
      notifyDataSynced({
        modules: remoteModules.length > 0 ? remoteModules : undefined,
        settings: remoteSettings || undefined
      });

      const totalMods = remoteModules.length > 0 ? remoteModules.length : syncService.getSyncStatus().moduleCount;
      const totalQzs = remoteQuizzes.length > 0 ? remoteQuizzes.length : syncService.getSyncStatus().quizCount;
      const totalGms = remoteGames.length > 0 ? remoteGames.length : syncService.getSyncStatus().gameCount;

      return {
        success: true,
        message: `Sinkronisasi selesai! ${totalMods} Modul Materi, ${totalQzs} Kuis, dan ${totalGms} Game tersimpan offline di memori perangkat.${pendingSent > 0 ? ` ${pendingSent} nilai kuis tertunda berhasil dikirim ke Cloud!` : ''}`,
        modulesCount: totalMods,
        quizzesCount: totalQzs,
        gamesCount: totalGms,
        pendingSent
      };
    } catch (error: any) {
      console.error('checkAndSyncFromCloud error:', error);
      return {
        success: false,
        message: `Gagal sinkronisasi dari cloud: ${error?.message || 'Koneksi terganggu'}. Aplikasi tetap dapat digunakan dengan data lokal.`,
        modulesCount: syncService.getSyncStatus().moduleCount,
        quizzesCount: syncService.getSyncStatus().quizCount,
        gamesCount: syncService.getSyncStatus().gameCount,
        pendingSent: 0
      };
    }
  }
};

// Initialize auto-listener when window reconnects online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Auto flush pending scores on reconnect
    syncService.flushPendingScores().catch(() => {});
  });
}
