"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Banknote, Users, School, Clock, MoreVertical, LogOut, Bell, Lock, X, ShieldCheck } from "lucide-react";
import { getSession, clearSession } from "@/lib/session";

interface MobileNavProps {
  userRole?: string;
  userName?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export default function MobileNavigation({ userRole, userName }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const s = getSession();
    setSession(s);
  }, []);

  // Don't show nav on login page or before mount
  if (pathname === "/" || !isMounted) return null;

  const handleNavigation = (path: string) => {
    setIsMoreOpen(false);
    
    // Handle Security Protocol specially
    if (path === "/admin?showSecurity=true") {
      // Set a flag in localStorage to communicate with admin page
      if (typeof window !== 'undefined') {
        localStorage.setItem('openSecurityModal', 'true');
      }
    }
    
    router.push(path);
  };

  const handleLogout = () => {
    clearSession();
    setIsMoreOpen(false);
    router.push("/");
  };

  // Define main navigation items (4 slots)
  const mainNavItems: NavItem[] = [
    { id: "funds", label: "Funds", icon: Banknote, path: "/admin?tab=funds" },
    { id: "students", label: "Staff", icon: Users, path: "/admin?tab=students" },
    { id: "finances", label: "Finances", icon: School, path: "/admin?tab=finances" },
    { id: "transactions", label: "History", icon: Clock, path: "/admin?tab=transactions" },
  ];

  // Secondary navigation items (for More menu)
  const secondaryNavItems: NavItem[] = [
    { id: "notifications", label: "Notifications", icon: Bell, path: "/admin?tab=broadcast" },
    { id: "active-users", label: "Active Users", icon: Users, path: "/admin?tab=active-users" },
    { id: "security", label: "Security Protocol", icon: ShieldCheck, path: "/admin?showSecurity=true" },
  ];

  const isActive = (path: string) => {
    const tab = path.split("?tab=")[1];
    return tab ? pathname.includes(tab) : false;
  };

  return (
    <>
      {/* Bottom Navigation Bar - Minimal Design */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Gradient Line Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

        {/* Ultra-Compact Navigation */}
        <div className="bg-[#0f172a]/80 backdrop-blur-lg border-t border-white/5">
          <div className="flex items-center justify-around px-1 py-2 gap-0">
            {/* Main Navigation Items (4 slots) */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className="relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 flex-1"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {/* Subtle active background */}
                  {active && (
                    <motion.div
                      layoutId="activeBackground"
                      className="absolute inset-0 bg-indigo-500/15 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  {/* Icon Only */}
                  <Icon
                    className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                      active
                        ? "text-indigo-400"
                        : "text-gray-500 hover:text-gray-400"
                    }`}
                    strokeWidth={1.5}
                  />

                  {/* Tiny active dot */}
                  {active && (
                    <motion.div
                      className="absolute -bottom-0.5 w-1 h-1 bg-indigo-400 rounded-full"
                      layoutId="activeDot"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              );
            })}

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-white/10 rounded-full" />

            {/* More Menu Button (5th slot) */}
            <motion.button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 flex-1"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Subtle active background */}
              {isMoreOpen && (
                <motion.div
                  className="absolute inset-0 bg-indigo-500/15 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}

              {/* Icon with rotation */}
              <motion.div
                animate={{ rotate: isMoreOpen ? 90 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <MoreVertical
                  className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                    isMoreOpen
                      ? "text-indigo-400"
                      : "text-gray-500 hover:text-gray-400"
                  }`}
                  strokeWidth={1.5}
                />
              </motion.div>

              {/* Tiny active dot */}
              {isMoreOpen && (
                <motion.div
                  className="absolute -bottom-0.5 w-1 h-1 bg-indigo-400 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                />
              )}
            </motion.button>
          </div>
        </div>

        {/* Bottom Sheet Overlay */}
        <AnimatePresence>
          {isMoreOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMoreOpen(false)}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              />

              {/* Bottom Sheet Panel */}
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Sheet Content */}
                <div className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      More Options
                    </h3>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMoreOpen(false)}
                      className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                    </motion.button>
                  </div>

                  {/* Secondary Navigation Items */}
                  <div className="p-4 space-y-2">
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => {
                            if (item.path !== "#") {
                              handleNavigation(item.path);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 group"
                          whileHover={{ scale: 1.02, paddingLeft: 20 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon className="w-5 h-5 text-indigo-400 stroke-[1.5] flex-shrink-0 group-hover:text-indigo-300 transition-colors" strokeWidth={1.5} />
                          <span className="text-sm font-bold uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">
                            {item.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/5 mx-4" />

                  {/* Logout Button */}
                  <motion.button
                    onClick={handleLogout}
                    className="w-full px-6 py-3 flex items-center gap-3 text-rose-400 hover:bg-rose-500/10 transition-all duration-300 group"
                    whileHover={{ paddingLeft: 28 }}
                  >
                    <LogOut className="w-5 h-5 stroke-[1.5] flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-sm font-bold uppercase tracking-wider">Logout</span>
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Minimal Spacer for bottom navigation */}
      <div className="md:hidden h-12" />
    </>
  );
}
