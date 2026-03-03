import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Coffee, 
  Moon, 
  Users, 
  TrendingUp, 
  LayoutGrid,
  PieChart,
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
  Circle,
  Package,
  Info,
  X,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { User, Entry, DailyPacket, MonthlyStats } from './types';

const BREAKFAST_PRICE = 50;
const DINNER_PRICE = 60;
const FULL_COURSE_PRICE = 100;

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [packets, setPackets] = useState<DailyPacket[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'sheet' | 'dashboard'>('sheet');
  const [saving, setSaving] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const monthStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch('/api/users');
      const dataRes = await fetch(`/api/data?month=${monthStr}`);
      const usersData = await usersRes.json();
      const { entries, packets } = await dataRes.json();
      setUsers(usersData);
      setEntries(entries);
      setPackets(packets);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const calculateDayCost = (bPackets: number, dPackets: number) => {
    const pairs = Math.min(bPackets, dPackets);
    const extraB = bPackets - pairs;
    const extraD = dPackets - pairs;
    return (pairs * FULL_COURSE_PRICE) + (extraB * BREAKFAST_PRICE) + (extraD * DINNER_PRICE);
  };

  const monthlyStats = useMemo(() => {
    const stats = users.map(user => ({ userName: user.name, totalCost: 0 }));
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${monthStr}-${String(day).padStart(2, '0')}`;
      const dayPackets = packets.find(p => p.date === date) || { breakfast_packets: 0, dinner_packets: 0 };
      const dayCost = calculateDayCost(dayPackets.breakfast_packets, dayPackets.dinner_packets);
      
      const presentUsers = entries.filter(e => e.date === date && e.is_present === 1);
      if (presentUsers.length > 0) {
        const share = dayCost / presentUsers.length;
        presentUsers.forEach(pu => {
          const userStat = stats.find(s => s.userName === pu.user_name);
          if (userStat) userStat.totalCost += share;
        });
      }
    }
    return stats;
  }, [users, entries, packets, monthStr, daysInMonth]);

  const handleUpdatePresence = async (userId: number, day: number, isPresent: boolean) => {
    const date = `${monthStr}-${String(day).padStart(2, '0')}`;
    
    // Optimistic Update
    setEntries(prev => {
      const filtered = prev.filter(e => !(e.user_id === userId && e.date === date));
      return [...filtered, { 
        id: Math.random(), 
        user_id: userId, 
        user_name: users.find(u => u.id === userId)?.name || '', 
        date, 
        is_present: isPresent ? 1 : 0 
      }];
    });

    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, date, is_present: isPresent })
      });
    } catch (error) {
      console.error("Update failed", error);
      // Rollback on error
      fetchData();
    }
  };

  const handleUpdatePackets = async (day: number, type: 'breakfast' | 'dinner', value: number) => {
    const date = `${monthStr}-${String(day).padStart(2, '0')}`;
    const existing = packets.find(p => p.date === date) || { date, breakfast_packets: 0, dinner_packets: 0 };
    const newPackets = {
      ...existing,
      [type === 'breakfast' ? 'breakfast_packets' : 'dinner_packets']: value
    };

    // Optimistic Update
    setPackets(prev => {
      const filtered = prev.filter(p => p.date !== date);
      return [...filtered, newPackets];
    });

    try {
      await fetch('/api/packets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackets)
      });
    } catch (error) {
      console.error("Update failed", error);
      // Rollback on error
      fetchData();
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-12 h-12 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  const selectedDateStr = `${monthStr}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayPackets = packets.find(p => p.date === selectedDateStr) || { breakfast_packets: 0, dinner_packets: 0 };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
      {/* Header */}
      <header className="flex flex-col gap-6 mb-8 md:mb-12">
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tighter text-white flex items-center gap-2 md:gap-3">
              <LayoutGrid className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" />
              ElevenDine
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm mt-1 font-medium">Shared Food Expense Splitter</p>
          </motion.div>

          <button 
            onClick={() => setShowPricing(!showPricing)}
            className={`p-2 rounded-xl border transition-all ${showPricing ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 w-full md:w-auto">
            <button onClick={() => setView('sheet')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${view === 'sheet' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-400 hover:text-white'}`}>
              <LayoutGrid className="w-4 h-4" />
              Sheet
            </button>
            <button onClick={() => setView('dashboard')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${view === 'dashboard' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-400 hover:text-white'}`}>
              <PieChart className="w-4 h-4" />
              Dashboard
            </button>
          </div>

          <div className="flex items-center justify-between md:justify-start gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-xs md:text-sm font-bold min-w-[120px] text-center uppercase tracking-widest">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showPricing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowPricing(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-card p-6 md:p-8 max-w-md w-full neo-shadow border-emerald-500/30 bg-[#0d0d0d]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Info className="w-6 h-6 text-emerald-500" />Pricing Logic</h3>
                <button onClick={() => setShowPricing(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5"><span className="text-zinc-400 font-medium">Breakfast Only</span><span className="text-xl font-bold text-white">₹50</span></div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5"><span className="text-zinc-400 font-medium">Dinner Only</span><span className="text-xl font-bold text-white">₹60</span></div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10 bg-emerald-500/5"><div className="flex flex-col"><span className="text-emerald-500 font-bold">Full Course</span><span className="text-[10px] text-emerald-500/60 uppercase tracking-widest">Breakfast + Dinner</span></div><span className="text-2xl font-bold text-emerald-500">₹100</span></div>
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-zinc-400 leading-relaxed italic">"The total cost of packets purchased for the day is calculated using the best possible rate and then divided equally among everyone marked as present for that day."</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'sheet' ? (
          <motion.div key="sheet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            {/* Day Selector for Mobile */}
            <div className="md:hidden flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Selected Day</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{selectedDay}</span>
                    <span className="text-zinc-500 text-sm">{currentDate.toLocaleString('default', { month: 'short' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))} className="p-3 bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => setSelectedDay(Math.min(daysInMonth, selectedDay + 1))} className="p-3 bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-transform"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Mobile Day View Card */}
              <div className="glass-card p-6 neo-shadow border-emerald-500/20 transform-3d hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-emerald-500" />
                    <h3 className="font-bold text-lg">Day {selectedDay} Packets</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3 shadow-inner-3d">
                    <div className="flex items-center gap-2 text-amber-500"><Coffee className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-widest">Breakfast</span></div>
                    <div className="relative w-full">
                      <select 
                        value={selectedDayPackets.breakfast_packets}
                        onChange={(e) => handleUpdatePackets(selectedDay, 'breakfast', parseInt(e.target.value))}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-xl font-bold font-mono appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer text-center"
                      >
                        {Array.from({ length: 21 }).map((_, i) => (
                          <option key={i} value={i} className="bg-[#1a1a1a] text-white">{i}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3 shadow-inner-3d">
                    <div className="flex items-center gap-2 text-indigo-400"><Moon className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-widest">Dinner</span></div>
                    <div className="relative w-full">
                      <select 
                        value={selectedDayPackets.dinner_packets}
                        onChange={(e) => handleUpdatePackets(selectedDay, 'dinner', parseInt(e.target.value))}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-xl font-bold font-mono appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer text-center"
                      >
                        {Array.from({ length: 21 }).map((_, i) => (
                          <option key={i} value={i} className="bg-[#1a1a1a] text-white">{i}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Presence for Day {selectedDay}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {users.map(user => {
                    const entry = entries.find(e => e.user_id === user.id && e.date === selectedDateStr);
                    const isPresent = entry?.is_present === 1;
                    const isSaving = saving === `p-${user.id}-${selectedDay}`;
                    return (
                      <button 
                        key={user.id} 
                        onClick={() => handleUpdatePresence(user.id, selectedDay, !isPresent)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all transform-3d active:scale-95 ${isPresent ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/5 shadow-lg' : 'bg-white/5 border-white/10'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-3d ${isPresent ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-500'}`}>{user.name[0]}</div>
                          <span className={`font-bold text-base ${isPresent ? 'text-white' : 'text-zinc-500'}`}>{user.name}</span>
                        </div>
                        {isPresent ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <Circle className="w-7 h-7 text-zinc-800" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block glass-card overflow-hidden neo-shadow transform-3d">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500 sticky left-0 bg-[#121212] z-20 min-w-[180px]">Member</th>
                      {Array.from({ length: daysInMonth }).map((_, i) => (
                        <th key={i} className="p-4 text-center text-xs font-bold text-zinc-500 min-w-[120px]">Day {i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-emerald-500/5 border-b border-white/10">
                      <td className="p-4 sticky left-0 bg-[#151a15] z-10 border-r border-white/10">
                        <div className="flex items-center gap-3"><Package className="w-5 h-5 text-emerald-500" /><span className="font-bold text-xs uppercase tracking-widest text-emerald-500">Daily Packets</span></div>
                      </td>
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = `${monthStr}-${String(day).padStart(2, '0')}`;
                        const dayPacket = packets.find(p => p.date === date) || { breakfast_packets: 0, dinner_packets: 0 };
                        const isSaving = saving === `pkt-${day}`;
                        return (
                          <td key={i} className="p-2">
                            <div className="flex flex-col gap-2 bg-white/5 rounded-lg p-2 border border-emerald-500/20 relative shadow-inner-3d">
                              <div className="flex items-center justify-between gap-1">
                                <Coffee className="w-3 h-3 text-amber-500/70" />
                                <div className="relative flex-1">
                                  <select 
                                    value={dayPacket.breakfast_packets}
                                    onChange={(e) => handleUpdatePackets(day, 'breakfast', parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded px-1 text-[10px] font-mono appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer text-center"
                                  >
                                    {Array.from({ length: 21 }).map((_, i) => (
                                      <option key={i} value={i} className="bg-[#1a1a1a] text-white">{i}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <Moon className="w-3 h-3 text-indigo-400/70" />
                                <div className="relative flex-1">
                                  <select 
                                    value={dayPacket.dinner_packets}
                                    onChange={(e) => handleUpdatePackets(day, 'dinner', parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded px-1 text-[10px] font-mono appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer text-center"
                                  >
                                    {Array.from({ length: 21 }).map((_, i) => (
                                      <option key={i} value={i} className="bg-[#1a1a1a] text-white">{i}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 sticky left-0 bg-[#0d0d0d] z-10 border-r border-white/10">
                          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xs">{user.name[0]}</div><span className="font-semibold text-sm">{user.name}</span></div>
                        </td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const date = `${monthStr}-${String(day).padStart(2, '0')}`;
                          const entry = entries.find(e => e.user_id === user.id && e.date === date);
                          const isPresent = entry?.is_present === 1;
                          const isSaving = saving === `p-${user.id}-${day}`;
                          return (
                            <td key={i} className="p-2 text-center">
                              <button onClick={() => handleUpdatePresence(user.id, day, !isPresent)} className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isPresent ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/10 text-zinc-600 hover:text-zinc-400'}`}>
                                {isPresent ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="glass-card p-6 neo-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-emerald-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Group Expense</p>
                      <h3 className="text-xl md:text-2xl font-bold text-white">₹{Math.round(monthlyStats.reduce((sum, s) => sum + s.totalCost, 0)).toLocaleString()}</h3>
                    </div>
                  </div>
                </div>
                <div className="glass-card p-6 neo-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl"><Coffee className="w-6 h-6 text-amber-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Packets (B)</p>
                      <h3 className="text-xl md:text-2xl font-bold text-white">{packets.reduce((sum, p) => sum + p.breakfast_packets, 0)}</h3>
                    </div>
                  </div>
                </div>
                <div className="glass-card p-6 neo-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl"><Moon className="w-6 h-6 text-indigo-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Packets (D)</p>
                      <h3 className="text-xl md:text-2xl font-bold text-white">{packets.reduce((sum, p) => sum + p.dinner_packets, 0)}</h3>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 md:p-8 neo-shadow h-[300px] md:h-[400px]">
                <h3 className="text-sm md:text-lg font-bold mb-6 md:mb-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" />Individual Cost Breakdown</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="userName" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="totalCost" radius={[4, 4, 0, 0]}>
                      {monthlyStats.map((entry, index) => <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6 neo-shadow h-fit">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" />Monthly Totals</h3>
              <div className="space-y-3">
                {monthlyStats.sort((a, b) => b.totalCost - a.totalCost).map((stat, i) => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={stat.userName} className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{stat.userName[0]}</div>
                        <span className="font-bold text-sm">{stat.userName}</span>
                      </div>
                      <span className="text-emerald-500 font-bold text-sm">₹{Math.round(stat.totalCost).toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
