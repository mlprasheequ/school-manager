"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, BookOpen, UserCheck, Lock, ArrowRight, Loader2, Command, Activity, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    await new Promise((res) => setTimeout(res, 1200));

    const domain = email.split('@')[1];
    if (domain === "account.com") {
      const handle = email.split('@')[0];
      const { data: student, error: fetchErr } = await supabase
        .from('students')
        .select('*')
        .eq('username', handle)
        .eq('password', password)
        .single();
      
      if (fetchErr || !student) {
        setError("AUTHENTICATION_FAILURE: INVALID_CREDENTIALS");
        setLoading(false);
        return;
      }

      setSession({
        email: email,
        role: 'student-account',
        name: student.full_name,
        roll: student.roll_id,
        id: student.id
      });

      router.push("/student/account");
    } else if (domain === "system.com") {
      setSession({ email, role: 'admin', name: 'Master Admin' });
      router.push("/admin");
    } else {
      setError("GATEWAY_ROUTING_ERROR: INVALID_DOMAIN");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden font-sans selection:bg-indigo-500/30 px-4 py-8">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] bg-indigo-600/10 rounded-full blur-[120px] md:blur-[150px] lg:blur-[180px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px] bg-blue-600/5 rounded-full blur-[140px] md:blur-[170px] lg:blur-[200px] pointer-events-none" />
      
      {/* HUD Accents */}
      <div className="absolute top-10 left-10 opacity-20 pointer-events-none hidden lg:block">
         <div className="flex items-center space-x-3 mb-2"><Activity className="w-4 h-4 text-indigo-500" /><span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Satellite Stream: Active</span></div>
         <div className="w-48 h-px bg-gradient-to-r from-gray-800 to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="z-10 w-full max-w-md p-0.5 rounded-[2rem] md:rounded-[3rem] bg-indigo-500/10 shadow-[0_0_60px_rgba(79,70,229,0.1)] md:shadow-[0_0_100px_rgba(79,70,229,0.1)] relative"
      >
        <div className="bg-[#020617]/90 rounded-[1.9rem] md:rounded-[2.9rem] p-6 md:p-10 lg:p-12 border border-white/5 backdrop-blur-4xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-1000" />
          
          <div className="mb-8 md:mb-10 text-center relative">
             <div className="inline-flex p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/20 mb-4 md:mb-6 group-hover:scale-110 transition-transform shadow-2xl relative">
                <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-indigo-400 relative z-10" />
             </div>
             
             <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">
                Login <br/><span className="text-indigo-500">Page</span>
             </h1>
             <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-gray-600 italic">Enter Your Username and Password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-700 ml-3 italic">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 md:px-6 py-4 md:py-5 bg-white/[0.02] border border-white/5 rounded-[1.2rem] md:rounded-[1.5rem] text-white placeholder-gray-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all pl-12 md:pl-14 font-black italic text-xs"
                  placeholder="yourname@example.com"
                  required
                />
                <UserCheck className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-800" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-700 ml-3 italic">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 md:px-6 py-4 md:py-5 bg-white/[0.02] border border-white/5 rounded-[1.2rem] md:rounded-[1.5rem] text-white placeholder-gray-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all pl-12 md:pl-14 font-black italic text-xs"
                  placeholder="••••••••••••"
                  required
                />
                <Lock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-800" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-rose-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-rose-500/10 p-3 md:p-4 rounded-xl md:rounded-2xl border border-rose-500/20 text-center italic">
                   {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              className="group w-full py-4 md:py-5 px-6 md:px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.3em] md:tracking-[0.5em] rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-indigo-900/40 transition-all duration-300 flex items-center justify-center disabled:opacity-50 text-xs"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
              ) : (
                <span className="flex items-center">
                  Login <ArrowRight className="ml-2 md:ml-3 w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-2 transition-transform" />
                </span>
              )}
            </button>
          </form>
          
          <div className="mt-8 md:mt-12 flex flex-col items-center space-y-3 md:space-y-4 opacity-20 group-hover:opacity-100 transition-opacity duration-1000">
             <div className="flex items-center space-x-4 md:space-x-6">
                <Zap className="w-3 h-3 md:w-4 md:h-4 text-indigo-500" />
                <div className="w-[1px] h-6 md:h-8 bg-white/10" />
                <div className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-gray-500 italic">Your Information is Safe</div>
             </div>
          </div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-6 md:bottom-10 right-6 md:right-10 opacity-10 pointer-events-none flex flex-col items-end">
         <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-gray-500 mb-2">Secure Login System</p>
         <div className="w-48 md:w-64 h-px bg-gradient-to-l from-gray-800 to-transparent" />
      </div>
    </div>
  );
}
