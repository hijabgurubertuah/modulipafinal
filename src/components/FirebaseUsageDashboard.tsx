import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Flame, 
  Database, 
  HardDrive, 
  FileText, 
  Edit3, 
  RefreshCw, 
  Zap,
  Layers,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  calculateQuotaOverview, 
  recordMetric, 
  FirebaseQuotaOverview 
} from '../services/firestoreMetrics';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../services/firebase';

interface FirebaseUsageDashboardProps {
  modules: any[];
  quizzes: any[];
  games: any[];
  classes: any[];
  students: any[];
  scores: any[];
  logs: any[];
  settings: any;
}

const PALETTE = [
  '#2563eb', // bold blue
  '#7c3aed', // bold purple
  '#db2777', // bold pink
  '#ea580c', // bold orange
  '#059669', // bold emerald
  '#0891b2', // bold cyan
  '#d97706', // bold amber
  '#4f46e5'  // bold indigo
];

export const FirebaseUsageDashboard: React.FC<FirebaseUsageDashboardProps> = ({
  modules,
  quizzes,
  games,
  classes,
  students,
  scores,
  logs,
  settings
}) => {
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Real-time ping test to Firestore
  const testPing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await getDocFromServer(doc(db, 'settings', 'general')).catch(() => null);
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
      recordMetric('read', 1, 1024);
    } catch {
      setPingLatency(Math.round(performance.now() - start));
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    testPing();
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const overview: FirebaseQuotaOverview = useMemo(() => {
    return calculateQuotaOverview({
      modules,
      quizzes,
      games,
      classes,
      students,
      scores,
      logs,
      settings
    }, pingLatency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, quizzes, games, classes, students, scores, logs, settings, pingLatency, refreshTrigger]);

  // Data for Storage Pie Chart: Used vs Remaining Free Tier (1,024 MB)
  const storagePieData = useMemo(() => {
    const usedMB = Math.max(0.01, overview.currentUsage.usedStorageMB);
    const remainingMB = Math.max(0, overview.sparkLimits.storageMB - usedMB);
    return [
      { name: 'Terpakai', value: Number(usedMB.toFixed(3)), color: '#ea580c' }, // Oranye kontras
      { name: 'Sisa Kuota', value: Number(remainingMB.toFixed(3)), color: '#10b981' } // Hijau kontras
    ];
  }, [overview]);

  // Data for Collections Distribution Pie Chart
  const collectionsPieData = useMemo(() => {
    return overview.collections.map((c, idx) => ({
      name: c.name,
      value: Math.max(1, Math.round(c.estimatedBytes / 1024)), // in KB
      docCount: c.docCount,
      color: PALETTE[idx % PALETTE.length]
    }));
  }, [overview]);

  return (
    <div className="space-y-6 max-w-6xl pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
            <Flame size={22} className="text-amber-600" />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Firebase Firestore</h2>
            <button
              onClick={testPing}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all border border-emerald-500 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className={isPinging ? 'animate-spin text-white' : ''} />
              <span>{isPinging ? 'Menguji...' : 'Uji Ping'}</span>
              {pingLatency !== null && (
                <span className="ml-1 px-1.5 py-0.5 bg-emerald-800/60 rounded text-[10px] font-mono font-bold">
                  {pingLatency} ms
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Storage Limit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Storage (1 GB)</span>
            <HardDrive size={16} className="text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {overview.currentUsage.usedStorageMB}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 1.024 MB</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(2, Math.min(100, overview.currentUsage.storageUsagePercentage))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
            <span className="text-emerald-600 font-bold">Sisa: {overview.currentUsage.remainingStorageMB} MB</span>
            <span className="text-orange-600 font-bold">{overview.currentUsage.storageUsagePercentage}%</span>
          </div>
        </div>

        {/* Card 2: Daily Reads */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Baca Harian</span>
            <FileText size={16} className="text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {overview.currentUsage.todayReads.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 50k</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(2, Math.min(100, overview.currentUsage.readsPercentage))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
            <span>Batas: 50.000</span>
            <span className="text-blue-600">{overview.currentUsage.readsPercentage}%</span>
          </div>
        </div>

        {/* Card 3: Daily Writes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tulis Harian</span>
            <Edit3 size={16} className="text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {overview.currentUsage.todayWrites.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 20k</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(2, Math.min(100, overview.currentUsage.writesPercentage))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
            <span>Batas: 20.000</span>
            <span className="text-purple-600">{overview.currentUsage.writesPercentage}%</span>
          </div>
        </div>

        {/* Card 4: Total Documents */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Dokumen</span>
            <Database size={16} className="text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {overview.currentUsage.totalDocs.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-400">Docs</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-amber-500 h-2 rounded-full w-full" />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
            <span>Bandwidth</span>
            <span className="font-mono text-slate-700">{overview.currentUsage.todayBandwidthMB} MB</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Dua Grafik Terpisah (Alokasi & Proporsi) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: Alokasi */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
                <PieChartIcon size={16} />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Alokasi
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              1.024 MB
            </span>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storagePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={108}
                  stroke="none"
                  strokeWidth={0}
                  paddingAngle={0}
                  dataKey="value"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {storagePieData.map((entry, index) => (
                    <Cell key={`storage-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} MB`, 'Ukuran']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 2: Proporsi */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <Layers size={16} />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Proporsi
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {overview.collections.length} Koleksi
            </span>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={collectionsPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={108}
                  stroke="none"
                  strokeWidth={0}
                  paddingAngle={0}
                  dataKey="value"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {collectionsPieData.map((entry, index) => (
                    <Cell key={`col-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, item: any) => [
                    `${value} KB (${item.payload.docCount} dokumen)`, 
                    name
                  ]}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
