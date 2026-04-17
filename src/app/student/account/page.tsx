"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Wallet, LogOut, ArrowDownRight, ArrowUpRight, 
  ShieldCheck, Receipt, PieChart, Activity, User, Menu, X, ArrowLeft, TrendingUp, Mail, Layers, Command
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getSession, clearSession } from "@/lib/session";
import { validateSession } from "@/lib/session-validation";

export default function StudentAccountDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [fonts, setFonts] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAndFetch = async () => {
      const s = getSession();
      if (!s) {
        router.push("/");
        return;
      }
      
      // Validate session is still active
      const isValid = await validateSession();
      if (!isValid) {
        clearSession();
        router.push("/");
        return;
      }
      
      setSession(s);
      if (s.roll) fetchData(s.roll);
    };
    
    validateAndFetch();
  }, []);

  const fetchData = async (rollId: string) => {
    try {
        const { data: student } = await supabase.from('students').select('*').eq('roll_id', rollId).single();
        if (student) {
            setStudentInfo(student);
            setBalance(student.balance);
            
            const [{ data: n }, { data: trans }, { data: f }] = await Promise.all([
              supabase.from('school_notifications').select('*, school_fonts(name)').or(`student_id.is.null,student_id.eq.${student.id}`).order('created_at', { ascending: false }),
              supabase.from('fund_transactions').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
              supabase.from('school_fonts').select('*')
            ]);
            
            const now = new Date().getTime();
            const active = (n || []).filter(n => !n.end_at || new Date(n.end_at).getTime() > now);
            
            setNotifications(active);
            setTransactions(trans || []);
            setFonts(f || []);
        }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const monthlyTxs = transactions.filter(t => new Date(t.created_at) >= startOfMonth);
    const yearlyTxs = transactions.filter(t => new Date(t.created_at) >= startOfYear);

    return {
        monthlyReceived: monthlyTxs.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0),
        yearlyReceived: yearlyTxs.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0),
        totalReceived: transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0),
        totalSpent: Math.abs(transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + (t.amount || 0), 0)),
    };
  }, [transactions]);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };


  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden relative pb-24 md:pb-32">
       <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-600/5 blur-[140px] rounded-full -mr-48 -mt-48 pointer-events-none" />
       <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[140px] rounded-full -ml-48 -mb-48 pointer-events-none" />
      
      {/* Font Library Injection */}
      <style dangerouslySetInnerHTML={{ __html: fonts.map(f => `
        @font-face {
          font-family: '${f.name}';
          src: url(${f.font_data});
        }
      `).join('\n') }} />

      <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-16 space-y-8 md:space-y-12 relative z-10 pt-4 md:pt-8">
        
        {/* Premium Desktop Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/[0.02] p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden group gap-6">
          <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
          <div className="flex items-center space-x-4 md:space-x-6 relative z-10 w-full md:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/40 text-white font-black text-lg md:text-xl flex-shrink-0">
               {session?.name?.[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
               <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                  <h1 className="text-xl md:text-3xl font-black tracking-tighter uppercase italic leading-none truncate">{session?.name}</h1>
                  <div className="flex space-x-0.5 md:space-x-1 mt-2 sm:mt-0 flex-shrink-0">
                    {[1,2,3,4,5].map(s => <TrendingUp key={s} className={`w-3 h-3 md:w-4 md:h-4 ${s <= (studentInfo?.rating || 5) ? 'text-amber-500' : 'text-gray-800'}`} />)}
                  </div>
               </div>
               <div className="flex items-center space-x-2 md:space-x-3 mt-1.5 opacity-50">
                  <ShieldCheck className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500 flex-shrink-0" />
                  <p className="font-black tracking-[0.15em] md:tracking-[0.2em] text-[8px] md:text-[10px] uppercase truncate">Roll Number: {session?.roll}</p>
               </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4 relative z-10 w-full md:w-auto justify-end">
            <button onClick={() => router.push("/")} className="p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl border border-white/10 transition-all hover:scale-105"><ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-500 hover:text-white" /></button>
            <button onClick={handleLogout} className="p-3 md:p-4 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl md:rounded-2xl border border-rose-500/10 transition-all hover:scale-105"><LogOut className="w-4 h-4 md:w-5 md:h-5" /></button>
          </div>
        </header>

        {/* Global Notifications - STICKY TOP BAR */}
        <div className="space-y-6">
           <AnimatePresence>
             {notifications.filter(n => !n.student_id).map((n) => (
               <motion.div key={n.id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                 <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/5 border border-blue-500/20 p-8 rounded-[3rem] relative overflow-hidden backdrop-blur-2xl group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Layers className="w-24 h-24 text-blue-400" /></div>
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-400/20 flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Global Broadcast</span>
                       </div>
                    </div>
                    <div className="text-2xl font-black text-white leading-tight tracking-tight uppercase italic" style={{ fontFamily: n.school_fonts?.name || 'inherit' }}>{n.message}</div>
                 </div>
               </motion.div>
             ))}
           </AnimatePresence>
        </div>

        {/* Hero & Stats High-Fi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
           <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden group min-h-[360px] md:min-h-[440px] flex flex-col justify-between">
              <div className="absolute -top-12 -right-12 p-8 md:p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000"><PieChart className="w-48 h-48 md:w-80 md:h-80 text-white" /></div>
              <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              
              <div className="relative z-10 space-y-8 md:space-y-12">
                 <div className="flex items-center space-x-3 md:space-x-4 text-emerald-100 font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[8px] md:text-[10px] italic">
                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" /><span>Verified Account System</span>
                 </div>
                 <div className="space-y-3 md:space-y-4">
                    <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tightest leading-none text-white italic">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                    <p className="text-emerald-100/60 font-medium text-sm md:text-lg max-w-lg leading-relaxed">Central principal node treasury. Funds are securely locked and allocated for academic purposes.</p>
                 </div>
              </div>

              <div className="relative z-10 flex flex-wrap gap-6 md:gap-8 lg:space-x-12 pt-8 md:pt-10 border-t border-emerald-400/20">
                 <div><p className="text-[8px] md:text-[10px] text-emerald-200/40 uppercase font-black tracking-[0.2em] mb-1 md:mb-2 italic">Status</p><p className="text-xl md:text-2xl font-black text-white italic uppercase tracking-widest">Active Sync</p></div>
                 <div className="w-[1px] bg-emerald-400/20 h-10 md:h-12 hidden sm:block" />
                 <div><p className="text-[8px] md:text-[10px] text-emerald-200/40 uppercase font-black tracking-[0.2em] mb-1 md:mb-2 italic">Security Level</p><p className="text-xl md:text-2xl font-black text-white italic uppercase tracking-widest">Level 12</p></div>
              </div>
           </motion.div>

           <div className="flex flex-col gap-6 md:gap-8">
              {[
                { l: 'Monthly Transmissions', v: stats.monthlyReceived, c: 'emerald', i: TrendingUp, d: 'Synced from repository' },
                { l: 'Yearly Accumulation', v: stats.yearlyReceived, c: 'blue', i: Activity, d: 'Annual sync total' },
                { l: 'Total Deductions', v: stats.totalSpent, c: 'rose', i: ArrowUpRight, d: 'Authorized debit logs' }
              ].map((s, idx) => (
                <div key={idx} className="bg-white/[0.02] border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] backdrop-blur-xl group hover:border-white/10 transition-all flex flex-col justify-between flex-1">
                   <div className="flex items-center justify-between mb-2">
                      <p className={`text-[8px] md:text-[10px] font-black uppercase text-${s.c}-500 tracking-[0.15em] md:tracking-[0.2em] italic`}>{s.l}</p>
                      <s.i className={`w-4 h-4 md:w-5 md:h-5 text-${s.c}-500 opacity-30`} />
                   </div>
                   <h3 className="text-3xl md:text-4xl font-black text-white italic leading-tight pb-3 md:pb-4">₹{s.v.toLocaleString()}</h3>
                   <div className="flex items-center space-x-2 md:space-x-3 opacity-30">
                      <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-${s.c}-500`} />
                      <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">{s.d}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Ledger - High-Fi Table */}
        <div className="bg-white/5 border border-white/5 rounded-[3rem] md:rounded-[4rem] overflow-hidden backdrop-blur-xl relative">
           <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
           <div className="p-6 md:p-10 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4 md:space-x-5">
                 <Receipt className="w-8 h-8 md:w-10 md:h-10 text-emerald-500 opacity-50" />
                 <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter">Transaction History</h3>
              </div>
              <span className="text-[8px] md:text-[9px] font-black font-mono tracking-widest text-emerald-500 bg-emerald-500/10 px-4 md:px-6 py-1.5 md:py-2 rounded-full border border-emerald-500/20 whitespace-nowrap">TRANS-SYNC-ACTIVE</span>
           </div>
           
           <div className="divide-y divide-white/5">
             {transactions.map((tx) => (
               <div key={tx.id} className="p-6 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/[0.02] transition-all group gap-4 sm:gap-0">
                  <div className="flex items-center space-x-4 md:space-x-10 w-full sm:w-auto">
                     <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center transition-all group-hover:scale-110 flex-shrink-0 ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xl shadow-emerald-900/10' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-xl shadow-rose-900/10'}`}>
                        {tx.amount > 0 ? <ArrowDownRight className="w-6 h-6 md:w-8 md:h-8" /> : <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8" />}
                     </div>
                     <div className="min-w-0 flex-1">
                        <h4 className="text-base md:text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1 md:mb-2 underline decoration-white/5 decoration-wavy underline-offset-8 decoration-1 group-hover:decoration-current transition-all truncate">{tx.description}</h4>
                        <div className="flex items-center space-x-3 md:space-x-4">
                           <Command className="w-2.5 h-2.5 md:w-3 md:h-3 text-gray-700 flex-shrink-0" />
                           <p className="text-[8px] md:text-[10px] font-black text-gray-700 uppercase tracking-widest italic">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                  </div>
                  <div className={`text-2xl md:text-3xl font-black italic tracking-tighter ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-500'} sm:text-right w-full sm:w-auto`}>
                     {tx.amount > 0 ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
               </div>
             ))}
             {transactions.length === 0 && <div className="py-24 md:py-40 text-center opacity-10"><Receipt className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-6 md:mb-8"/><p className="text-gray-500 font-black uppercase text-xs md:text-sm italic tracking-[0.3em] md:tracking-[0.5em] px-4">No synchronization logs found in local ledger</p></div>}
           </div>
        </div>

        <footer className="pt-24 opacity-10 flex flex-col items-center pb-20 space-y-4">
           <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/20" />
           <p className="text-[10px] font-black uppercase tracking-[0.6em] italic text-center">Secure Account System • Verified 2026</p>
        </footer>
      </div>
    </div>
  );
}
