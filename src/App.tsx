import React, { useState, useEffect, useMemo } from 'react';
import { TicketData, emptyTicket } from './types';
import { sampleTickets } from './data';
import { TicketPreview } from './components/TicketPreview';
import { MobileForm } from './components/MobileForm';
import { CsvImportModal } from './components/CsvImportModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SalesDashboardModal } from './components/SalesDashboardModal';
import { InvoicePreview } from './components/InvoicePreview';
import { PrinterHelpModal } from './components/PrinterHelpModal';
import { syncTicketsToGoogleSheets, getGoogleSheetsConfig } from './services/googleSheets';
import { 
  CheckCircle, 
  Plane,
  Trash2,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  AlertTriangle,
  X,
  Search,
  MoreVertical,
  Check,
  CircleCheck,
  Table,
  BarChart3,
  FileText,
  BadgePercent,
  HelpCircle
} from 'lucide-react';
import { useTicketStore } from './hooks/useTicketStore';
import { DEFAULT_HASNAIN_LOGO } from './assets/defaultLogo';
import { APP_VERSION } from './version';
import {
  getSettings,
  updateSettings,
  getActiveTicketDraft,
  saveActiveTicketDraft,
  clearActiveTicketDraft,
} from './services/storage';

export default function App() {
  const { loading, tickets: history, saveTicket, saveMultipleTickets, deleteTickets } = useTicketStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState<boolean>(false);

  // Modes & Modals: Sales Dashboard, Invoice Mode, Printer Help
  const [viewMode, setViewMode] = useState<'voucher' | 'invoice'>('voucher');
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState<boolean>(false);
  const [isPrinterHelpOpen, setIsPrinterHelpOpen] = useState<boolean>(false);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase().trim();
    return history.filter(
      (ticket) =>
        (ticket.customerName && ticket.customerName.toLowerCase().includes(q)) ||
        (ticket.pnr && ticket.pnr.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  const getPersistedSignature = (): string => {
    try {
      return getSettings().issuerSignature || '';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Signature read error:', msg);
      return '';
    }
  };

  // Current active ticket form state
  const [ticketData, setTicketData] = useState<TicketData>(() => {
    try {
      const activeDraft = getActiveTicketDraft();
      if (activeDraft) {
        return activeDraft;
      }

      const settings = getSettings();
      const defaultTicket: TicketData = {
        ...sampleTickets[0],
        id: 'active-' + Date.now(),
        date: '', // Default to blank
        logo: settings.logo || DEFAULT_HASNAIN_LOGO,
        issuerSignature: settings.issuerSignature || '',
      };
      return defaultTicket;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Initial state load error:', msg);
      return {
        ...sampleTickets[0],
        id: 'active-' + Date.now(),
        date: '',
      };
    }
  });

  // Automatically save active form draft and settings to Local Storage
  useEffect(() => {
    try {
      saveActiveTicketDraft(ticketData);
      updateSettings({
        logo: ticketData.logo,
        issuerSignature: ticketData.issuerSignature,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Settings persist error:', msg);
    }
  }, [ticketData]);

  // Scale zoom factor for the A4 sheet on-screen preview
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  
  useEffect(() => {
    if (window.innerWidth < 640) {
      setZoomScale(0.4);
    } else if (window.innerWidth < 1024) {
      setZoomScale(0.6);
    }
  }, []);

  // Loading/UI states
  const [showToast, setShowToast] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [bulkPrintTickets, setBulkPrintTickets] = useState<TicketData[] | null>(null);

  // Show a temporary success toast
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 3500);
  };

  // Save current ticket to history
  const handleSaveTicket = async () => {
    if (!ticketData.date) {
      triggerToast('Issue Date is mandatory.');
      return;
    }
    if (!ticketData.pax) {
      triggerToast('PAX is mandatory.');
      return;
    }
    if (!ticketData.ticketNo) {
      triggerToast('Ticket No. is mandatory.');
      return;
    }

    // Generate an ID if it's a new or unsaved ticket
    let updatedTicket = { ...ticketData };
    if (!updatedTicket.id || updatedTicket.id.startsWith('active-') || sampleTickets.some(s => s.id === updatedTicket.id)) {
      updatedTicket.id = 'ticket-' + Date.now() + Math.floor(Math.random() * 1000);
    }
    
    if (!updatedTicket.createdAt) {
      updatedTicket.createdAt = new Date().toISOString();
    }
    
    updatedTicket.updatedAt = new Date().toISOString();
    
    try {
      const payload = await saveTicket(updatedTicket);
      if (payload) {
        setTicketData(payload);
        triggerToast('Voucher saved successfully to local storage!');
        
        const sheetsCfg = getGoogleSheetsConfig();
        if (sheetsCfg.scriptUrl && sheetsCfg.autoSync) {
          const syncRes = await syncTicketsToGoogleSheets(payload, sheetsCfg.scriptUrl);
          if (syncRes.success) {
            triggerToast('Voucher saved and synced to Google Sheets!');
          }
        }
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Save ticket error:', errMsg);
      triggerToast('Error saving voucher: ' + errMsg);
    }
  };

  // Load a ticket from history/preset
  const handleSelectTicket = (selected: TicketData) => {
    let logo = selected.logo || ticketData.logo;
    if (logo && logo.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA4AAAAEICAIAAACB')) {
      logo = DEFAULT_HASNAIN_LOGO;
    }
    const permanentSig = getPersistedSignature() || ticketData.issuerSignature || selected.issuerSignature;
    setTicketData({
      ...selected,
      paxNames: selected.paxNames || ['', '', '', ''],
      logo: logo,
      issuerSignature: permanentSig,
    });
    triggerToast(`Loaded record: ${selected.customerName || 'Ticket Voucher'}`);
  };


  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectAll = () => {
    const targetList = filteredHistory;
    const allSelected = targetList.every(t => selectedTickets.has(t.id));
    if (allSelected) {
      const newSet = new Set(selectedTickets);
      targetList.forEach(t => newSet.delete(t.id));
      setSelectedTickets(newSet);
    } else {
      const newSet = new Set(selectedTickets);
      targetList.forEach(t => newSet.add(t.id));
      setSelectedTickets(newSet);
    }
  };

  const handleClearSelection = () => {
    setSelectedTickets(new Set());
    setIsHistoryMenuOpen(false);
  };

  const formatHistoryDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedTickets.size === 0) return;
    try {
      await deleteTickets(Array.from(selectedTickets));
      triggerToast(`Removed ${selectedTickets.size} voucher(s) from history.`);
      
      // If active ticket was among the deleted, reset its ID
      if (selectedTickets.has(ticketData.id)) {
        setTicketData({
          ...ticketData,
          id: 'active-' + Date.now(),
        });
      }
      setSelectedTickets(new Set());
      setIsDeleteConfirmOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Delete tickets error:', msg);
      triggerToast('Error deleting vouchers: ' + msg);
    }
  };

  // Batch save tickets from CSV import
  const handleBatchSaveTickets = async (newTickets: TicketData[]) => {
    try {
      await saveMultipleTickets(newTickets);
      triggerToast(`Saved ${newTickets.length} voucher(s) from CSV to history.`);
      if (newTickets.length > 0) {
        setTicketData(newTickets[0]);
      }

      const sheetsCfg = getGoogleSheetsConfig();
      if (sheetsCfg.scriptUrl && sheetsCfg.autoSync) {
        const syncRes = await syncTicketsToGoogleSheets(newTickets, sheetsCfg.scriptUrl);
        if (syncRes.success) {
          triggerToast(`Synced ${newTickets.length} voucher(s) to Google Sheets!`);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Batch save error:', msg);
      triggerToast('Error saving imported vouchers: ' + msg);
    }
  };

  const handlePerformFreshStart = () => {
    const permanentSig = getPersistedSignature() || ticketData.issuerSignature;
    setTicketData({
      ...emptyTicket,
      id: 'active-' + Date.now(),
      customerName: '',
      paxNames: ['', '', '', ''],
      carrier: '',
      date: '',
      co: '',
      remarks: '',
      box2Remarks: '',
      pnr: '',
      phone: '',
      flight: '',
      sectors: '',
      returnDate: '',
      ticketNo: '',
      salesAmount: '',
      baseFare: '',
      tax: '',
      gross: '',
      commission: '',
      ait: '',
      net: '',
      cardNo: '',
      pax: '',
      logo: DEFAULT_HASNAIN_LOGO,
      issuerSignature: permanentSig,
      foreignCurrency: 'USD',
      foreignAmount: '',
      exchangeRate: '',
      contributionMargin: '',
      keepGrossFare: false,
      createdAt: '',
    });
    setIsResetConfirmOpen(false);
    triggerToast('Form reset completely. Ready for a fresh start!');
  };


  const handlePrintTicket = () => {
    // Ensure fallbacks are present so printing is never blocked
    if (!ticketData.date) {
      setTicketData(prev => ({ ...prev, date: new Date().toLocaleDateString('en-GB') }));
    }
    if (!ticketData.pax) {
      setTicketData(prev => ({ ...prev, pax: '1' }));
    }

    setBulkPrintTickets(null);
    setMobileTab('preview');

    setTimeout(() => {
      try {
        window.print();
      } catch (err: unknown) {
        console.warn('Direct print blocked by sandbox iframe:', err);
        triggerToast('Print blocked by browser or preview frame.');
      }
    }, 100);
  };

  const handlePrintSelectedTickets = () => {
    if (selectedTickets.size === 0) return;
    const permanentSig = getPersistedSignature() || ticketData.issuerSignature;

    const selectedList = history.filter(t => selectedTickets.has(t.id)).map(t => ({
      ...t,
      date: t.date || new Date().toLocaleDateString('en-GB'),
      pax: t.pax || '1',
      issuerSignature: permanentSig || t.issuerSignature
    }));

    setBulkPrintTickets(selectedList);
    setTimeout(() => {
      try {
        window.print();
      } catch (err: unknown) {
        console.warn('Direct bulk print blocked by sandbox iframe:', err);
        triggerToast('Print blocked by browser or preview frame.');
      }
    }, 100);
  };

  useEffect(() => {
    const clearBulkPrintState = () => {
      setBulkPrintTickets(null);
    };

    window.addEventListener('afterprint', clearBulkPrintState);
    return () => {
      window.removeEventListener('afterprint', clearBulkPrintState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{showToast}</span>
        </div>
      )}

      {/* HEADER SECTION (no-print) */}
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 md:px-6 flex flex-col xl:flex-row items-center justify-between gap-4 select-none shrink-0 shadow-xs text-center xl:text-left sticky top-0 z-30">
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
          <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-600/20">
            <Plane className="w-4 h-4 md:w-5 md:h-5 text-white transform -rotate-45" />
          </div>
          <div className="flex flex-col items-center sm:items-start">
            <h1 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight font-display flex flex-wrap justify-center sm:justify-start items-center gap-2">
              Hasnain Travels & Tours
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                VOUCHER_ACTIVE
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md tracking-tight shadow-2xs">
                v{APP_VERSION}
              </span>
            </h1>
            <p className="text-[10px] md:text-[11px] text-slate-500 font-semibold tracking-wide mt-0.5">Ticketing & Reservations Portal • v{APP_VERSION}</p>
          </div>
        </div>

        {/* Global Toolbar Options inside Header */}
        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-2.5 w-full xl:w-auto">
          {/* Quick Actions Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-xs active:scale-[0.98]"
              title="Fresh Start - Clear all form fields & reset to clean state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Fresh Start</span>
            </button>
          </div>

          <span className="h-5 w-px bg-slate-200 mx-0.5 hidden xl:block" />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center xl:justify-end gap-1.5 sm:gap-2">
            {/* Daily Sales Dashboard */}
            <button
              onClick={() => setIsDashboardModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold shadow-xs hover:shadow-md hover:shadow-indigo-700/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
              title="Sales & Profit Analytics Dashboard"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-200" />
              <span>Dashboard</span>
            </button>

            {/* Google Sheets */}
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-xs hover:shadow-md hover:shadow-emerald-800/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
              title="Connect & Sync to Google Sheets"
            >
              <Table className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="sm:hidden">Sheets</span>
            </button>

            {/* Import CSV */}
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs hover:shadow-md hover:shadow-emerald-600/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
              title="Create vouchers from CSV manifest"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Import CSV</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrintTicket}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold shadow-xs hover:shadow-md active:scale-[0.98] transition-all text-xs cursor-pointer"
              title="Print active sheet"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Print</span>
            </button>

            {/* Save Voucher */}
            <button
              onClick={handleSaveTicket}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs hover:shadow-md hover:shadow-blue-600/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
            >
              Save Voucher
            </button>
          </div>
        </div>
      </header>

      {/* MAIN APPLICATION WORKSPACE (no-print) */}
      <main className="no-print flex-1 flex flex-col md:flex-row p-3 md:p-6 min-h-0 md:overflow-hidden gap-4 md:gap-6 w-full max-w-[1440px] mx-auto">
        
        {/* Sidebar: Saved History */}
        <div className="w-full md:w-[380px] shrink-0 bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl flex flex-col overflow-hidden max-h-[36rem] md:max-h-none h-auto" style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)' }}>
          <div className="bg-white px-5 py-5 border-b border-[#E5E7EB] shrink-0">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[17px] font-bold text-[#111827] font-display tracking-[-0.01em]">Saved Vouchers</span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#F8FAFC] text-[#6B7280] rounded-full border border-[#E5E7EB] tabular-nums">
                  {history.length}
                </span>
              </div>
              {/* Sidebar Toolbar Actions */}
              <div className="relative flex items-center gap-1.5">
                <button
                  onClick={handleSelectAll}
                  className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    selectedTickets.size === filteredHistory.length && filteredHistory.length > 0
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={selectedTickets.size === filteredHistory.length && filteredHistory.length > 0 ? "Deselect All" : "Select All"}
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{selectedTickets.size === filteredHistory.length && filteredHistory.length > 0 ? "Deselect" : "Select All"}</span>
                </button>
                {selectedTickets.size > 0 && (
                  <button
                    onClick={handlePrintSelectedTickets}
                    className="h-9 px-3 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="Print selected vouchers"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print ({selectedTickets.size})</span>
                  </button>
                )}
                {/* Overflow menu for selection cleanup and deletion */}
                <button
                  onClick={() => setIsHistoryMenuOpen((open) => !open)}
                  className="h-9 w-9 rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 flex items-center justify-center cursor-pointer"
                  title="More options"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {isHistoryMenuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsHistoryMenuOpen(false)} />
                    <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-lg animate-scale-up">
                      <button
                        onClick={handleClearSelection}
                        className="w-full px-3 py-2 text-left rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-colors duration-150 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2"
                        disabled={selectedTickets.size === 0}
                      >
                        <X className="w-3.5 h-3.5 text-slate-500" />
                        Clear Selection
                      </button>
                      <div className="my-1 h-px bg-slate-100" />
                      <button
                        onClick={() => {
                          setIsHistoryMenuOpen(false);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left rounded-lg text-rose-600 hover:bg-rose-50 font-semibold transition-colors duration-150 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2"
                        disabled={selectedTickets.size === 0}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Selected
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative flex items-center mt-4">
              <Search className="w-[18px] h-[18px] text-[#9CA3AF] absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passenger name or PNR..."
                className="w-full h-12 pl-12 pr-11 text-sm bg-white border border-[#E5E7EB] rounded-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-1.5 text-[#6B7280] hover:text-[#111827] rounded-full hover:bg-[#F8FAFC] transition-colors duration-150 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Selection Status Bar */}
          {selectedTickets.size > 0 && (
            <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-5 py-3 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1D4ED8]">
                <CircleCheck className="w-4 h-4 text-[#2563EB]" />
                ✓ {selectedTickets.size} voucher{selectedTickets.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handlePrintSelectedTickets}
                className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-[0.97]"
                style={{ boxShadow: '0 1px 3px 0 rgba(37,99,235,0.3)' }}
                title="Print selected vouchers"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          )}

          {/* Voucher Card List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-12 text-[13px] text-[#9CA3AF] font-medium">
                Loading vouchers...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 px-4 text-[13px] text-[#9CA3AF] font-medium leading-relaxed">
                No vouchers saved yet. Create or import a voucher to list here.
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 px-4 text-[13px] text-[#9CA3AF] font-medium">
                No matching vouchers found.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredHistory.map(ticket => (
                  <div 
                    key={ticket.id} 
                    className={`rounded-[14px] p-[18px] cursor-pointer flex items-start gap-4 group relative border transition-all duration-200 ${
                      selectedTickets.has(ticket.id)
                        ? 'bg-[#F8FAFF] border-[#93C5FD]'
                        : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
                    }`}
                    style={{
                      boxShadow: selectedTickets.has(ticket.id)
                        ? '0 0 0 1px rgba(37,99,235,0.08), 0 1px 3px 0 rgba(37,99,235,0.06)'
                        : '0 1px 2px 0 rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedTickets.has(ticket.id)) {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px 0 rgba(0,0,0,0.07), 0 1px 3px 0 rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedTickets.has(ticket.id)) {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => handleToggleSelect(ticket.id, e)}
                      className={`mt-0.5 shrink-0 w-[22px] h-[22px] rounded-md border-[1.5px] transition-all duration-150 flex items-center justify-center ${
                        selectedTickets.has(ticket.id)
                          ? 'bg-[#2563EB] border-[#2563EB] text-white'
                          : 'bg-white border-[#D1D5DB] text-transparent hover:border-[#93C5FD] hover:bg-[#EFF6FF]'
                      }`}
                      aria-label={selectedTickets.has(ticket.id) ? 'Deselect voucher' : 'Select voucher'}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </button>
                    {/* Voucher info */}
                    <div onClick={() => handleSelectTicket(ticket)} className="flex-1 min-w-0">
                      <div className="text-[17px] leading-snug font-bold text-[#111827] truncate group-hover:text-[#2563EB] transition-colors duration-150">
                        {ticket.customerName || 'Unnamed Passenger'}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-semibold text-[#374151] bg-[#F3F4F6] rounded-md border border-[#E5E7EB] tracking-wide font-mono">
                          {ticket.pnr || 'NO-PNR'}
                        </span>
                        <span className="text-[12px] text-[#6B7280] font-medium">
                          {formatHistoryDate(ticket.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Live Preview */}
        <div className="flex-1 bg-slate-200/50 border border-slate-300/80 rounded-2xl flex flex-col md:overflow-hidden shadow-xs relative min-w-0">

          
          {/* Preview Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 select-none shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-start w-full sm:w-auto">
              {/* Document Mode Switcher (Ticket Voucher vs Invoice Mode) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setViewMode('voucher')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    viewMode === 'voucher'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="A4 Air Ticket Voucher Billing Sheet"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ticket Voucher</span>
                </button>
                <button
                  onClick={() => setViewMode('invoice')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    viewMode === 'invoice'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Official Agency Invoice"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Invoice Mode</span>
                </button>
              </div>

              {/* Show Discount quick toggle when in Invoice Mode */}
              {viewMode === 'invoice' && (
                <button
                  onClick={() => {
                    const next = !ticketData.showDiscount;
                    let defaultDisc = ticketData.discount || '';
                    if (next && (!defaultDisc || defaultDisc === '0')) {
                      const g = parseFloat(ticketData.gross) || 0;
                      const s = parseFloat(ticketData.salesAmount) || 0;
                      defaultDisc = (g > s && s > 0) ? Math.round(g - s).toString() : '1000';
                    }
                    setTicketData(prev => ({
                      ...prev,
                      showDiscount: next,
                      discount: defaultDisc,
                    }));
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    ticketData.showDiscount
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle discount line on invoice"
                >
                  <BadgePercent className={`w-3.5 h-3.5 ${ticketData.showDiscount ? 'text-rose-600' : 'text-slate-500'}`} />
                  <span>{ticketData.showDiscount ? 'Discount: Active' : 'Show Discount'}</span>
                </button>
              )}

              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{viewMode === 'voucher' ? 'Click fields on voucher to edit' : 'Click fields on invoice to edit • Live Sync'}</span>
              </div>
              
              {/* Mobile Tab Switcher */}
              <div className="flex md:hidden bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setMobileTab('form')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${mobileTab === 'form' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setMobileTab('preview')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${mobileTab === 'preview' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Scale Zoom & Printer Help Controls */}
            <div className={`items-center gap-2 ${mobileTab === 'form' ? 'hidden md:flex' : 'flex'}`}>
              <button
                type="button"
                onClick={() => setIsPrinterHelpOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Browser-specific print settings & troubleshooting guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Printer Help</span>
              </button>

              <span className="text-xs font-semibold text-slate-500">Zoom:</span>
              <select
                value={zoomScale}
                onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                className="px-2.5 py-1 bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/15"
              >
                <option value="0.1">10%</option>
                <option value="0.2">20%</option>
                <option value="0.3">30%</option>
                <option value="0.35">35%</option>
                <option value="0.4">40%</option>
                <option value="0.5">50%</option>
                <option value="0.6">60%</option>
                <option value="0.7">70%</option>
                <option value="0.75">75%</option>
                <option value="0.8">80%</option>
                <option value="0.9">90%</option>
                <option value="0.95">95%</option>
                <option value="1">100%</option>
                <option value="1.1">110%</option>
                <option value="1.2">120%</option>
                <option value="1.3">130%</option>
                <option value="1.4">140%</option>
                <option value="1.5">150%</option>
              </select>
            </div>
          </div>

          {/* Form / Preview Area */}
          <div className="flex-grow md:overflow-auto overflow-visible p-0 md:p-8 flex justify-center items-start bg-slate-300/40 relative">
            
            {/* Mobile Form (Hidden on md and up) */}
            <div className={`w-full md:hidden bg-slate-100 ${mobileTab === 'form' ? 'block' : 'hidden'}`}>
              <MobileForm 
                data={ticketData} 
                onChange={setTicketData} 
                onFreshStart={() => setIsResetConfirmOpen(true)} 
              />
            </div>

            {/* Scaled Preview Canvas container */}
            <div 
              className={`relative transition-transform duration-100 ease-out flex-shrink-0 ${mobileTab === 'form' ? 'hidden md:block' : 'block'}`}
              style={{
                width: '210mm',
                height: '297mm',
                // Keep the spacer height corresponding to the scaled element to enable proper scrolling
                marginBottom: `calc(${297 * (zoomScale - 1)}mm + 2rem)`,
                marginRight: `calc(${210 * (zoomScale - 1)}mm)`,
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top left',
              }}
            >
              {/* Renders active view: Ticket Voucher or Invoice */}
              {viewMode === 'invoice' ? (
                <InvoicePreview 
                  data={ticketData} 
                  onChange={setTicketData} 
                />
              ) : (
                <TicketPreview 
                  data={ticketData} 
                  onChange={setTicketData} 
                />
              )}
            </div>
          </div>

          {/* Quick status bar */}
          <div className="bg-slate-50 border-t border-slate-300 px-5 py-2 text-[10px] text-slate-500 flex items-center justify-between select-none shrink-0">
            <span>Dimensions: 210mm x 297mm (Standard ISO A4 Sheet) • Mode: {viewMode === 'invoice' ? 'Official Invoice' : 'Air Ticket Voucher'}</span>
            <span className="font-medium text-slate-600">Zoom: {Math.round(zoomScale * 100)}%</span>
          </div>

        </div>

      </main>

      {/* DEDICATED PRINT-ONLY NODE (Hidden on screen, becomes visible during print) */}
      <div className={`print-only-container ${bulkPrintTickets ? '' : 'is-active-print'}`} id="ticket-pdf-target">
        <div className="print-page">
          {viewMode === 'invoice' ? (
            <InvoicePreview data={ticketData} isPrinting={true} />
          ) : (
            <TicketPreview data={ticketData} isPrinting={true} />
          )}
        </div>
      </div>

      {/* DEDICATED BULK PRINT NODE */}
      <div className={`print-only-container ${bulkPrintTickets ? 'is-active-print' : ''}`}>
        {bulkPrintTickets?.map((ticket, index) => (
          <div className="print-page" key={`${ticket.id}-${index}`}>
            {viewMode === 'invoice' ? (
              <InvoicePreview data={ticket} isPrinting={true} />
            ) : (
              <TicketPreview data={ticket} isPrinting={true} />
            )}
          </div>
        ))}
      </div>

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSelectTicket={(ticket) => {
          const permanentSig = getPersistedSignature() || ticketData.issuerSignature;
          setTicketData({
            ...ticket,
            issuerSignature: permanentSig || ticket.issuerSignature
          });
          triggerToast(`Loaded CSV voucher for ${ticket.customerName}`);
        }}
        onBatchSaveTickets={handleBatchSaveTickets}
        currentLogo={ticketData.logo}
        currentSignature={getPersistedSignature() || ticketData.issuerSignature}
      />

      {/* CONFIRMATION MODAL FOR FRESH START / RESET FORM */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-5 relative animate-scale-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <button 
              onClick={() => setIsResetConfirmOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="reset-modal-title" className="text-base font-bold text-slate-800">
                  Confirm Fresh Start
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Reset form fields to a clean state
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-2">
              <p className="font-semibold text-slate-700">Are you sure you want to perform a Fresh Start?</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Clears passenger names, ticket numbers, PNRs, and dates</li>
                <li>Resets all fare calculations, totals, and sales amounts</li>
                <li>Clears temporary uploads, signatures, and custom logos</li>
              </ul>
              <div className="mt-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                ✓ Saved vouchers in your history will remain safe and untouched.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePerformFreshStart}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Yes, Reset Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETE SELECTED VOUCHERS */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-5 relative animate-scale-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-selected-modal-title"
          >
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-selected-modal-title" className="text-base font-bold text-slate-800">
                  Delete Selected Vouchers
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedTickets.size} voucher{selectedTickets.size !== 1 ? 's' : ''} will be permanently removed
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-2">
              <p className="font-semibold text-rose-700">This action cannot be undone.</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>The selected voucher{selectedTickets.size !== 1 ? 's' : ''} will be permanently deleted from your history</li>
                <li>Your agency logo, signature, and other settings will remain unchanged</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete {selectedTickets.size} Voucher{selectedTickets.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        historyTickets={history}
        onBatchSaveTickets={handleBatchSaveTickets}
        onToast={triggerToast}
      />


      {/* Daily Sales & Profit Analytics Dashboard */}
      <SalesDashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        tickets={history}
      />

      {/* Printer Help & Browser Settings Overlay */}
      <PrinterHelpModal
        isOpen={isPrinterHelpOpen}
        onClose={() => setIsPrinterHelpOpen(false)}
        onTriggerPrint={handlePrintTicket}
        currentMode={viewMode}
      />


      {/* Footer with App Version (no-print) */}
      <footer className="no-print mt-auto py-3 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/70 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <span className="font-medium text-slate-600">
          Hasnain Travels & Tours Ticketing Portal
        </span>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
            Version {APP_VERSION}
          </span>
          <span>•</span>
          <span>Interactive Manifest & Fares</span>
        </div>
      </footer>

    </div>
  );
}
