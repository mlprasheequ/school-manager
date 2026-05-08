"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabase";
import {
  enrollStudent,
  deleteStudent,
  postLedgerEntry,
  fetchStudents,
} from "@/lib/school-actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Wallet, LogOut, BookOpen, Trash2, TrendingUp, UserPlus,
  ChevronRight, X, Save, Banknote, Lock, Menu, Search, Activity, ShieldCheck,
  Plus, UsersRound, Calculator, CheckSquare, Square, Clock, Bookmark,
  Settings, ArrowUpRight, ArrowDownRight, RefreshCw, Mail, CheckCircle2, User, Layout, CreditCard, Upload, Download, Calendar
} from "lucide-react";
import { downloadCSV, downloadPDF } from "@/lib/download-utils";


// ─── Types ───────────────────────────────────────────────────────────────────
interface Student { id: string; full_name: string; roll_id: string; grade: string; balance: number; email_account?: string; email_library?: string; password?: string; rating?: number; is_responsible?: boolean; username?: string; last_password_change?: string; }
interface Group { id: string; name: string; student_ids: string[]; }

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  
  // Always initialize with default value for SSR consistency
  const [activeTab, setActiveTab] = useState("funds");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    
    // Read URL params only on client side after mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveTab(tab);
      }
    }
  }, []);
  
  // Sync activeTab with URL params and handle Security Protocol
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const currentTabParam = params.get('tab');
    const showSecurityFromUrl = params.get('showSecurity');
    
    // Handle Security Protocol modal (immediately on page load)
    if (showSecurityFromUrl === 'true') {
      setShowProfileSettings(true);
      // Clean up the URL parameter
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('showSecurity');
      if (cleanParams.toString()) {
        window.history.replaceState({}, '', `/admin?${cleanParams.toString()}`);
      } else {
        window.history.replaceState({}, '', '/admin');
      }
    }
    
    // Handle tab parameter
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, []);
  
  // Listen for URL param changes (browser back/forward)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get('tab');
      const showSecurityFromUrl = params.get('showSecurity');
      
      if (tabFromUrl && tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
      }
      
      if (showSecurityFromUrl === 'true') {
        setShowProfileSettings(true);
        // Clean up the URL parameter
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete('showSecurity');
        if (cleanParams.toString()) {
          window.history.replaceState({}, '', `/admin?${cleanParams.toString()}`);
        } else {
          window.history.replaceState({}, '', '/admin');
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, isMounted]);

  // Watch for URL search parameter changes (for router.push navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkUrlParams = () => {
      // Check localStorage for Security Modal trigger
      const openSecurityModal = localStorage.getItem('openSecurityModal');
      if (openSecurityModal === 'true') {
        setShowProfileSettings(true);
        localStorage.removeItem('openSecurityModal');
      }
      
      const params = new URLSearchParams(window.location.search);
      const showSecurityFromUrl = params.get('showSecurity');
      
      if (showSecurityFromUrl === 'true') {
        setShowProfileSettings(true);
        // Clean up the URL parameter
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete('showSecurity');
        if (cleanParams.toString()) {
          window.history.replaceState({}, '', `/admin?${cleanParams.toString()}`);
        } else {
          window.history.replaceState({}, '', '/admin');
        }
      }
    };
    
    // Check immediately and on interval to catch URL changes
    checkUrlParams();
    const interval = setInterval(checkUrlParams, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Update URL when activeTab changes
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const currentTabParam = params.get('tab');
    
    if (currentTabParam !== activeTab) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.set('tab', activeTab);
      router.replace(`/admin?${newParams.toString()}`, { scroll: false });
    }
  }, [activeTab, isMounted, router]);

  // Admin profile state
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [adminProfile, setAdminProfile] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", newUsername: "" });
  
  // ─── Data ─────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [fundTransactions, setFundTransactions] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [fonts, setFonts] = useState<any[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // ─── Funds Tab State ───────────────────────────────────────────────────────
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMode, setBulkMode] = useState<"all" | "group">("all");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [bulkAction, setBulkAction] = useState<"add" | "sub">("add");
  const [bulkPurpose, setBulkPurpose] = useState("");
  
  const [singleSearch, setSingleSearch] = useState("");
  const [singleSelected, setSingleSelected] = useState<Student | null>(null);
  const [showSingleDropdown, setShowSingleDropdown] = useState(false);
  const [singleAmount, setSingleAmount] = useState("");
  const [singlePurpose, setSinglePurpose] = useState("");
  const [singleType, setSingleType] = useState<"add" | "sub">("add");

  // ─── Finance Tab State ─────────────────────────────────────────────────────
  const [ledgerPurpose, setLedgerPurpose] = useState("");
  const [ledgerParty, setLedgerParty] = useState("");
  const [ledgerType, setLedgerType] = useState<"Income" | "Expense">("Income");
  const [ledgerValue, setLedgerValue] = useState("");
  const [financeStartDate, setFinanceStartDate] = useState("");
  const [financeEndDate, setFinanceEndDate] = useState("");
  const formatSignedCurrency = (amount: number) => {
    if (amount > 0) return `+₹${Math.abs(amount).toLocaleString()}`;
    if (amount < 0) return `-₹${Math.abs(amount).toLocaleString()}`;
    return `₹0`;
  };
  const getFinancialYearLabel = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 3 = Apr
    const startYear = month >= 3 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endYearShort}`;
  };
  const buildTransactionAuditData = (transactions: any[]) => {
    const studentStats = students.reduce((acc, student) => {
      const studentTransactions = transactions.filter((tx) => tx.student_id === student.id);
      const studentIncome = studentTransactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const studentExpense = studentTransactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      acc[student.id] = {
        currentBalance: student.balance || 0,
        totalIncome: studentIncome,
        totalExpense: studentExpense,
      };
      return acc;
    }, {} as Record<string, { currentBalance: number; totalIncome: number; totalExpense: number }>);

    return transactions.map((tx) => {
      const student = students.find((s) => s.id === tx.student_id);
      const stats = tx.student_id ? studentStats[tx.student_id] : undefined;
      return {
        Date: new Date(tx.created_at).toLocaleDateString(),
        Student: student?.full_name || "Unknown",
        RollID: student?.roll_id || "N/A",
        Description: tx.description,
        Type: tx.type,
        Amount: formatSignedCurrency(tx.amount),
        CurrentBalance: formatSignedCurrency(stats?.currentBalance ?? 0),
        StudentIncome: formatSignedCurrency(stats?.totalIncome ?? 0),
        StudentExpense: formatSignedCurrency(-(stats?.totalExpense ?? 0)),
      };
    });
  };

  const handleDownloadFinances = (type: "all" | "month" | "year" | "custom") => {
    let data = ledger.filter((item) => !item.student_id);
    const now = new Date();
    
    if (type === "month") {
      data = data.filter(item => {
        const d = new Date(item.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (type === "year") {
      data = data.filter(item => {
        const d = new Date(item.created_at);
        return d.getFullYear() === now.getFullYear();
      });
    } else if (type === "custom" && financeStartDate && financeEndDate) {
      const s = new Date(financeStartDate);
      const e = new Date(financeEndDate);
      e.setHours(23, 59, 59, 999);
      data = data.filter(item => {
        const d = new Date(item.created_at);
        return d >= s && d <= e;
      });
    }

    const exportData = data.map(item => ({
      Date: new Date(item.created_at).toLocaleDateString(),
      Description: item.description,
      Party: item.party_name,
      Type: item.amount > 0 ? "Income" : "Expense",
      Amount: formatSignedCurrency(item.amount),
    }));

    downloadPDF("Global Finance Records", exportData, `finances_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadStudents = () => {
    const exportData = students.map(s => ({
      Name: s.full_name,
      RollID: s.roll_id,
      Balance: `₹${s.balance.toLocaleString()}`,
      Date: (s as any).created_at
        ? new Date((s as any).created_at).toLocaleDateString()
        : new Date().toLocaleDateString(),
    }));
    downloadPDF("Student Personnel List", exportData, `students_all_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadStudentLedger = (student: Student) => {
    const studentTransactions = fundTransactions.filter(tx => tx.student_id === student.id);
    const exportData = studentTransactions.map(tx => ({
      Date: new Date(tx.created_at).toLocaleDateString(),
      Description: tx.description,
      Type: tx.type,
      Amount: `₹${tx.amount.toLocaleString()}`,
    }));
    downloadPDF(`Ledger for ${student.full_name}`, exportData, `ledger_${student.full_name}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ─── Selective Bulk Add State ───────────────────────────────────────────────────────
  const [selectiveAmount, setSelectiveAmount] = useState("");
  const [selectivePurpose, setSelectivePurpose] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // ─── Bulk Student Credit State ─────────────────────────────────────────────────────
  const [bulkCreditPurpose, setBulkCreditPurpose] = useState("");
  const [bulkCreditAmount, setBulkCreditAmount] = useState("");
  const [bulkCreditSearch, setBulkCreditSearch] = useState("");
  const [selectedStudentsForCredit, setSelectedStudentsForCredit] = useState<string[]>([]);

  // ─── Transactions Tab State ─────────────────────────────────────────────────────
  const [transactionSearch, setTransactionSearch] = useState("");

  // Filter transactions based on search
  const searchedTransactions = useMemo(() => {
    const filteredTransactions = viewingStudent ? fundTransactions.filter(tx => tx.student_id === viewingStudent.id) : fundTransactions;
    if (!transactionSearch) return filteredTransactions;
    const searchLower = transactionSearch.toLowerCase();
    return filteredTransactions.filter(tx => {
      const student = students.find(s => s.id === tx.student_id);
      if (!student) return false;
      return (
        student.full_name.toLowerCase().includes(searchLower) ||
        student.roll_id.toLowerCase().includes(searchLower) ||
        student.grade?.toLowerCase().includes(searchLower) ||
        student.email_account?.toLowerCase().includes(searchLower) ||
        student.email_library?.toLowerCase().includes(searchLower) ||
        student.username?.toLowerCase().includes(searchLower) ||
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.type?.toLowerCase().includes(searchLower) ||
        tx.amount.toString().includes(searchLower)
      );
    });
  }, [fundTransactions, viewingStudent, transactionSearch, students]);

  useEffect(() => {
    if (!isMounted || fundTransactions.length === 0 || students.length === 0) return;

    const now = new Date();
    // Financial year completion happens after March, so trigger from April onward.
    if (now.getMonth() < 3) return;

    const previousFyStartYear = now.getFullYear() - 1;
    const previousFyLabel = `${previousFyStartYear}-${String(now.getFullYear() % 100).padStart(2, "0")}`;
    const storageKey = `auto_financial_year_audit_${previousFyLabel}`;
    if (localStorage.getItem(storageKey) === "done") return;

    const previousFyTransactions = fundTransactions.filter((tx) => {
      const txDate = new Date(tx.created_at);
      const fyLabel = getFinancialYearLabel(txDate);
      return fyLabel === previousFyLabel;
    });

    if (previousFyTransactions.length === 0) {
      localStorage.setItem(storageKey, "done");
      return;
    }

    const auditData = buildTransactionAuditData(previousFyTransactions);
    downloadPDF(
      `Full Transaction Audit - FY ${previousFyLabel}`,
      auditData,
      `transactions_fy_${previousFyLabel}_${new Date().toISOString().split("T")[0]}.pdf`
    );
    localStorage.setItem(storageKey, "done");
  }, [isMounted, fundTransactions, students]);

  // ─── Bulk Student Import State ─────────────────────────────────────────────────────
  const [bulkStudentJson, setBulkStudentJson] = useState("");
  const [bulkImportResults, setBulkImportResults] = useState<{success: number, failed: number, errors: string[], skipped: number}>({success: 0, failed: 0, errors: [], skipped: 0});
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Initialize selected students for credit with all students
  useEffect(() => {
    if (students.length > 0) {
      setSelectedStudentsForCredit(students.map(s => s.id));
    }
  }, [students]);

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const clearSelectedStudents = () => {
    setSelectedStudents([]);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handleSelectiveBulkAdd = async () => {
    if (!selectiveAmount || selectedStudents.length === 0) return;
    setLoading(true);
    try {
      const amt = parseFloat(selectiveAmount);
      await Promise.all(selectedStudents.map(async (studentId) => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          await supabase.from('students').update({ balance: (student.balance || 0) + amt }).eq('id', studentId);
          await supabase.from('fund_transactions').insert([{
            student_id: studentId, amount: amt, type: 'distribution',
            description: selectivePurpose || 'Selective Bulk Add'
          }]);
        }
      }));
      setSelectiveAmount(""); setSelectivePurpose(""); refreshData();
      alert(`✅ ₹${amt} added to ${selectedStudents.length} selected students`);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };
  
  // ─── Notification State ───────────────────────────────────────────────────
  const [notifyMsg, setNotifyMsg] = useState("");
  const [selectedFontId, setSelectedFontId] = useState("");
  const [notifyEnd, setNotifyEnd] = useState("");
  
  // ─── Sub-States ────────────────────────────────────────────────────────────
  const [groupName, setGroupName] = useState("");
  const [groupSelected, setGroupSelected] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userType, setUserType] = useState<"student" | "responsible">("student");
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Credential editing state
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState<any>(null);
  const [tempCredentials, setTempCredentials] = useState({ username: "", password: "" });
  
  // Active users management state
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Student | null>(null);
  
  const addTestTransactions = async () => {
    if (students.length === 0) {
      alert('No students found. Add some students first.');
      return;
    }
    
    setLoading(true);
    try {
      // Add test transactions for first 3 students
      const testStudents = students.slice(0, 3);
      
      for (const student of testStudents) {
        // Add deposit transaction
        await supabase.from('fund_transactions').insert([{
          student_id: student.id,
          amount: 500,
          type: 'deposit',
          description: 'Test deposit transaction'
        }]);
        
        // Add withdrawal transaction
        await supabase.from('fund_transactions').insert([{
          student_id: student.id,
          amount: -200,
          type: 'withdrawal', 
          description: 'Test withdrawal transaction'
        }]);
        
        // Update student balance
        await supabase.from('students').update({ 
          balance: (student.balance || 0) + 300 
        }).eq('id', student.id);
      }
      
      await refreshData();
      alert('✅ Test transactions added successfully!');
    } catch (err: any) {
      console.error('Test transaction error:', err);
      alert('Error adding test transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [
        { data: s }, { data: l }, { data: t }, { data: g }, { data: n }, { data: b }, { data: f }
      ] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('school_finances').select('*').order('created_at', { ascending: false }),
        supabase.from('fund_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('student_groups').select('*').order('created_at', { ascending: false }),
        supabase.from('school_notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('books').select('*').order('created_at', { ascending: false }),
        supabase.from('school_fonts').select('*').order('name', { ascending: true }),
      ]);
      setStudents(s || []);
      setActiveUsers(s || []);
      setLedger(l || []);
      setFundTransactions(t || []);
      setGroups(g || []);
      setNotifications(n || []);
      setBooks(b || []);
      setFonts(f || []);
    } catch (err: any) { console.error('Data refresh error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, [activeTab]);

  // Sync URL params with active tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const currentTabParam = params.get('tab');
      
      // If URL param doesn't match current tab, update URL
      if (currentTabParam !== activeTab) {
        const newParams = new URLSearchParams(window.location.search);
        newParams.set('tab', activeTab);
        router.replace(`/admin?${newParams.toString()}`, { scroll: false });
      }
    }
  }, [activeTab, router]);

  // Listen for URL param changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get('tab');
      
      if (tabFromUrl && tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
      }
    }
  }, [searchParams]);

  const financeStats = useMemo(() => {
    const totalIncome = ledger.filter(l => l.amount > 0).reduce((a, l) => a + l.amount, 0);
    const totalExpense = ledger.filter(l => l.amount < 0).reduce((a, l) => a + Math.abs(l.amount), 0);
    const net = totalIncome - totalExpense;
    const studentFundTotal = students.reduce((a, s) => a + (s.balance || 0), 0);
    return { totalIncome, totalExpense, net, studentFundTotal };
  }, [ledger, students]);

  const splitTargetStudents = useMemo(() => {
    if (bulkMode === "all") return students;
    const grp = groups.find(g => g.id === selectedGroupId);
    return grp ? students.filter(s => grp.student_ids.includes(s.id)) : [];
  }, [bulkMode, selectedGroupId, students, groups]);

  const perHead = useMemo(() => {
    const amt = parseFloat(bulkAmount);
    return (!amt || splitTargetStudents.length === 0) ? 0 : amt / splitTargetStudents.length;
  }, [bulkAmount, splitTargetStudents]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleBulkExecute = async () => {
    if (!bulkAmount || splitTargetStudents.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(splitTargetStudents.map(async (s) => {
        const amt = bulkAction === "add" ? perHead : -perHead;
        await supabase.from('students').update({ balance: (s.balance || 0) + amt }).eq('id', s.id);
        await supabase.from('fund_transactions').insert([{
          student_id: s.id, amount: amt, type: bulkAction === "add" ? 'distribution' : 'withdrawal',
          description: bulkPurpose || `Bulk ${bulkAction} Split`
        }]);
      }));
      setBulkAmount(""); setBulkPurpose(""); await refreshData();
      alert("✅ Bulk operation completed");
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleSingleEntry = async () => {
    if (!singleSelected || !singleAmount) return;
    setLoading(true);
    try {
      const amt = singleType === 'add' ? parseFloat(singleAmount) : -parseFloat(singleAmount);
      const { data: current } = await supabase.from('students').select('balance').eq('id', singleSelected.id).single();
      const newBal = (current?.balance || 0) + amt;
      
      await supabase.from('students').update({ balance: newBal }).eq('id', singleSelected.id);
      await supabase.from('fund_transactions').insert([{
        student_id: singleSelected.id, amount: amt, type: singleType === 'add' ? 'deposit' : 'withdrawal',
        description: singlePurpose || "Manual adjustment"
      }]);
      setSingleSelected(null); setSingleAmount(""); setSingleSearch(""); setSinglePurpose(""); await refreshData();
      alert(`✅ ₹${Math.abs(amt)} ${singleType === 'add' ? 'Added to' : 'Deducted from'} Student Account`);
    } catch (err: any) { 
      console.error('Transaction creation error:', err);
      alert(err.message); 
    }
    finally { setLoading(false); }
  };

  const handlePostLedger = async () => {
    if (!ledgerPurpose || !ledgerValue) return;
    const amt = parseFloat(ledgerValue);
    setLoading(true);
    try {
      const actualAmt = ledgerType === 'Income' ? amt : -amt;
      await supabase.from('school_finances').insert([{
        description: ledgerPurpose,
        party_name: ledgerParty,
        amount: actualAmt,
        type: ledgerType.toLowerCase()
      }]);
      setLedgerPurpose(""); setLedgerParty(""); setLedgerValue("");
      refreshData();
      alert(`✅ ${ledgerType} logged: ₹${amt}`);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    try {
      await deleteStudent(id);
      refreshData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteAllStudents = async () => {
    if (!confirm(`⚠️ WARNING: This will permanently delete ALL ${activeUsers.length} students from the system!\n\nThis action cannot be undone. Are you absolutely sure?`)) return;
    
    setLoading(true);
    try {
      // Delete all students from the database
      const { error } = await supabase
        .from('students')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (error) throw error;
      
      // Refresh the data
      refreshData();
      alert(`✅ Successfully deleted all ${activeUsers.length} students from the system.`);
    } catch (err: any) {
      alert(`❌ Error deleting students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    const confirmMessage = `🚨 CRITICAL WARNING 🚨\n\n⚠️ This will PERMANENTLY delete ALL data including:\n• ${activeUsers.length} Students\n• All Fund Transactions\n• All Financial Records\n• All Notifications\n• All Library Data\n• All Book Reservations\n\nTHIS ACTION CANNOT BE UNDONE!\n\nType 'DELETE ALL' in the next prompt to confirm:\n`;
    
    const userConfirm = prompt(confirmMessage);
    if (userConfirm !== 'DELETE ALL') {
      alert('❌ Deletion cancelled. You must type exactly \'DELETE ALL\' to confirm.');
      return;
    }
    
    setLoading(true);
    try {
      // Delete all data from all tables
      const tablesToDelete = [
        'students',
        'fund_transactions',
        'school_finances',
        'school_notifications',
        'library_logs',
        'library_reservations',
        'student_groups',
        'books'
      ];
      
      for (const table of tablesToDelete) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        
        if (error) {
          console.warn(`Warning deleting ${table}:`, error.message);
          // Continue with other tables even if one fails
        }
      }
      
      // Refresh the data
      refreshData();
      alert(`✅ Successfully deleted ALL data from the system!\n\nAll students, transactions, finances, and records have been permanently removed.`);
    } catch (err: any) {
      alert(`❌ Error deleting all data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName || groupSelected.length === 0) return;
    setLoading(true);
    try {
      await supabase.from('student_groups').insert([{
        name: groupName,
        student_ids: groupSelected
      }]);
      setGroupName(""); setGroupSelected([]); setShowGroupModal(false);
      refreshData();
      alert(`✅ Group "${groupName}" ready for bulk payments`);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Delete this group permanently?")) return;
    try {
      await supabase.from('student_groups').delete().eq('id', id);
      refreshData();
    } catch (err: any) { alert(err.message); }
  };

  const toggleGroupStudent = (id: string) => {
    setGroupSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleUpdateRating = async (studentId: string, rating: number) => {
    await supabase.from('students').update({ rating }).eq('id', studentId);
    refreshData();
  };

  const handleToggleResponsible = async (student: Student) => {
    const newState = !student.is_responsible;
    setLoading(true);
    try {
      // Update is_responsible status
      const { error } = await supabase
        .from('students')
        .update({ 
          is_responsible: newState,
          // If revoking access, also update password_change timestamp to invalidate sessions
          last_password_change: !newState ? new Date().toISOString() : null
        })
        .eq('id', student.id);
      
      if (error) throw error;
      
      alert(`✅ ${student.full_name} is now ${newState ? 'a Responsible Staff' : 'a regular Student'}`);
      refreshData();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    try {
      // First, check if user has any active library books
      const { data: activeLoans } = await supabase
        .from('library_logs')
        .select('id')
        .eq('student_id', userToDelete.id)
        .is('return_date', null);
      
      if (activeLoans && activeLoans.length > 0) {
        alert(`⚠️ Cannot delete! ${userToDelete.full_name} has ${activeLoans.length} book(s) not yet returned. Please collect all books first.`);
        setLoading(false);
        return;
      }
      
      // Delete the user from database
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', userToDelete.id);
      
      if (error) throw error;
      
      // Refresh data to remove deleted user from interface
      await refreshData();
      
      alert(`✅ ${userToDelete.full_name} has been permanently deleted from the system.`);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err: any) {
      alert(`❌ Error deleting user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStudentCredit = async () => {
    if (!bulkCreditAmount || selectedStudentsForCredit.length === 0) return;
    setLoading(true);
    try {
      const amt = parseFloat(bulkCreditAmount);
      await Promise.all(selectedStudentsForCredit.map(async (studentId) => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          await supabase.from('students').update({ balance: (student.balance || 0) + amt }).eq('id', studentId);
          await supabase.from('fund_transactions').insert([{
            student_id: studentId, amount: amt, type: 'distribution',
            description: bulkCreditPurpose || 'Bulk Student Credit'
          }]);
        }
      }));
      setBulkCreditAmount(""); setBulkCreditPurpose(""); setBulkCreditSearch(""); refreshData();
      alert(`✅ ₹${amt} credited to ${selectedStudentsForCredit.length} selected students`);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const toggleStudentCreditSelection = (studentId: string) => {
    setSelectedStudentsForCredit(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const renderGroupCreationModal = () => (
    <AnimatePresence>
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[300] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Create New Group</h3>
               <button onClick={() => setShowGroupModal(false)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><X/></button>
            </div>
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Enterprise Group Name</label>
                  <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" placeholder="e.g. Science Class-A" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Synchronize Personnel ({groupSelected.length} Selected)</label>
                  <div className="bg-black/60 border border-white/5 rounded-3xl p-4 max-h-64 overflow-y-auto pr-2 custom-scroll space-y-2">
                     {students.map(s => (
                        <button key={s.id} onClick={() => toggleGroupStudent(s.id)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${groupSelected.includes(s.id) ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/5 hover:bg-white/5'}`}>
                           <div className="text-left font-bold text-sm text-white">{s.full_name} <span className="text-[10px] text-gray-600 ml-2">ID: {s.roll_id}</span></div>
                           {groupSelected.includes(s.id) ? <CheckSquare className="w-4 h-4 text-blue-400"/> : <Square className="w-4 h-4 text-gray-800"/>}
                        </button>
                     ))}
                  </div>
               </div>
               <button onClick={handleSaveGroup} disabled={loading} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-blue-900/40 transition-all">Submit Group Registry</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const handleSendNotification = async (studentId?: string, overrideMsg?: string, overrideFont?: string) => {
    const msg = overrideMsg || notifyMsg;
    const fontId = overrideFont || selectedFontId;
    if (!msg) return;
    try {
      await supabase.from('school_notifications').insert([{
        message: msg, font_id: fontId || null,
        end_at: notifyEnd || null, student_id: studentId || null
      }]);
      setNotifyMsg(""); setSelectedFontId(""); setNotifyEnd("");
      refreshData();
      alert("✅ Notification Broadcasted");
    } catch (err: any) { alert(err.message); }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = prompt("Enter unique font name:");
    if (!name) return;
    const reader = new FileReader();
    reader.onload = async (readerEvt) => {
      const b64 = readerEvt.target?.result;
      if (typeof b64 === 'string') {
        try {
          await supabase.from('school_fonts').insert([{ name, font_data: b64 }]);
          alert("✅ Font saved to library"); refreshData();
        } catch (err: any) { alert("Error: Use a unique name."); }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteNotify = async (id: string) => {
    await supabase.from('school_notifications').delete().eq('id', id);
    refreshData();
  };

  const handleCreateUser = async () => {
    setLoading(true);
    try {
      if (userType === "student") {
        // Create student user
        const newStudent = {
          full_name: editingUser?.full_name || "",
          roll_id: editingUser?.roll_id || `STU-${Date.now()}`,
          grade: editingUser?.grade || "",
          balance: 0,
          email_account: editingUser?.email_account || "",
          email_library: editingUser?.email_library || "",
          password: editingUser?.password || "password123",
          username: editingUser?.username || editingUser?.full_name?.toLowerCase().split(" ")[0] || `user${Math.floor(Math.random()*1000)}`,
          is_responsible: editingUser?.is_responsible || false
        };
        
        if (editingUser?.id) {
          await supabase.from('students').update(newStudent).eq('id', editingUser.id);
        } else {
          await supabase.from('students').insert([newStudent]);
        }
      } else {
        // For responsible users, we'd need a responsible_users table
        alert("ℹ️ Responsible user creation requires database schema update. Currently only student creation is supported.");
      }
      
      setShowUserModal(false);
      setEditingUser(null);
      refreshData();
      alert(`✅ ${userType === 'student' ? 'Student' : 'Responsible'} account created successfully`);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCredentialEdit = (student: Student) => {
    setEditingCredentials(student);
    setTempCredentials({ username: student.username || "", password: student.password || "" });
    setShowCredentialModal(true);
  };

  const handleUpdateCredentials = async () => {
    if (!editingCredentials) return;
    setLoading(true);
    try {
      // Update credentials in database
      const { error } = await supabase.from('students').update({
        username: tempCredentials.username,
        password: tempCredentials.password
      }).eq('id', editingCredentials.id);
      
      if (error) throw error;
      
      // If this is a responsible user being updated, we need to ensure their session is invalidated
      // by checking if they're currently logged in
      if (editingCredentials.is_responsible) {
        // Force logout any active session with old credentials
        // This is done by updating a timestamp that the login check can verify
        await supabase.from('students').update({
          last_password_change: new Date().toISOString()
        }).eq('id', editingCredentials.id);
      }
      
      setShowCredentialModal(false);
      setEditingCredentials(null);
      refreshData();
      alert('✅ Username and password updated successfully! Old login details will not work anymore.');
    } catch (err: any) {
      alert(`❌ Error updating credentials: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAdminPassword = async () => {
    if (!adminProfile.currentPassword || (!adminProfile.newPassword && !adminProfile.newUsername)) {
      alert('⚠️ Please fill in at least new username or new password');
      return;
    }
    
    if (adminProfile.newPassword && adminProfile.newPassword !== adminProfile.confirmPassword) {
      alert('❌ New passwords do not match!');
      return;
    }
    
    if (adminProfile.newPassword && adminProfile.newPassword.length < 4) {
      alert('⚠️ Password must be at least 4 characters');
      return;
    }
    
    setLoading(true);
    try {
      // Get current admin from session/localStorage
      const adminData = JSON.parse(localStorage.getItem('admin_session') || '{}');
      
      // Verify current password
      if (adminData.password && adminData.password !== adminProfile.currentPassword) {
        alert('❌ Current password is incorrect!');
        setLoading(false);
        return;
      }
      
      // Update credentials
      const updatedAdmin = { ...adminData };
      const changes = [];
      
      if (adminProfile.newUsername) {
        updatedAdmin.username = adminProfile.newUsername;
        changes.push('username');
      }
      
      if (adminProfile.newPassword) {
        updatedAdmin.password = adminProfile.newPassword;
        changes.push('password');
      }
      
      localStorage.setItem('admin_session', JSON.stringify(updatedAdmin));
      
      // In production, you would call:
      // await supabase.from('admins').update({ 
      //   username: adminProfile.newUsername,
      //   password: adminProfile.newPassword 
      // }).eq('id', adminData.id);
      
      setAdminProfile({ currentPassword: "", newPassword: "", confirmPassword: "", newUsername: "" });
      setShowProfileSettings(false);
      alert(`✅ ${changes.join(' and ')} changed successfully!`);
    } catch (err: any) {
      alert(`❌ Error updating credentials: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { data } = await supabase.from('library_logs').select('*, students(full_name, roll_id, grade), books(title, book_id, rate)').order('borrow_date', { ascending: false });
      
      // Create a simple printable HTML
      const htmlContent = `
        <html>
          <head><title>Library Data Export</title></head>
          <body>
            <h1>Library Transaction Log</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <table border="1" style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f0f0f0;">
                  <th style="padding:8px;">Student Name</th>
                  <th style="padding:8px;">Roll ID</th>
                  <th style="padding:8px;">Grade</th>
                  <th style="padding:8px;">Book Title</th>
                  <th style="padding:8px;">Book ID</th>
                  <th style="padding:8px;">Borrow Date</th>
                  <th style="padding:8px;">Due Date</th>
                  <th style="padding:8px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${(data || []).map(log => `
                  <tr>
                    <td style="padding:8px;">${log.students?.full_name || ''}</td>
                    <td style="padding:8px;">${log.students?.roll_id || ''}</td>
                    <td style="padding:8px;">${log.students?.grade || ''}</td>
                    <td style="padding:8px;">${log.books?.title || ''}</td>
                    <td style="padding:8px;">${log.books?.book_id || ''}</td>
                    <td style="padding:8px;">${new Date(log.borrow_date).toLocaleDateString()}</td>
                    <td style="padding:8px;">${log.due_date ? new Date(log.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td style="padding:8px;">${log.return_date ? 'Returned' : 'Active'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `library_data_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      
      alert("📄 PDF export generated (print to PDF dialog will open)");
      // Trigger print dialog for actual PDF
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(htmlContent);
      printWindow?.document.close();
      printWindow?.print();
    } catch (err: any) {
      alert(`❌ PDF export failed: ${err.message}`);
    }
  };

  // ─── UI Components ─────────────────────────────────────────────────────────
  const StarRating = ({ value, onChange, size = "md" }: any) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} onClick={(e) => { e.stopPropagation(); onChange(s); }} className={`transition-all hover:scale-110 ${s <= Math.round(value) ? 'text-amber-400' : 'text-gray-700'}`}>
          <TrendingUp className={`${size === "sm" ? "w-3 h-3" : "w-5 h-5"} fill-current`} />
        </button>
      ))}
    </div>
  );

  const renderUserManagementModal = () => (
    <AnimatePresence>
      {showUserModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[300] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f172a] border border-white/10 w-full max-w-2xl max-h-[95vh] rounded-[3rem] overflow-hidden flex flex-col p-8">
            <div className="flex justify-between items-center mb-8 shrink-0">
               <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Create New Account</h3>
               <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><X/></button>
            </div>
            
            {/* User Type - Only Student Account */}
            <div className="mb-8">
              <button 
                onClick={() => { setUserType("student"); setEditingUser({...editingUser, is_responsible: false}); }}
                className="w-full p-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-blue-600 text-white shadow-xl"
              >
                Student Account
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-4 custom-scroll pb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Full Name</label>
                <input 
                  value={editingUser?.full_name || ""} 
                  onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" 
                  placeholder="Enter full name" 
                />
              </div>
              
              <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Roll ID (Auto-generated if empty)</label>
                    <input 
                      value={editingUser?.roll_id || ""} 
                      onChange={(e) => setEditingUser({...editingUser, roll_id: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" 
                      placeholder="STU-XXXX" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Grade/Class</label>
                    <input 
                      value={editingUser?.grade || ""} 
                      onChange={(e) => setEditingUser({...editingUser, grade: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" 
                      placeholder="e.g. Class-A" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Email (Optional)</label>
                    <input 
                      type="email"
                      value={editingUser?.email_account || ""} 
                      onChange={(e) => setEditingUser({...editingUser, email_account: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" 
                      placeholder="student@school.com" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">System Account Handle (Username)</label>
                    <input 
                      value={editingUser?.username || ""} 
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" 
                      placeholder="e.g. john" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">System Security Key (Password)</label>
                    <input 
                      type="text"
                      value={editingUser?.password || ""} 
                      onChange={(e) => setEditingUser({...editingUser, password: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none" 
                      placeholder="e.g. password123" 
                    />
                  </div>
              <button 
                onClick={handleCreateUser} 
                disabled={loading || !editingUser?.full_name}
                className="w-full py-6 bg-amber-600 hover:bg-amber-500 rounded-3xl font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-amber-900/40 transition-all flex items-center justify-center space-x-4"
              >
                <ShieldCheck className="w-6 h-6"/>
                <span>{loading ? 'CREATING...' : 'CREATE ACCOUNT'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderStudentProfileModal = () => {
    if (!viewingStudent) return null;
    
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[200] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
             <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center font-black text-2xl">{viewingStudent.full_name[0]}</div>
                <div><h2 className="text-2xl font-black">{viewingStudent.full_name}</h2><div className="flex items-center space-x-3 mt-1"><StarRating value={viewingStudent.rating || 5} onChange={(v: number) => handleUpdateRating(viewingStudent.id, v)} /><span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ID: {viewingStudent.roll_id}</span></div></div>
             </div>
             <button onClick={() => setViewingStudent(null)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><X /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                   <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-4">Account Overview</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border ${viewingStudent.balance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Balance</p>
                        <p className={`text-2xl font-black ${viewingStudent.balance >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          ₹{viewingStudent.balance.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20"><p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Class</p><p className="text-xl font-black text-white">{viewingStudent.grade}</p></div>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mt-4">
                     <button onClick={() => handleOpenCredentialEdit(viewingStudent)} className="py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl border border-indigo-500/20 font-black uppercase text-[9px] tracking-widest text-white shadow-xl transition-all flex items-center justify-center space-x-2"><Settings className="w-4 h-4"/> <span>Change Username/Password</span></button>
                     <button onClick={() => { setShowUserModal(true); setUserType("student"); setEditingUser(viewingStudent); setViewingStudent(null); }} className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 font-black uppercase text-[10px] tracking-widest text-indigo-400 shadow-xl transition-all flex items-center justify-center space-x-3"><Settings className="w-4 h-4"/> <span>Edit Profile</span></button>
                   </div>
                </div>

             </div>
             <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest">Personal Ledger & Logs</h4>
                   <button onClick={() => handleDownloadStudentLedger(viewingStudent)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[8px] font-black uppercase tracking-widest text-white transition-all flex items-center">
                      <Download className="w-3 h-3 mr-2"/> Download History (PDF)
                   </button>
                </div>
                <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                   {notifications.filter(n => n.student_id === viewingStudent.id).map((n, idx) => (
                      <div key={`n-${idx}`} className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-2xl flex justify-between items-start group">
                         <div className="space-y-1"><p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Sent Message</p><p className="text-xs font-bold text-white leading-snug">{n.message}</p></div>
                         <button onClick={() => handleDeleteNotify(n.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3"/></button>
                      </div>
                   ))}
                   <div className="h-px bg-white/5 my-2" />
                   {ledger.filter(l => l.student_id === viewingStudent.id).map((t, idx) => (
                      <div key={`tx-${idx}`} className="p-4 bg-black/20 rounded-2xl border border-white/5 flex justify-between items-center"><div className="space-y-1"><p className="text-[10px] font-black text-white uppercase tracking-tight">{t.description || 'Adjustment'}</p><p className="text-[8px] text-gray-700 font-bold">{new Date(t.created_at).toLocaleDateString()}</p></div><p className={`font-black ${t.amount > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>₹{t.amount.toLocaleString()}</p></div>
                   ))}
                   {ledger.filter(l => l.student_id === viewingStudent.id).length === 0 && <p className="text-center py-12 text-gray-700 font-black uppercase text-[10px]">No history found</p>}
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderCredentialEditModal = () => {
    if (!showCredentialModal || !editingCredentials) return null;
    
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[300] flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col p-8">
          <div className="flex justify-between items-center mb-8 shrink-0">
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Security Credentials</h3>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">Editing: {editingCredentials.full_name} ({editingCredentials.roll_id})</p>
            </div>
            <button onClick={() => { setShowCredentialModal(false); setEditingCredentials(null); }} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><X/></button>
          </div>
          
          <div className="space-y-6 pb-6">
            <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 p-6 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
              <ShieldCheck className="w-12 h-12 text-indigo-500 mb-4" />
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Administrative Access</p>
              <p className="text-sm font-bold text-white/80">You are about to modify this user's authentication credentials. These changes will take effect immediately.</p>
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">System Account Handle (Username)</label>
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  value={tempCredentials.username} 
                  onChange={(e) => setTempCredentials({...tempCredentials, username: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 p-5 pl-16 rounded-2xl text-white font-bold outline-none focus:ring-4 ring-indigo-500/10" 
                  placeholder="Enter username" 
                />
              </div>
              <p className="text-[8px] text-gray-600 font-bold mt-2 ml-2">This is the login username for the system</p>
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">System Security Key (Password)</label>
              <div className="relative">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="text"
                  value={tempCredentials.password} 
                  onChange={(e) => setTempCredentials({...tempCredentials, password: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 p-5 pl-16 rounded-2xl text-white font-bold outline-none focus:ring-4 ring-indigo-500/10" 
                  placeholder="Enter password" 
                />
              </div>
              <p className="text-[8px] text-gray-600 font-bold mt-2 ml-2">Minimum 4 characters recommended</p>
            </div>
            
            <div className="flex items-center space-x-4 bg-amber-500/10 p-5 rounded-3xl border border-amber-500/20 mt-4">
               <div className="bg-amber-500/20 p-3 rounded-xl">
                  <Activity className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                 <label className="text-xs font-black text-amber-500 uppercase tracking-widest">Security Notice</label>
                 <p className="text-[9px] font-bold text-amber-500/80 uppercase mt-1">Changes are logged and will be audited</p>
               </div>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button 
                onClick={() => { setShowCredentialModal(false); setEditingCredentials(null); }} 
                className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-[0.2em] text-gray-500 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateCredentials} 
                disabled={loading || !tempCredentials.username || !tempCredentials.password}
                className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-900/40 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <Save className="w-5 h-5"/>
                <span>{loading ? 'UPDATING...' : 'UPDATE CREDENTIALS'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderAdminProfileSettingsModal = () => {
    if (!showProfileSettings) return null;
    
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[300] flex items-center justify-center p-4 md:p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f172a] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col p-8 md:p-12">
          <div className="flex justify-between items-center mb-8 shrink-0">
            <div>
              <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Change Admin Settings</h3>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">Change your username or password</p>
            </div>
            <button onClick={() => { setShowProfileSettings(false); setAdminProfile({ currentPassword: "", newPassword: "", confirmPassword: "", newUsername: "" }); }} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><X/></button>
          </div>
          
          <div className="space-y-6 pb-6 overflow-y-auto custom-scroll pr-4">
            {/* Security Header */}
            <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
              <ShieldCheck className="w-12 h-12 text-purple-500 mb-4" />
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Admin Account Settings</p>
              <p className="text-sm font-bold text-white/80">Change your username or password here. You can change one or both. We keep a record of all changes for safety.</p>
            </div>
            
            {/* New Username */}
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">New Username</label>
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="text"
                  value={adminProfile.newUsername} 
                  onChange={(e) => setAdminProfile({...adminProfile, newUsername: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 p-5 pl-16 rounded-2xl text-white font-bold outline-none focus:ring-4 ring-purple-500/10" 
                  placeholder="Type your new username here" 
                />
              </div>
              <p className="text-[8px] text-gray-600 font-bold mt-2 ml-2">Leave empty if you don't want to change username</p>
            </div>
            
            {/* Current Password */}
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">Your Current Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="text"
                  value={adminProfile.currentPassword} 
                  onChange={(e) => setAdminProfile({...adminProfile, currentPassword: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 p-5 pl-16 rounded-2xl text-white font-bold outline-none focus:ring-4 ring-purple-500/10" 
                  placeholder="Type your old password" 
                />
              </div>
              <p className="text-[8px] text-gray-600 font-bold mt-2 ml-2">We need this to check it's really you</p>
            </div>
            
            {/* New Password */}
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">New Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="text"
                  value={adminProfile.newPassword} 
                  onChange={(e) => setAdminProfile({...adminProfile, newPassword: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 p-5 pl-16 rounded-2xl text-white font-bold outline-none focus:ring-4 ring-purple-500/10" 
                  placeholder="Type your new password" 
                />
              </div>
              <p className="text-[8px] text-gray-600 font-bold mt-2 ml-2">Use at least 4 letters or numbers. Leave empty if you don't want to change password</p>
            </div>
            
            {/* Confirm Password */}
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">Type New Password Again</label>
              <div className="relative">
                <CheckCircle2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="text"
                  value={adminProfile.confirmPassword} 
                  onChange={(e) => setAdminProfile({...adminProfile, confirmPassword: e.target.value})} 
                  className={`w-full bg-black/40 border ${adminProfile.confirmPassword && adminProfile.newPassword !== adminProfile.confirmPassword ? 'border-rose-500/50' : 'border-white/10'} p-5 pl-16 rounded-2xl text-white font-bold outline-none focus:ring-4 ring-purple-500/10`} 
                  placeholder="Type the same password again" 
                />
              </div>
              {adminProfile.confirmPassword && adminProfile.newPassword !== adminProfile.confirmPassword && (
                <p className="text-[8px] text-rose-500 font-bold mt-2 ml-2">⚠️ These don't match</p>
              )}
            </div>
            
            {/* Info Card */}
            <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl mt-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500/20 p-3 rounded-xl shrink-0">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Easy Steps</label>
                  <p className="text-[9px] font-bold text-blue-500/80 mt-1 leading-relaxed">
                    • Want to change only username? Fill in current password and new username only<br/>
                    • Want to change only password? Fill in current password, new password, and type it again<br/>
                    • Want to change both? Fill everything in<br/>• Always remember your current password!
                  </p>
                </div>
              </div>
            </div>
            
            {/* Security Notice */}
            <div className="flex items-center space-x-4 bg-amber-500/10 p-5 rounded-3xl border border-amber-500/20 mt-4">
               <div className="bg-amber-500/20 p-3 rounded-xl">
                  <Activity className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                 <label className="text-xs font-black text-amber-500 uppercase tracking-widest">Important</label>
                 <p className="text-[9px] font-bold text-amber-500/80 uppercase mt-1">All changes are saved in our records for safety</p>
               </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button 
                onClick={() => { setShowProfileSettings(false); setAdminProfile({ currentPassword: "", newPassword: "", confirmPassword: "", newUsername: "" }); }} 
                className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-[0.2em] text-gray-500 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleChangeAdminPassword} 
                disabled={loading || !adminProfile.currentPassword || (!adminProfile.newUsername && !adminProfile.newPassword)}
                className="flex-1 py-5 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-purple-900/40 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <Save className="w-5 h-5"/>
                <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderContent = () => {
    console.log('renderContent called, activeTab:', activeTab);
    switch (activeTab) {
      case "funds": return renderFundsTab();
      case "finances": return renderFinancesTab();
      case "students": return renderStudentsTab();
      case "transactions": return renderTransactionsTab();
      case "broadcast": return renderNotificationsTab();
      case "active-users": return renderActiveUsersTab();
      default: 
        console.log('Default case hit, rendering funds');
        return renderFundsTab();
    }
  };

  const renderFundsTab = () => (
    <div className="space-y-8 pb-12">
      <div className="bg-indigo-900/20 border border-indigo-500/10 p-8 rounded-[3rem] backdrop-blur-xl grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-4">
            <h3 className="text-xl font-black flex items-center text-white"><Calculator className="w-6 h-6 mr-3 text-indigo-400" />Bulk Auto Split</h3>
            <input value={bulkPurpose} onChange={(e) => setBulkPurpose(e.target.value)} className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-bold outline-none" placeholder="Purpose (e.g. Activity Fee)" />
            <div className="relative">
               <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
               <input type="number" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} className="w-full pl-10 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-black text-lg outline-none" placeholder="Total Amount" />
            </div>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => setBulkAction("add")} className={`py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${bulkAction === "add" ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-600'}`}>Add Money (+)</button>
               <button onClick={() => setBulkAction("sub")} className={`py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${bulkAction === "sub" ? 'bg-rose-600 text-white shadow-lg' : 'bg-white/5 text-gray-600'}`}>Subtract Money (-)</button>
            </div>
            <div className="space-y-4">
               <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Protocol Target Strategy</label>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setBulkMode("all")} className={`py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${bulkMode === "all" ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-gray-700'}`}>Full Sync (All)</button>
                  <button onClick={() => setBulkMode("group")} className={`py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${bulkMode === "group" ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-gray-700'}`}>Group Specific</button>
               </div>
               {bulkMode === "group" && (
                  <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-black text-white outline-none appearance-none cursor-pointer">
                     <option value="">-- Choose Target Group --</option>
                     {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.student_ids.length} Personnel)</option>
                     ))}
                  </select>
               )}
            </div>
            <button onClick={handleBulkExecute} disabled={loading || !bulkAmount || (bulkMode === 'group' && !selectedGroupId)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-indigo-900/30 hover:bg-indigo-500 transition-all disabled:opacity-50">Execute Digital Split (₹{perHead.toFixed(2)} / Student)</button>
         </div>
         <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col">
            <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-4">Single Entry Audit</h4>
            <div className="flex-1 space-y-4">
               {singleSelected ? (
                  <div className="p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-3xl relative">
                     <button onClick={() => { setSingleSelected(null); setSingleSearch(""); }} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
                     <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Target Account</p>
                     <h5 className="text-xl font-black text-white uppercase">{singleSelected.full_name}</h5>
                     <div className="flex items-center space-x-3 mt-2">
                        <span className="text-[10px] font-bold text-gray-500">ID: {singleSelected.roll_id}</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${singleSelected.balance >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                          Balance: ₹{singleSelected.balance.toLocaleString()}
                        </span>
                     </div>
                     <div className="mt-6 space-y-3">
                        <input value={singlePurpose} onChange={(e) => setSinglePurpose(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-white" placeholder="Specific Reason..." />
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                           <input type="number" value={singleAmount} onChange={(e) => setSingleAmount(e.target.value)} className="flex-1 min-w-[200px] bg-black/40 border border-white/10 p-4 rounded-xl text-lg font-black text-white" placeholder="₹ Amount" />
                           <div className="grid grid-cols-2 gap-2 w-24 flex-none">
                              <button onClick={() => setSingleType("add")} className={`w-full px-2 py-3 rounded-xl font-black text-[10px] uppercase ${singleType === 'add' ? 'bg-emerald-600' : 'bg-white/5 text-gray-600'}`}>Add</button>
                              <button onClick={() => setSingleType("sub")} className={`w-full px-2 py-3 rounded-xl font-black text-[10px] uppercase ${singleType === 'sub' ? 'bg-rose-600' : 'bg-white/5 text-gray-600'}`}>Sub</button>
                           </div>
                        </div>
                        <button onClick={handleSingleEntry} disabled={loading || !singleAmount} className="w-full py-4 bg-emerald-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 transition-all font-black text-white">Commit Transaction</button>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-4">
                     <input value={singleSearch} onChange={(e) => setSingleSearch(e.target.value)} className="w-full px-5 py-4 bg-black/60 border border-white/10 rounded-2xl text-white font-bold outline-none" placeholder="Start typing student name or roll..." />
                     <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scroll">
                        {students.filter(s => s.full_name.toLowerCase().includes(singleSearch.toLowerCase()) || s.roll_id.toLowerCase().includes(singleSearch.toLowerCase())).slice(0, 10).map(s => (
                           <button key={s.id} onClick={() => setSingleSelected(s)} className="w-full p-4 rounded-xl border border-white/5 bg-white/5 flex justify-between items-center hover:bg-white/10 transition-colors">
                              <div className="text-left"><p className="font-bold text-sm text-white">{s.full_name}</p><p className="text-[10px] text-gray-600 font-bold uppercase">ROLL: {s.roll_id}</p></div>
                              <span className={`text-xs font-black ${s.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                ₹{s.balance.toLocaleString()}
                              </span>
                           </button>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
         {/* GROUP MANAGER SECTION */}
         <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Active Personnel Groups</h4>
               <button onClick={() => setShowGroupModal(true)} className="p-2 bg-blue-600 rounded-lg shadow-lg hover:scale-110 transition-all"><Plus className="w-4 h-4"/></button>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scroll">
               {groups.map(g => (
                  <div key={g.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group/item">
                     <div>
                        <p className="font-black text-sm text-white uppercase italic tracking-tighter">{g.name}</p>
                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{g.student_ids.length} Registered Members</p>
                     </div>
                     <button onClick={() => handleDeleteGroup(g.id)} className="text-gray-700 opacity-0 group-hover/item:opacity-100 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4"/></button>
                  </div>
               ))}
               {groups.length === 0 && <p className="text-center py-12 text-gray-700 font-black uppercase text-[10px] italic">No personnel groups archived</p>}
            </div>
         </div>
      </div>

      {/* Selective Bulk Add Section */}
      <div className="bg-emerald-900/20 border border-emerald-500/10 p-8 rounded-[3rem] backdrop-blur-xl">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-xl font-black flex items-center text-white"><CheckSquare className="w-6 h-6 mr-3 text-emerald-400" />Selective Bulk Add</h3>
            <div className="flex flex-wrap items-center gap-3">
               <div className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                  {selectedStudents.length} of {students.length} Selected
               </div>
               <button onClick={selectAllStudents} disabled={!selectiveAmount} className="px-4 py-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all disabled:cursor-not-allowed disabled:opacity-50">
                  Select All
               </button>
               <button onClick={clearSelectedStudents} disabled={!selectiveAmount} className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:cursor-not-allowed disabled:opacity-50">
                  Clear Selection
               </button>
            </div>
         </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
               <input value={selectivePurpose} onChange={(e) => setSelectivePurpose(e.target.value)} className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-bold outline-none" placeholder="Reason (optional)" />
               <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input type="number" value={selectiveAmount} onChange={(e) => setSelectiveAmount(e.target.value)} className="w-full pl-10 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-black text-lg outline-none" placeholder="Amount per student (required)" />
               </div>
               <button onClick={handleSelectiveBulkAdd} disabled={loading || !selectiveAmount || selectedStudents.length === 0} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-900/30 hover:bg-emerald-500 transition-all disabled:opacity-50">
                  Add to Selected Students (₹{selectiveAmount || 0} × {selectedStudents.length})
               </button>
            </div>
            {selectiveAmount ? (
            <div className="lg:col-span-2">
               <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-4">Select Students (Uncheck to Exclude)</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2 custom-scroll">
                  {students.map(s => (
                     <label key={s.id} className="flex items-center space-x-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
                        <input
                           type="checkbox"
                           checked={selectedStudents.includes(s.id)}
                           onChange={() => toggleStudentSelection(s.id)}
                           className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                        />
                        <div className="min-w-0 flex-1">
                           <p className="text-sm font-black text-white truncate">{s.full_name}</p>
                           <p className="text-[9px] text-gray-500 uppercase tracking-widest">ID: {s.roll_id}</p>
                        </div>
                     </label>
                  ))}
               </div>
            </div>
            ) : (
            <div className="lg:col-span-2 flex items-center justify-center bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center text-sm text-gray-300 uppercase tracking-widest">
               Enter the total amount first to display student names. Reason is optional.
            </div>
            )}
         </div>
      </div>
    </div>
  );

  const renderFinancesTab = () => (
    <div className="space-y-8">
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[{l: "Direct Income", v: financeStats.totalIncome, c: "emerald"}, {l: "Direct Expense", v: financeStats.totalExpense, c: "rose"}, {l: "Net Vault", v: financeStats.net, c: "blue"}, {l: "Student Liability", v: financeStats.studentFundTotal, c: "indigo"}].map((x, i) => (
             <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden backdrop-blur-xl">
                <div className={`absolute top-0 right-0 w-16 h-16 bg-${x.c}-500/5 rounded-full -mr-8 -mt-8`} />
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest relative z-10">{x.l}</p>
                <h4 className={`text-2xl font-black mt-1 text-${x.c}-400 relative z-10 font-black`}>₹{Math.abs(x.v).toLocaleString()}</h4>
             </div>
          ))}
       </div>

       <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
                <h4 className="text-xl font-black flex items-center text-white"><Download className="w-6 h-6 mr-3 text-emerald-400"/>Download Financial Records</h4>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Export ledger data to PDF format</p>
             </div>
             <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => handleDownloadFinances("month")} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center">
                   <Calendar className="w-3 h-3 mr-2 text-emerald-400"/> This Month
                </button>
                <button onClick={() => handleDownloadFinances("year")} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center">
                   <Calendar className="w-3 h-3 mr-2 text-emerald-400"/> This Year
                </button>
                <button onClick={() => handleDownloadFinances("all")} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center shadow-lg shadow-emerald-900/20">
                   <Download className="w-3 h-3 mr-2"/> Total History
                </button>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
             <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block">Custom Start Date</label>
                <input type="date" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-black text-white outline-none" />
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block">Custom End Date</label>
                <input type="date" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-black text-white outline-none" />
             </div>
             <div className="flex items-end">
                <button 
                  onClick={() => handleDownloadFinances("custom")} 
                  disabled={!financeStartDate || !financeEndDate}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center"
                >
                   <Download className="w-3 h-3 mr-2"/> Download Custom Range
                </button>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6 lg:sticky lg:top-8">
             <h4 className="text-xl font-black flex items-center font-black"><Banknote className="w-6 h-6 mr-3 text-blue-400"/>Vault Management</h4>
             <div className="space-y-4">
                <div><label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Entry Description</label><input value={ledgerPurpose} onChange={(e) => setLedgerPurpose(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white outline-none" placeholder="e.g. Monthly Electricity" /></div>
                <div><label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Party Name (Shop/Rep)</label><input value={ledgerParty} onChange={(e) => setLedgerParty(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white outline-none" placeholder="e.g. KESC" /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Type</label><select value={ledgerType} onChange={(e) => setLedgerType(e.target.value as any)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs font-black text-white outline-none appearance-none"><option value="Income">Income (+)</option><option value="Expense">Expense (-)</option></select></div>
                   <div className="space-y-2"><label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Amount</label><input type="number" value={ledgerValue} onChange={(e) => setLedgerValue(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs font-black text-white outline-none" placeholder="₹" /></div>
                </div>
                <button onClick={handlePostLedger} disabled={loading} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-blue-900/20 transition-all">{loading ? 'Posting...' : 'Commit to Ledger'}</button>
             </div>
          </div>
          <div className="lg:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col h-[600px]">
             <h4 className="font-black text-xl mb-6 font-black uppercase text-xl">System Ledger Audit</h4>
             <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scroll">
                {ledger.map((log, i) => (
                   <div key={i} className="flex justify-between items-center p-5 bg-black/40 rounded-3xl border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all">
                      <div className="space-y-1">
                         <div className="flex items-center space-x-2"><span className="font-black text-sm text-white uppercase tracking-tight">{log.description}</span><span className={`px-2 py-px rounded-md text-[8px] font-black uppercase ${log.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>{log.amount > 0 ? 'Income' : 'Expense'}</span></div>
                         <p className="text-[9px] text-gray-600 font-bold italic flex items-center"><Users className="w-3 h-3 mr-1 text-gray-800"/> {log.party_name || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                         <p className={`font-black text-lg ${log.amount > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{log.amount > 0 ? '+' : ''}₹{Math.abs(log.amount).toLocaleString()}</p>
                         <p className="text-[8px] text-gray-700 font-bold uppercase">{new Date(log.created_at).toLocaleDateString()}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );

  const handleDownloadTransactions = () => {
    const data = buildTransactionAuditData(searchedTransactions);
    downloadPDF("Full Transaction Audit", data, `transactions_full_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderTransactionsTab = () => {
    const totalCredits = searchedTransactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalDebits = searchedTransactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const netFlow = totalCredits - totalDebits;
    const studentsWithActivity = students.filter((student) =>
      searchedTransactions.some((tx) => tx.student_id === student.id)
    ).length;
    const sortedTransactions = [...searchedTransactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recentTransactions = sortedTransactions.slice(0, 10);
    const mostActiveStudents = students
      .map((student) => {
        const studentTx = sortedTransactions.filter((tx) => tx.student_id === student.id);
        const balance = studentTx.reduce((sum, tx) => sum + tx.amount, 0);
        return { student, count: studentTx.length, balance };
      })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-rose-600/15 via-indigo-600/10 to-blue-600/15 border border-white/10 p-5 rounded-[1.5rem] backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center">
                <Activity className="w-5 h-5 mr-2 text-rose-400" />
                Transactions / History
              </h3>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-2">
                {viewingStudent
                  ? `Viewing ledger for ${viewingStudent.full_name}`
                  : "Centralized transaction intelligence across all students"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownloadTransactions}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white uppercase font-black tracking-[0.18em] text-[9px] transition-all flex items-center"
              >
                <Download className="w-3 h-3 mr-2" />
                Download PDF
              </button>
              {viewingStudent && (
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white uppercase font-black tracking-[0.18em] text-[9px] transition-all"
                >
                  Show All History
                </button>
              )}
              {!viewingStudent && fundTransactions.length === 0 && (
                <button
                  onClick={addTestTransactions}
                  disabled={loading}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white uppercase font-black tracking-[0.18em] text-[9px] transition-all disabled:opacity-50"
                >
                  Add Test Transactions
                </button>
              )}
            </div>
          </div>
        </div>

        {!viewingStudent && (
          <div className="bg-white/5 border border-white/10 p-4 rounded-[1.25rem] backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Search Transactions</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                  <input
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-bold outline-none placeholder-gray-500"
                    placeholder="Search student, roll ID, description, amount, or type..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-[210px]">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
                  <p className="text-[8px] uppercase tracking-widest text-blue-400 font-black">Results</p>
                  <p className="text-sm font-black text-blue-300">{searchedTransactions.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                  <p className="text-[8px] uppercase tracking-widest text-gray-400 font-black">Students</p>
                  <p className="text-sm font-black text-white">{studentsWithActivity}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Entries</p>
            <p className="text-lg font-black text-white mt-1">{searchedTransactions.length}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[8px] uppercase tracking-widest text-emerald-400 font-black">Credits</p>
            <p className="text-lg font-black text-emerald-300 mt-1">₹{totalCredits.toLocaleString()}</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            <p className="text-[8px] uppercase tracking-widest text-rose-400 font-black">Debits</p>
            <p className="text-lg font-black text-rose-300 mt-1">₹{totalDebits.toLocaleString()}</p>
          </div>
          <div className={`${netFlow >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"} border rounded-xl p-3`}>
            <p className={`text-[8px] uppercase tracking-widest font-black ${netFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>Net Flow</p>
            <p className={`text-lg font-black mt-1 ${netFlow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatSignedCurrency(netFlow)}</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
            <p className="text-[8px] uppercase tracking-widest text-indigo-400 font-black">Coverage</p>
            <p className="text-lg font-black text-indigo-300 mt-1">{studentsWithActivity}/{students.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-[1.25rem] p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-white">Recent Global Activity</h4>
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Latest 10 entries</span>
            </div>
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1 custom-scroll">
              {recentTransactions.length === 0 ? (
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-center text-[10px] uppercase tracking-widest font-black text-gray-500">
                  {transactionSearch ? "No transactions match your search." : "No transaction history found."}
                </div>
              ) : recentTransactions.map((tx, index) => {
                const student = students.find((s) => s.id === tx.student_id);
                return (
                  <div key={tx.id || index} className="grid grid-cols-[1.1fr_70px_95px] gap-2 items-center bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 hover:bg-black/40 transition-all">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase text-white truncate">{tx.description || "Transaction"}</p>
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest truncate">
                        {student?.full_name || "Unknown"} • ID: {student?.roll_id || "N/A"} • {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className={`inline-flex items-center justify-center w-full py-0.5 rounded text-[7px] font-black uppercase ${
                        tx.amount > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {tx.type || "adj"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${tx.amount > 0 ? "text-emerald-400" : "text-rose-500"}`}>
                        {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[1.25rem] p-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-white mb-3">Most Active Students</h4>
            <div className="space-y-2">
              {mostActiveStudents.length === 0 ? (
                <div className="bg-black/30 border border-white/10 rounded-lg p-3 text-[10px] uppercase tracking-widest font-black text-gray-500 text-center">
                  No student activity yet
                </div>
              ) : mostActiveStudents.map(({ student, count, balance }) => (
                <div key={student.id} className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase text-white truncate">{student.full_name}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest truncate">ID: {student.roll_id} • {count} txn</p>
                  </div>
                  <p className={`text-xs font-black ${balance >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                    ₹{Math.abs(balance).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 p-4 rounded-[1.5rem] backdrop-blur-xl">
          <div className="mb-4 pb-3 border-b border-white/10">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-indigo-400" />
              Personal Ledger & Logs
            </h3>
            <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest mt-1.5">Complete transaction history for all students</p>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1 custom-scroll">
            {students.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-8 rounded-xl backdrop-blur-xl text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-black text-gray-500 uppercase">No students enrolled yet</p>
              </div>
            ) : students.map((student) => {
              const studentTransactions = sortedTransactions.filter((tx) => tx.student_id === student.id);
              const totalBalance = studentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
              const totalIncome = studentTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
              const totalExpense = studentTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

              return (
                <div key={student.id} className="bg-black/30 border border-indigo-500/20 rounded-xl">
                  <div className="p-3 border-b border-white/10 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-white truncate">{student.full_name}</p>
                      <p className="text-[8px] uppercase tracking-widest text-gray-500 truncate">ID: {student.roll_id} • {student.grade || "N/A"} • {studentTransactions.length} txn</p>
                    </div>
                    <p className={`text-sm font-black ${totalBalance >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                      ₹{Math.abs(totalBalance).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3">
                    {studentTransactions.length === 0 ? (
                      <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black text-center py-2">No transactions yet</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-center">
                            <p className="text-[7px] text-emerald-400 font-black uppercase">Income</p>
                            <p className="text-[11px] font-black text-emerald-300 mt-1">+₹{totalIncome.toLocaleString()}</p>
                          </div>
                          <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-center">
                            <p className="text-[7px] text-rose-400 font-black uppercase">Expense</p>
                            <p className="text-[11px] font-black text-rose-300 mt-1">-₹{totalExpense.toLocaleString()}</p>
                          </div>
                          <div className={`${totalBalance >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"} border p-2 rounded-lg text-center`}>
                            <p className={`text-[7px] font-black uppercase ${totalBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>Net</p>
                            <p className={`text-[11px] font-black mt-1 ${totalBalance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatSignedCurrency(totalBalance)}</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {studentTransactions.slice(0, 6).map((tx, index) => (
                            <div key={tx.id || index} className="grid grid-cols-[1.1fr_62px_85px] gap-2 items-center text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
                              <div className="min-w-0">
                                <p className="font-black uppercase text-white truncate">{tx.description || "Transaction"}</p>
                                <p className="text-[7px] uppercase tracking-widest text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</p>
                              </div>
                              <span className={`text-center rounded py-0.5 text-[7px] font-black uppercase ${
                                tx.type === "deposit" ? "bg-emerald-500/20 text-emerald-300" :
                                tx.type === "withdrawal" ? "bg-rose-500/20 text-rose-300" :
                                "bg-blue-500/20 text-blue-300"
                              }`}>
                                {tx.type || "adj"}
                              </span>
                              <p className={`text-right font-black ${tx.amount > 0 ? "text-emerald-400" : "text-rose-500"}`}>
                                {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                              </p>
                            </div>
                          ))}
                          {studentTransactions.length > 6 && (
                            <p className="text-center text-[8px] text-gray-600 uppercase tracking-widest font-bold pt-1">
                              +{studentTransactions.length - 6} more transactions
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Bulk Student Import Function
  const handleBulkStudentImport = async () => {
    if (!bulkStudentJson.trim()) {
      alert('Please provide JSON data for student import.');
      return;
    }

    setLoading(true);
    setBulkImportResults({success: 0, failed: 0, errors: [], skipped: 0});

    try {
      const studentsData = JSON.parse(bulkStudentJson);
      
      if (!Array.isArray(studentsData)) {
        throw new Error('JSON must be an array of student objects');
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < studentsData.length; i++) {
        const studentData = studentsData[i];
        
        try {
          // Validate required fields
          if (!studentData.full_name || !studentData.roll_id) {
            throw new Error(`Student ${i + 1}: full_name and roll_id are required`);
          }

          // Check if student already exists
          const { data: existingStudent, error: checkError } = await supabase
            .from('students')
            .select('id')
            .eq('roll_id', studentData.roll_id)
            .single();

          if (existingStudent && !checkError) {
            // Update existing student
            const studentToUpdate = {
              full_name: studentData.full_name,
              grade: studentData.grade || null,
              parent_phone: studentData.parent_phone || null,
              username: studentData.username || studentData.roll_id,
              password: studentData.password || 'default123',
              email_account: studentData.email_account || `${studentData.username || studentData.roll_id}@account.com`,
              email_library: studentData.email_library || `${studentData.username || studentData.roll_id}@library.com`,
              balance: studentData.balance || 0,
              is_responsible: studentData.is_responsible || false
            };

            const { error: updateError } = await supabase
              .from('students')
              .update(studentToUpdate)
              .eq('roll_id', studentData.roll_id);

            if (updateError) {
              throw new Error(`Update failed: ${updateError.message}`);
            }

            successCount++;
          } else {
            // Insert new student
            const studentToInsert = {
              full_name: studentData.full_name,
              roll_id: studentData.roll_id,
              grade: studentData.grade || null,
              parent_phone: studentData.parent_phone || null,
              username: studentData.username || studentData.roll_id,
              password: studentData.password || 'default123',
              email_account: studentData.email_account || `${studentData.username || studentData.roll_id}@account.com`,
              email_library: studentData.email_library || `${studentData.username || studentData.roll_id}@library.com`,
              balance: studentData.balance || 0,
              is_responsible: studentData.is_responsible || false
            };

            const { data, error } = await supabase
              .from('students')
              .insert([studentToInsert])
              .select()
              .single();

            if (error) {
              throw error;
            }

            successCount++;
          }
        } catch (error: any) {
          failedCount++;
          errors.push(`Student ${i + 1} (${studentData.full_name || 'Unknown'}): ${error.message}`);
        }
      }

      setBulkImportResults({success: successCount, failed: failedCount, errors, skipped: 0});
      
      if (successCount > 0) {
        // Refresh students list
        const updatedStudents = await fetchStudents();
        setStudents(updatedStudents);
        
        let message = `Bulk import completed!\n`;
        if (successCount > 0) message += `✅ ${successCount} students added/updated successfully\n`;
        if (failedCount > 0) message += `❌ ${failedCount} students failed`;
        
        alert(message);
        
        if (failedCount === 0) {
          setBulkStudentJson("");
          setShowBulkImport(false);
        }
      } else {
        alert('No students were imported. Please check the errors below.');
      }

    } catch (error: any) {
      alert(`Invalid JSON format: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // ─── Students Tab State ──────────────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState("");
  
  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const searchLower = studentSearch.toLowerCase();
    
    // Special search for roll ID only
    if (searchLower.startsWith('id:')) {
      const rollIdSearch = searchLower.substring(3).trim();
      return students.filter(s => 
        s.roll_id.toLowerCase().includes(rollIdSearch)
      );
    }
    
    // Regular search
    return students.filter(s => 
      s.full_name.toLowerCase().includes(searchLower) ||
      s.roll_id.toLowerCase().includes(searchLower) ||
      s.grade?.toLowerCase().includes(searchLower) ||
      s.email_account?.toLowerCase().includes(searchLower)
    );
  }, [students, studentSearch]);

  const renderStudentsTab = () => (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 border border-white/10 p-4 sm:p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] backdrop-blur-xl gap-4">
          <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-black italic uppercase text-white tracking-tighter">Personnel Desk</h3>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">{filteredStudents.length} of {students.length} members</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
             <button onClick={handleDownloadStudents} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black uppercase tracking-widest text-[9px] text-white transition-all flex items-center justify-center">
                <Download className="w-3.5 h-3.5 mr-2 text-emerald-400"/>
                Download All Personnel (PDF)
             </button>
             <button onClick={() => { setEditingUser(null); setShowUserModal(true); }} className="px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] shadow-xl shadow-indigo-900/40 transition-all flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-3"/>
                Enroll New Personnel
             </button>
          </div>
       </div>
       
       {/* Bulk Import Section */}
       <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 p-6 rounded-[2rem] backdrop-blur-xl">
         <div className="flex items-center justify-between mb-4">
           <div>
             <h4 className="text-lg font-black uppercase tracking-tighter text-white flex items-center">
               <Upload className="w-5 h-5 mr-3 text-emerald-400" />
               Bulk Student Import
             </h4>
             <p className="text-[9px] text-emerald-400 uppercase tracking-widest mt-1">Import multiple students using JSON data</p>
           </div>
           <button 
             onClick={() => setShowBulkImport(!showBulkImport)}
             className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black uppercase tracking-widest text-[9px] text-white transition-all"
           >
             {showBulkImport ? 'Hide' : 'Show'} Import
           </button>
         </div>

         {showBulkImport && (
           <div className="space-y-4">
             <div className="space-y-2">
               <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Student Data (JSON Array)</label>
               <textarea
                 value={bulkStudentJson}
                 onChange={(e) => setBulkStudentJson(e.target.value)}
                 className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-mono text-sm min-h-[200px] outline-none placeholder-gray-500"
                 placeholder={`[
  {
    "full_name": "Sinan Ahmed",
    "roll_id": "2024001",
    "grade": "10th Grade",
    "parent_phone": "+1234567890",
    "username": "sinanahmed",
    "password": "securepass123",
    "balance": 0,
    "is_responsible": false
  },
  {
    "full_name": "Sinan Khan",
    "roll_id": "2024002",
    "grade": "9th Grade"
  },
  {
    "full_name": "Sinan Ali",
    "roll_id": "2024003",
    "grade": "10th Grade"
  }
]

// Note: Multiple students can have the same name
// but each must have a unique roll_id`}
               />
             </div>

             <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
               <div className="text-sm text-gray-400">
                 <p className="font-bold">Required fields: full_name, roll_id</p>
                 <p className="text-[10px] mt-1">Optional: grade, parent_phone, username, password, email_account, email_library, balance, is_responsible</p>
                 <p className="text-[10px] mt-1 text-blue-400">💡 Multiple students can share the same name - use unique roll_id to distinguish them</p>
                 <p className="text-[10px] mt-1 text-amber-400">⚠️ Existing students with same roll_id will be updated</p>
               </div>
               <button 
                 onClick={handleBulkStudentImport}
                 disabled={loading || !bulkStudentJson.trim()}
                 className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/30 transition-all disabled:opacity-50 flex items-center space-x-2"
               >
                 {loading ? (
                   <>
                     <RefreshCw className="w-4 h-4 animate-spin" />
                     <span>Importing...</span>
                   </>
                 ) : (
                   <>
                     <Upload className="w-4 h-4" />
                     <span>Import Students</span>
                   </>
                 )}
               </button>
             </div>

             {/* Import Results */}
             {(bulkImportResults.success > 0 || bulkImportResults.failed > 0) && (
               <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                 <h5 className="text-sm font-black text-white uppercase tracking-widest mb-3">Import Results</h5>
                 <div className="flex gap-4 mb-3 flex-wrap">
                   <div className="text-emerald-400">
                     <span className="font-black text-lg">{bulkImportResults.success}</span>
                     <span className="text-xs uppercase tracking-widest ml-1">Success</span>
                   </div>
                   <div className="text-rose-400">
                     <span className="font-black text-lg">{bulkImportResults.failed}</span>
                     <span className="text-xs uppercase tracking-widest ml-1">Failed</span>
                   </div>
                 </div>
                 {bulkImportResults.errors.length > 0 && (
                   <div className="space-y-1">
                     <p className="text-xs font-black text-rose-400 uppercase tracking-widest">Errors:</p>
                     {bulkImportResults.errors.map((error, index) => (
                       <p key={index} className="text-xs text-rose-300 font-mono">{error}</p>
                     ))}
                   </div>
                 )}
               </div>
             )}
           </div>
         )}
       </div>
       
       {/* Search Bar */}
       <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name, roll ID, grade, or email... (use 'id:' for roll ID only)"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-indigo-500/50 focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-gray-600"
          />
          {studentSearch && (
            <button
              onClick={() => setStudentSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
       </div>
       
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
       {filteredStudents.map((s, i) => (
          <div key={i} onClick={() => { setViewingStudent(s); setActiveTab('transactions'); }} className="bg-white/5 border border-white/10 p-3 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl hover:bg-white/10 transition-all group relative overflow-hidden backdrop-blur-xl cursor-pointer" role="button" tabIndex={0}>
             <div className="absolute top-0 left-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-blue-500/5 rounded-full -ml-8 -mt-8 sm:-ml-10 sm:-mt-10 md:-ml-12 md:-mt-12 opacity-50" />
             <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-400 font-black text-base sm:text-lg border border-blue-500/20">{s.full_name[0]}</div>
                <div className="text-right">
                  <StarRating value={s.rating || 5} onChange={(v: number) => handleUpdateRating(s.id, v)} size="sm" />
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-400 font-black uppercase mt-1 tracking-widest">ID: {s.roll_id}</p>
                  {s.grade && <p className="text-[7px] sm:text-[8px] text-gray-500 font-bold uppercase tracking-widest">{s.grade}</p>}
                </div>
             </div>
             <h4 className="text-sm sm:text-base md:text-lg font-black uppercase italic tracking-tighter relative z-10 line-clamp-1">{s.full_name}</h4>
             <div className="mt-3 flex justify-between items-end relative z-10 gap-3">
                <div><p className="text-[7px] sm:text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">Available Fund</p><p className="text-base sm:text-lg md:text-xl font-black text-white">₹{s.balance.toLocaleString()}</p></div>
                   <button onClick={(e) => { e.stopPropagation(); setViewingStudent(s); setActiveTab('transactions'); }} className="p-2 sm:p-2.5 md:p-3 bg-blue-600 rounded-xl sm:rounded-2xl hover:scale-110 transition-all shadow-lg shadow-blue-900/20"><ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4"/></button>
             </div>
             <p className="mt-2 text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-widest">Click anywhere on card to view lifetime student transactions</p>
          </div>
       ))}
    </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl md:rounded-[3rem] backdrop-blur-xl">
       <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-4 sm:mb-6 md:mb-8 flex items-center text-white"><Mail className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mr-2 sm:mr-3 md:mr-4 text-rose-500" />Authority Messaging Center</h3>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
          <div className="space-y-4 sm:space-y-6">
             <div className="space-y-2"><label className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase text-gray-500 tracking-widest">Digital Board Message</label><textarea value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} className="w-full bg-black/60 border border-white/10 p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] min-h-[180px] sm:min-h-[200px] md:min-h-[220px] text-sm sm:text-base text-white font-bold outline-none ring-rose-500/20 focus:ring-4 transition-all" placeholder="Enter broadcast text..." /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-dashed border-white/10 relative group hover:bg-white/10 transition-all">
                   <input type="file" onChange={handleFontUpload} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                   <div className="flex items-center justify-center space-x-2 text-gray-500 group-hover:text-blue-400"><Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4"/><span className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest">Library Upload</span></div>
                </div>
                <button onClick={() => handleSendNotification()} className="w-full py-3 sm:py-4 md:py-5 bg-rose-600 hover:bg-rose-500 rounded-xl sm:rounded-2xl md:rounded-[2rem] font-black uppercase tracking-widest text-[8px] sm:text-[9px] md:text-[10px] text-white shadow-xl shadow-rose-900/40 transition-all">Broadcast Priority Protocol</button>
             </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
             <h4 className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-600 uppercase tracking-widest px-2 sm:px-4">Active Transmission Data ({notifications.length})</h4>
             <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[380px] md:max-h-[440px] overflow-y-auto pr-2 custom-scroll">
                {notifications.map(n => (
                   <div key={n.id} className="p-4 sm:p-5 md:p-6 bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl flex justify-between items-start group hover:border-white/20 transition-all">
                      <div className="space-y-1.5 sm:space-y-2 flex-1 mr-2 sm:mr-3"><p className="text-xs sm:text-sm font-bold text-gray-200 leading-snug break-words">{n.message}</p><div className="flex flex-wrap items-center gap-1.5 sm:gap-2"><p className={`text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md ${n.student_id ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>{n.student_id ? 'Direct' : 'Global'}</p><span className="text-[7px] sm:text-[8px] text-gray-700 font-bold uppercase">{new Date(n.created_at).toLocaleDateString()}</span></div></div>
                      <button onClick={() => handleDeleteNotify(n.id)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all flex-shrink-0"><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4"/></button>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );

  const renderDeleteConfirmationModal = () => {
    if (!showDeleteConfirm || !userToDelete) return null;
    
    return (
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[500] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col p-8 md:p-12"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Delete User Account</h3>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">Permanent Removal from System</p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Warning Banner */}
              <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-[2.5rem] mb-8">
                <div className="flex items-start space-x-4">
                  <ShieldCheck className="w-12 h-12 text-rose-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-lg font-black text-rose-500 mb-3 uppercase">⚠️ CRITICAL WARNING</p>
                    <ul className="text-[10px] text-rose-500/80 font-bold space-y-2 leading-relaxed">
                      <li>• This action will PERMANENTLY delete {userToDelete.full_name} from the database</li>
                      <li>• Their login session will end IMMEDIATELY</li>
                      <li>• They will NOT be able to log back in</li>
                      <li>• All their data will be DELETED FOREVER</li>
                      <li>• This CANNOT be undone</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] mb-8">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Account to be Deleted</p>
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-3xl text-gray-600">
                    {userToDelete.full_name[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-black text-white uppercase mb-2">{userToDelete.full_name}</h4>
                    <div className="flex flex-wrap gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                      <span>ID: {userToDelete.roll_id}</span>
                      <span>Class: {userToDelete.grade}</span>
                      <span>Balance: ₹{userToDelete.balance?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="mb-8">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">
                  Type "DELETE" to confirm permanent removal
                </label>
                <input
                  type="text"
                  id="deleteConfirmInput"
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:ring-4 focus:ring-rose-500/20"
                  placeholder="Type DELETE here"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value === 'DELETE') {
                      handleDeleteUser();
                    }
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-[0.2em] text-gray-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={loading}
                  className="flex-1 py-5 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-rose-900/40 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>{loading ? 'DELETING...' : 'DELETE PERMANENTLY'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderBulkStudentCreditTab = () => {
    const filteredStudentsForCredit = students.filter(s => 
      s.full_name.toLowerCase().includes(bulkCreditSearch.toLowerCase()) ||
      s.roll_id.toLowerCase().includes(bulkCreditSearch.toLowerCase())
    );

    const totalDisbursement = bulkCreditAmount && selectedStudentsForCredit.length 
      ? parseFloat(bulkCreditAmount) * selectedStudentsForCredit.length 
      : 0;

    return (
      <div className="space-y-8">
        {/* Header & Controls */}
        <div className="bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border border-purple-500/20 p-8 rounded-[3rem] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">Bulk Student Credit</h3>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-2">High-density credit distribution interface</p>
            </div>
            <div className="flex items-center space-x-2 bg-purple-500/10 px-6 py-3 rounded-2xl border border-purple-500/30">
              <CreditCard className="w-6 h-6 text-purple-500" />
              <span className="text-3xl font-black text-white">{selectedStudentsForCredit.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Purpose Field */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Transaction Reason</label>
              <input 
                value={bulkCreditPurpose} 
                onChange={(e) => setBulkCreditPurpose(e.target.value)} 
                className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-bold outline-none placeholder-gray-500" 
                placeholder="e.g., Scholarship Award" 
              />
            </div>

            {/* Amount Field */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Credit Amount</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input 
                  type="number" 
                  value={bulkCreditAmount} 
                  onChange={(e) => setBulkCreditAmount(e.target.value)} 
                  className="w-full pl-10 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-black text-lg outline-none" 
                  placeholder="Amount per student" 
                />
              </div>
            </div>

            {/* Search Bar */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Filter Students</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                <input 
                  value={bulkCreditSearch} 
                  onChange={(e) => setBulkCreditSearch(e.target.value)} 
                  className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-bold outline-none" 
                  placeholder="Search by name or roll ID..." 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Student Selection Grid */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-black uppercase text-white">Student Selection</h4>
            <div className="bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/30">
              <span className="text-sm font-black text-purple-400">Selected: {selectedStudentsForCredit.length} / {students.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto custom-scroll">
            {filteredStudentsForCredit.map(s => (
              <label key={s.id} className="flex items-center space-x-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudentsForCredit.includes(s.id)}
                  onChange={() => toggleStudentCreditSelection(s.id)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white truncate">{s.full_name}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">ID: {s.roll_id}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 p-6 rounded-[2rem] backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Disbursement</p>
              <p className="text-2xl font-black text-purple-400">₹{totalDisbursement.toLocaleString()}</p>
            </div>
            <button 
              onClick={handleBulkStudentCredit} 
              disabled={loading || !bulkCreditAmount || selectedStudentsForCredit.length === 0 || parseFloat(bulkCreditAmount) <= 0}
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Process Transaction</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveUsersTab = () => (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 p-6 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">Active Users Monitor</h3>
            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">View and manage all registered users</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-black text-white">{activeUsers.length}</span>
            </div>
            {activeUsers.length > 0 && (
              <button
                onClick={handleDeleteAllStudents}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl font-black uppercase tracking-widest text-[9px] text-white shadow-xl shadow-rose-900/40 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Students</span>
              </button>
            )}
            <button
              onClick={handleDeleteAllData}
              disabled={loading}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-xl font-black uppercase tracking-widest text-[9px] text-white shadow-xl shadow-red-900/50 transition-all disabled:opacity-50 flex items-center space-x-2 border border-red-500/50"
            >
              <Trash2 className="w-4 h-4" />
              <span>⚠️ Delete All Data</span>
            </button>
          </div>
        </div>
        
        {/* Warning Notices */}
        <div className="space-y-3 mt-4">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-500 mb-1">⚠️ Delete Students</p>
              <p className="text-[8px] text-rose-500/80 font-bold leading-relaxed">
                Removes all students permanently from the system.
              </p>
            </div>
          </div>
          <div className="bg-red-600/20 border border-red-500/40 p-4 rounded-xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-500 mb-1">🚨 Delete All Data (CRITICAL)</p>
              <p className="text-[8px] text-red-500/90 font-bold leading-relaxed">
                Permanently removes EVERYTHING: students, transactions, finances, and all records. Requires confirmation prompt. Cannot be undone!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeUsers.length === 0 ? (
          <div className="col-span-full bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-xl text-center">
            <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-black text-gray-500 uppercase">No users found</p>
          </div>
        ) : (
          activeUsers.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all group"
            >
              <div className="flex flex-col justify-between h-full">
                {/* User Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0 mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${user.is_responsible ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-600 border border-white/10'}`}>
                    {user.full_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-white uppercase truncate">{user.full_name}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      <span>ID: {user.roll_id}</span>
                      <span>{user.grade}</span>
                    </div>
                    {user.username && <p className="text-[7px] text-gray-400 uppercase tracking-widest truncate">{user.username}@account.com</p>}
                  </div>
                </div>

                {/* Balance & Actions */}
                <div className="space-y-2">
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">₹{user.balance?.toLocaleString() || 0}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setViewingStudent(user);
                        setShowUserModal(true);
                        setUserType("student");
                        setEditingUser(user);
                      }}
                      className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg font-black uppercase text-[7px] tracking-widest text-white transition-all flex items-center justify-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex-1 px-2 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 rounded-lg font-black uppercase text-[7px] tracking-widest text-rose-500 transition-all flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Del</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden pb-16 md:pb-0`}>

      <div className="flex flex-1 relative overflow-hidden">
        <aside className="w-80 bg-black/40 border-r border-white/5 backdrop-blur-3xl p-8 flex flex-col hidden md:flex">
          <div className="flex items-center space-x-4 mb-12"><div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl shadow-blue-900/50">SM</div><div><span className="font-black text-2xl tracking-tighter uppercase italic block leading-none">SCHOOL.</span><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic ml-1">Central Protocol</span></div></div>
          <nav className="space-y-3">
            {[
              {id:'funds',l:'Funds Desk',i:Wallet, c:'blue'}, 
              {id:'finances',l:'Global Vault',i:Lock, c:'emerald'}, 
              {id:'students',l:'Personnel',i:Users, c:'indigo'}, 
              {id:'transactions',l:'Transactions/History',i:Activity, c:'rose'}, 
              {id:'active-users',l:'Active Users',i:UsersRound, c:'amber'}, 
            ].map(x => (
               <button 
                 key={x.id} 
                 onClick={() => {
                   console.log('Tab clicked:', x.id, 'Current:', activeTab);
                   setActiveTab(x.id);
                 }} 
                 className={`w-full flex items-center space-x-5 p-5 rounded-2xl transition-all duration-300 relative group ${activeTab === x.id ? 'bg-white/10 text-white shadow-xl translate-x-2' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
               >
                  <x.i className={`w-5 h-5 transition-transform group-hover:scale-125 ${activeTab === x.id ? (x.c === 'rose' ? 'text-rose-500' : x.c === 'amber' ? 'text-amber-500' : 'text-blue-500') : ''}`}/> 
                  <span className="font-black text-xs uppercase tracking-widest">{x.l}</span>
                  {isMounted && activeTab === x.id && <motion.div layoutId="nav-acc" className={`absolute -left-8 w-2 h-8 bg-${x.c === 'rose' ? 'rose' : x.c === 'amber' ? 'amber' : 'blue'}-500 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]`} />}
               </button>
            ))}
          </nav>
          <div className="mt-auto pt-10 border-t border-white/5 space-y-4">
            <button onClick={() => setShowProfileSettings(true)} className="w-full flex items-center space-x-4 p-5 text-indigo-400/60 hover:text-indigo-400 transition-colors font-black text-[10px] uppercase tracking-widest">
              <Settings className="w-5 h-5"/>
              <span>Security Protocol</span>
            </button>
            <button onClick={() => router.push("/")} className="w-full flex items-center space-x-4 p-5 text-rose-500/60 hover:text-rose-500 transition-colors font-black text-[10px] uppercase tracking-widest"><LogOut className="w-5 h-5"/> Secure Terminate</button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto px-6 md:px-12 pt-8 md:pt-12 custom-scroll pb-24">
          <div className="max-w-6xl mx-auto pb-8 md:pb-24">
             <header className="flex justify-between items-end mb-8 md:mb-16 relative">
                <div className="absolute -top-12 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div><h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic leading-none">{isMounted ? activeTab : 'Loading...'}</h1><div className="flex items-center space-x-2 md:space-x-4 mt-2"><div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse"/><p className="text-gray-600 text-[8px] md:text-xs font-black uppercase tracking-widest">Protocol Active • System Synced</p></div></div>
                <button onClick={refreshData} className="p-3 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 hover:bg-white/10 transition-all group overflow-hidden relative"><div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all"/><RefreshCw className={`w-5 h-5 md:w-7 md:h-7 relative z-10 text-gray-500 group-hover:text-blue-400 transition-colors ${loading ? 'animate-spin' : ''}`}/></button>
             </header>
             
             {!isMounted ? (
               <div className="flex items-center justify-center min-h-[400px]">
                 <div className="text-center space-y-4">
                   <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                   <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Initializing Protocol...</p>
                 </div>
               </div>
             ) : (
               <AnimatePresence mode="wait">
                 <motion.div 
                   key={activeTab} 
                   initial={{ opacity: 0, x: -20 }} 
                   animate={{ opacity: 1, x: 0 }} 
                   exit={{ opacity: 0, x: 20 }} 
                   transition={{ duration: 0.3, ease: "easeOut" }}
                 >
                   {renderContent()}
                 </motion.div>
               </AnimatePresence>
             )}
          </div>
        </main>
      </div>
      {renderStudentProfileModal()}
      {renderGroupCreationModal()}
      {renderUserManagementModal()}
      {renderCredentialEditModal()}
      {renderAdminProfileSettingsModal()}
      {renderDeleteConfirmationModal()}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
