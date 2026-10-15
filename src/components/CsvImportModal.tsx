import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download,
  Check, 
  CheckCircle, 
  X, 
  Users, 
  FileText, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  Info,
  BadgePercent,
  SlidersHorizontal,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plane,
  FileCheck2,
  Pencil,
  Building2,
  Phone,
  MessageSquare
} from 'lucide-react';
import { TicketData } from '../types';
import { 
  parseCsvToRecords, 
  parseCSVText,
  extractCsvHeaders,
  detectInitialColumnMapping,
  CSV_COLUMN_DEFINITIONS,
  CsvFieldKey,
  CsvImportRecord, 
  SalesAmountImportMode,
  SAMPLE_CSV_CONTENT 
} from '../utils/csvParser';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (ticket: TicketData) => void;
  onBatchSaveTickets: (tickets: TicketData[]) => Promise<void>;
  currentLogo: string;
  currentSignature: string;
}

export function CsvImportModal({
  isOpen,
  onClose,
  onSelectTicket,
  onBatchSaveTickets,
  currentLogo,
  currentSignature
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [groupByPnr, setGroupByPnr] = useState<boolean>(false);
  const [records, setRecords] = useState<CsvImportRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sales Amount (BDT) specific options
  const [salesAmountMode, setSalesAmountMode] = useState<SalesAmountImportMode>('csv');
  const [customMarkup, setCustomMarkup] = useState<string>('');

  // Interactive Column Mapping state
  const [isMappingOpen, setIsMappingOpen] = useState<boolean>(false);
  const [columnMapping, setColumnMapping] = useState<Record<CsvFieldKey, string>>(() => {
    return detectInitialColumnMapping([]);
  });

  // Inline table editing state
  const [editedRowIds, setEditedRowIds] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Extract detected headers from uploaded or pasted CSV
  const detectedHeaders = useMemo(() => {
    return extractCsvHeaders(rawCsvText);
  }, [rawCsvText]);

  // Extract first row values for sample preview alongside column dropdowns
  const firstRowSampleValues = useMemo(() => {
    if (!rawCsvText.trim()) return {};
    const rows = parseCSVText(rawCsvText);
    if (rows.length < 2) return {};
    const headers = rows[0].map(h => h.trim());
    const row1 = rows[1];
    const map: Record<string, string> = {};
    headers.forEach((h, idx) => {
      map[h] = row1[idx] || '';
    });
    return map;
  }, [rawCsvText]);

  // Auto-detect and populate mapping whenever a new CSV is loaded
  useEffect(() => {
    if (detectedHeaders.length > 0) {
      const initial = detectInitialColumnMapping(detectedHeaders);
      setColumnMapping(initial);
      setEditedRowIds(new Set());
      setExpandedRowId(null);
    }
  }, [detectedHeaders]);

  // Calculate count of mapped fields
  const mappedFieldsCount = useMemo(() => {
    return Object.values(columnMapping).filter(val => val && val !== '__none__').length;
  }, [columnMapping]);

  // Parse CSV text whenever text, grouping, sales amount options, or column mapping changes
  useEffect(() => {
    if (rawCsvText.trim()) {
      const parsed = parseCsvToRecords(rawCsvText, {
        groupByPnr,
        logo: currentLogo,
        signature: currentSignature,
        salesAmountColumn: columnMapping.salesAmount && columnMapping.salesAmount !== '__none__' && columnMapping.salesAmount !== '__auto__' 
          ? columnMapping.salesAmount 
          : '',
        salesAmountMode: salesAmountMode,
        customMarkupBDT: customMarkup,
        columnMapping: columnMapping,
      });
      setRecords(parsed);
      setSelectedIds(new Set(parsed.map(r => r.id)));
      setEditedRowIds(new Set());
    } else {
      setRecords([]);
      setSelectedIds(new Set());
      setEditedRowIds(new Set());
    }
  }, [rawCsvText, groupByPnr, currentLogo, currentSignature, columnMapping, salesAmountMode, customMarkup]);

  // Helper to update any field inline directly on a record
  const handleUpdateRecordField = (
    recordId: string, 
    field: keyof TicketData | 'name' | 'pnr' | 'ticketNo' | 'route' | 'carrier' | 'date', 
    val: string
  ) => {
    setEditedRowIds(prev => new Set(prev).add(recordId));
    setRecords(prev => prev.map(rec => {
      if (rec.id !== recordId) return rec;

      const updatedTicket: TicketData = { ...rec.ticketData };
      const newRec = { ...rec };

      if (field === 'name') {
        newRec.name = val;
        updatedTicket.customerName = val;
        const paxNames = [...(updatedTicket.paxNames || ['', '', '', ''])];
        paxNames[0] = val;
        updatedTicket.paxNames = paxNames;
      } else if (field === 'pnr') {
        const upper = val.toUpperCase();
        newRec.pnr = upper;
        updatedTicket.pnr = upper;
      } else if (field === 'ticketNo') {
        newRec.ticketNo = val;
        updatedTicket.ticketNo = val;
      } else if (field === 'carrier') {
        const upper = val.toUpperCase();
        newRec.airCode = upper;
        updatedTicket.carrier = upper;
      } else if (field === 'route') {
        const upper = val.toUpperCase();
        newRec.route = upper;
        updatedTicket.sectors = upper;
      } else if (field === 'date') {
        newRec.issueDate = val;
        updatedTicket.date = val;
      } else if (field === 'salesAmount') {
        updatedTicket.salesAmount = val;
        newRec.salesAmount = val;
        if (updatedTicket.keepGrossFare && val !== updatedTicket.gross) {
          updatedTicket.keepGrossFare = false;
        }
      } else if (field === 'gross') {
        updatedTicket.gross = val;
        newRec.gross = val;
        if (updatedTicket.keepGrossFare) {
          updatedTicket.salesAmount = val;
          newRec.salesAmount = val;
        }
      } else if (field === 'co') {
        newRec.co = val;
        updatedTicket.co = val;
      } else {
        (updatedTicket as any)[field] = val;
      }

      newRec.ticketData = updatedTicket;
      return newRec;
    }));
  };

  // Compute selected totals for footer summary
  const { totalSelectedGross, totalSelectedSales } = useMemo(() => {
    let grossSum = 0;
    let salesSum = 0;
    records.forEach(r => {
      if (selectedIds.has(r.id)) {
        grossSum += parseFloat(r.ticketData.gross) || 0;
        salesSum += parseFloat(r.ticketData.salesAmount) || 0;
      }
    });
    return {
      totalSelectedGross: Math.round(grossSum),
      totalSelectedSales: Math.round(salesSum)
    };
  }, [records, selectedIds]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawCsvText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawCsvText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    setFileName('sample_tickets.csv');
    setRawCsvText(SAMPLE_CSV_CONTENT);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hasnain_travels_sample_tickets.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  const handleColumnMapChange = (key: CsvFieldKey, val: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleResetMapping = () => {
    const fresh = detectInitialColumnMapping(detectedHeaders);
    setColumnMapping(fresh);
  };

  const handleClearMapping = () => {
    const emptyMapping = {} as Record<CsvFieldKey, string>;
    CSV_COLUMN_DEFINITIONS.forEach(def => {
      emptyMapping[def.key] = '__none__';
    });
    setColumnMapping(emptyMapping);
  };

  const handleLoadFirstSelectedIntoForm = () => {
    const selectedRecord = records.find(r => selectedIds.has(r.id));
    if (selectedRecord) {
      onSelectTicket(selectedRecord.ticketData);
      onClose();
    }
  };

  const handleBatchSave = async () => {
    const selectedTickets = records
      .filter(r => selectedIds.has(r.id))
      .map(r => r.ticketData);

    if (selectedTickets.length === 0) return;

    setIsSaving(true);
    try {
      await onBatchSaveTickets(selectedTickets);
      onClose();
    } catch (e) {
      console.error('Batch save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const allTickets = records.map(r => r.ticketData);
    if (allTickets.length === 0) return;

    setIsSaving(true);
    try {
      await onBatchSaveTickets(allTickets);
      onClose();
    } catch (e) {
      console.error('Save all error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Group column definitions by category
  const coreDefinitions = CSV_COLUMN_DEFINITIONS.filter(d => d.category === 'core');
  const faresDefinitions = CSV_COLUMN_DEFINITIONS.filter(d => d.category === 'fares');
  const detailsDefinitions = CSV_COLUMN_DEFINITIONS.filter(d => d.category === 'details');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight text-white flex items-center gap-2">
                Create Vouchers from CSV
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Upload or paste flight ticket manifests with column mapping & inline table editing
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 bg-slate-50">
          
          {/* Top Options Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
            {/* Input Method Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload CSV File
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'paste' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Raw Text
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleLoadSample}
                className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
              >
                Load Sample CSV
              </button>
              <button
                onClick={handleDownloadSample}
                className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg transition-all flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download Sample CSV
              </button>
            </div>
          </div>

          {/* Input Section depending on activeTab */}
          {activeTab === 'upload' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/40 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,text/csv"
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {fileName ? `Loaded: ${fileName}` : 'Click or Drag & Drop CSV File here'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports custom formats from Sabre, Amadeus, Galileo, Biman, Flyhub, and agency spreadsheets
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Paste Raw CSV Content
              </label>
              <textarea
                value={rawCsvText}
                onChange={(e) => setRawCsvText(e.target.value)}
                placeholder={SAMPLE_CSV_CONTENT}
                rows={5}
                className="w-full font-mono text-xs p-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
          )}

          {/* Interactive Column Mapping Accordion */}
          {detectedHeaders.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
              <div 
                onClick={() => setIsMappingOpen(!isMappingOpen)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Interactive Column Mapping
                      </span>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                        {mappedFieldsCount} of {CSV_COLUMN_DEFINITIONS.length} fields mapped
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Match custom column names from your CSV to voucher fields (Passenger, PNR, Ticket No, Fares)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleResetMapping(); }}
                      className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Auto-Detect
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleClearMapping(); }}
                      className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                    {isMappingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {isMappingOpen && (
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-5 animate-in fade-in duration-150">
                  
                  {/* Category 1: Core Ticket Info */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 border-b border-blue-100 pb-1">
                      <Plane className="w-3.5 h-3.5 text-blue-600" />
                      <span>1. Core Flight & Passenger Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {coreDefinitions.map(def => {
                        const currentVal = columnMapping[def.key] || '';
                        const sampleVal = currentVal && currentVal !== '__none__' && currentVal !== '__auto__' 
                          ? firstRowSampleValues[currentVal] 
                          : '';
                        return (
                          <div key={def.key} className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-800">
                                {def.label} {def.required && <span className="text-rose-500">*</span>}
                              </label>
                              {currentVal && currentVal !== '__none__' && (
                                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Mapped
                                </span>
                              )}
                            </div>
                            <select
                              value={currentVal}
                              onChange={(e) => handleColumnMapChange(def.key, e.target.value)}
                              className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                            >
                              <option value="__auto__">✨ Auto-Detect (Default)</option>
                              <option value="__none__">❌ Skip / Do Not Map</option>
                              <optgroup label="Detected CSV Columns">
                                {detectedHeaders.map(col => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                            {sampleVal && (
                              <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                Sample: <span className="text-slate-700 font-bold">{sampleVal}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 2: Fares & Pricing */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 border-b border-amber-200/60 pb-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      <span>2. Fares & Financial Breakdown (BDT)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {faresDefinitions.map(def => {
                        const currentVal = columnMapping[def.key] || '';
                        const sampleVal = currentVal && currentVal !== '__none__' && currentVal !== '__auto__' 
                          ? firstRowSampleValues[currentVal] 
                          : '';
                        const isSalesAmt = def.key === 'salesAmount';
                        return (
                          <div 
                            key={def.key} 
                            className={`rounded-lg p-2.5 flex flex-col gap-1 shadow-2xs border ${
                              isSalesAmt ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <label className={`text-[11px] font-bold ${isSalesAmt ? 'text-amber-950 font-black' : 'text-slate-800'}`}>
                                {def.label}
                              </label>
                              {currentVal && currentVal !== '__none__' && (
                                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Mapped
                                </span>
                              )}
                            </div>
                            <select
                              value={currentVal}
                              onChange={(e) => handleColumnMapChange(def.key, e.target.value)}
                              className={`w-full text-xs font-semibold border rounded px-2 py-1 outline-none ${
                                isSalesAmt 
                                  ? 'bg-white border-amber-400 text-amber-950 focus:border-amber-600' 
                                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white'
                              }`}
                            >
                              <option value="__auto__">✨ Auto-Detect (Default)</option>
                              <option value="__none__">❌ Skip / Do Not Map</option>
                              <optgroup label="Detected CSV Columns">
                                {detectedHeaders.map(col => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                            {sampleVal && (
                              <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                Sample: <span className="text-slate-700 font-bold">{sampleVal}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 3: Additional Details */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-200 pb-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>3. Corporate Account, Remarks & Contact</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {detailsDefinitions.map(def => {
                        const currentVal = columnMapping[def.key] || '';
                        const sampleVal = currentVal && currentVal !== '__none__' && currentVal !== '__auto__' 
                          ? firstRowSampleValues[currentVal] 
                          : '';
                        return (
                          <div key={def.key} className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-800 truncate">
                                {def.label} {def.required && <span className="text-rose-500">*</span>}
                              </label>
                              {currentVal && currentVal !== '__none__' && (
                                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                  Mapped
                                </span>
                              )}
                            </div>
                            <select
                              value={currentVal}
                              onChange={(e) => handleColumnMapChange(def.key, e.target.value)}
                              className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                            >
                              <option value="__auto__">✨ Auto-Detect (Default)</option>
                              <option value="__none__">❌ Skip / Do Not Map</option>
                              <optgroup label="Detected CSV Columns">
                                {detectedHeaders.map(col => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                            {sampleVal && (
                              <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                Sample: <span className="text-slate-700 font-bold">{sampleVal}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* SALES AMOUNT (BDT) Strategy & Grouping Bar */}
          {records.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              
              {/* Sales Amount Calculation Strategy */}
              <div className="lg:col-span-7 bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Sales Amount Pricing Strategy
                    </span>
                  </div>
                  {columnMapping.salesAmount && columnMapping.salesAmount !== '__none__' && columnMapping.salesAmount !== '__auto__' && (
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded">
                      Column: {columnMapping.salesAmount}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    salesAmountMode === 'csv' 
                      ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold shadow-2xs' 
                      : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50'
                  }`}>
                    <input
                      type="radio"
                      name="salesAmountMode"
                      checked={salesAmountMode === 'csv'}
                      onChange={() => setSalesAmountMode('csv')}
                      className="accent-amber-600"
                    />
                    <span>From CSV Column</span>
                  </label>

                  <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    salesAmountMode === 'gross' 
                      ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold shadow-2xs' 
                      : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50'
                  }`}>
                    <input
                      type="radio"
                      name="salesAmountMode"
                      checked={salesAmountMode === 'gross'}
                      onChange={() => setSalesAmountMode('gross')}
                      className="accent-amber-600"
                    />
                    <span>Match Gross Fare (Locked)</span>
                  </label>

                  <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    salesAmountMode === 'net_plus_markup' 
                      ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold shadow-2xs' 
                      : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50'
                  }`}>
                    <input
                      type="radio"
                      name="salesAmountMode"
                      checked={salesAmountMode === 'net_plus_markup'}
                      onChange={() => setSalesAmountMode('net_plus_markup')}
                      className="accent-amber-600"
                    />
                    <span>Net Fare + Mark Up</span>
                  </label>

                  {salesAmountMode === 'net_plus_markup' && (
                    <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-1">
                      <span className="text-[11px] text-slate-500 font-bold">Override BDT:</span>
                      <input
                        type="number"
                        placeholder="e.g. 1000"
                        value={customMarkup}
                        onChange={(e) => setCustomMarkup(e.target.value)}
                        className="w-18 text-xs font-mono font-bold outline-none text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Grouping Options */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Passenger Grouping
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="grouping"
                      checked={!groupByPnr}
                      onChange={() => setGroupByPnr(false)}
                      className="accent-blue-600"
                    />
                    <span>1 Voucher / Line</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="grouping"
                      checked={groupByPnr}
                      onChange={() => setGroupByPnr(true)}
                      className="accent-blue-600"
                    />
                    <span>Group by PNR (Max 4/Voucher)</span>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* Parsed Vouchers Preview Table with INLINE EDITING */}
          {records.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    Parsed Vouchers ({records.length})
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({selectedIds.size} selected)
                    </span>
                  </span>
                  {editedRowIds.size > 0 && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                      <Pencil className="w-2.5 h-2.5" />
                      {editedRowIds.size} edited inline
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 italic">
                    <Pencil className="w-3 h-3 text-blue-600" />
                    Click any cell in the table below to edit directly
                  </span>
                  <button
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    {selectedIds.size === records.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-x-auto bg-white shadow-2xs max-h-96">
                <table className="w-full text-left border-collapse text-xs min-w-[960px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="p-2 w-10 text-center">
                        <button onClick={handleSelectAll}>
                          {selectedIds.size === records.length ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-2 min-w-[130px]">PNR & Date</th>
                      <th className="p-2 min-w-[200px]">Passenger Name</th>
                      <th className="p-2 min-w-[170px]">Ticket No & Airline</th>
                      <th className="p-2 min-w-[130px]">Route</th>
                      <th className="p-2 min-w-[130px]">C/O Account</th>
                      <th className="p-2 text-right min-w-[140px] bg-amber-100 text-amber-900 border-x border-amber-300">
                        Sales Amount (BDT)
                      </th>
                      <th className="p-2 text-right min-w-[120px]">Gross Fare (BDT)</th>
                      <th className="p-2 text-center min-w-[110px]">Rule / Margin</th>
                      <th className="p-2 text-center w-12">More</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map((rec) => {
                      const isSelected = selectedIds.has(rec.id);
                      const isEdited = editedRowIds.has(rec.id);
                      const isExpanded = expandedRowId === rec.id;
                      const salesVal = parseFloat(rec.ticketData.salesAmount) || 0;
                      const grossVal = parseFloat(rec.ticketData.gross) || 0;
                      const margin = salesVal - grossVal;

                      return (
                        <React.Fragment key={rec.id}>
                          <tr 
                            onClick={() => handleToggleSelect(rec.id)}
                            className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/25' : ''
                            } ${isEdited ? 'border-l-4 border-l-amber-500' : ''}`}
                          >
                            {/* Checkbox */}
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleToggleSelect(rec.id)}>
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300" />
                                )}
                              </button>
                            </td>

                            {/* PNR & Date */}
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={rec.pnr || ''}
                                    placeholder="PNR"
                                    onChange={(e) => handleUpdateRecordField(rec.id, 'pnr', e.target.value)}
                                    className="w-full text-xs font-mono font-bold uppercase text-slate-800 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5 outline-none transition-colors"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={rec.ticketData.date || rec.issueDate || ''}
                                  placeholder="YYYY-MM-DD"
                                  onChange={(e) => handleUpdateRecordField(rec.id, 'date', e.target.value)}
                                  className="w-full text-[10px] text-slate-500 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5 outline-none transition-colors"
                                />
                              </div>
                            </td>

                            {/* Passenger Name */}
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={rec.name || ''}
                                  placeholder="Passenger Name"
                                  onChange={(e) => handleUpdateRecordField(rec.id, 'name', e.target.value)}
                                  className="w-full text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-1 outline-none transition-colors"
                                />
                                {isEdited && (
                                  <span className="absolute right-1 text-[9px] text-amber-600 bg-amber-50 px-1 rounded pointer-events-none font-bold">
                                    •
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Ticket Number & Airline Code */}
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={rec.ticketNo || ''}
                                  placeholder="Ticket Number"
                                  onChange={(e) => handleUpdateRecordField(rec.id, 'ticketNo', e.target.value)}
                                  className="w-full text-xs font-mono text-slate-800 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5 outline-none transition-colors"
                                />
                                <input
                                  type="text"
                                  value={rec.airCode || rec.ticketData.carrier || ''}
                                  placeholder="AIR"
                                  maxLength={3}
                                  onChange={(e) => handleUpdateRecordField(rec.id, 'carrier', e.target.value)}
                                  className="w-10 text-[10px] font-mono font-bold uppercase text-center text-slate-700 bg-slate-100/70 hover:bg-slate-200/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded px-1 py-0.5 outline-none transition-colors"
                                  title="Airline Carrier Code"
                                />
                              </div>
                            </td>

                            {/* Route */}
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={rec.ticketData.sectors || rec.route || ''}
                                placeholder="e.g. CGP-DAC"
                                onChange={(e) => handleUpdateRecordField(rec.id, 'route', e.target.value)}
                                className="w-full text-xs font-mono font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 outline-none transition-colors"
                              />
                            </td>

                            {/* C/O Corporate / Client */}
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={rec.ticketData.co || ''}
                                placeholder="C/O Ref"
                                onChange={(e) => handleUpdateRecordField(rec.id, 'co', e.target.value)}
                                className="w-full text-xs text-slate-700 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5 outline-none transition-colors"
                              />
                            </td>

                            {/* Sales Amount (BDT) - highlighted editable cell */}
                            <td className="p-2 bg-amber-50/60 border-x border-amber-200 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[11px] font-bold text-amber-700 select-none">৳</span>
                                <input
                                  type="number"
                                  value={rec.ticketData.salesAmount || ''}
                                  placeholder="0"
                                  onChange={(e) => handleUpdateRecordField(rec.id, 'salesAmount', e.target.value)}
                                  className="w-24 text-right text-xs font-mono font-bold text-amber-950 bg-amber-100/80 hover:bg-amber-100 focus:bg-white border border-amber-300 focus:border-amber-600 rounded px-1.5 py-1 outline-none transition-all shadow-2xs"
                                />
                              </div>
                            </td>

                            {/* Gross Fare (BDT) */}
                            <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[11px] font-bold text-slate-400 select-none">৳</span>
                                <input
                                  type="number"
                                  value={rec.ticketData.gross || ''}
                                  placeholder="0"
                                  onChange={(e) => handleUpdateRecordField(rec.id, 'gross', e.target.value)}
                                  className="w-24 text-right text-xs font-mono font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-1 outline-none transition-colors"
                                />
                              </div>
                            </td>

                            {/* Pricing Rule / Margin badge */}
                            <td className="p-2 text-center font-sans">
                              {rec.ticketData.keepGrossFare ? (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  Gross Locked
                                </span>
                              ) : margin > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  +৳ {margin.toLocaleString()}
                                </span>
                              ) : margin < 0 ? (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  -৳ {Math.abs(margin).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Exact Gross
                                </span>
                              )}
                            </td>

                            {/* Row Expand / Collapse for deeper details */}
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}
                                className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                                  isExpanded ? 'bg-blue-100 text-blue-700' : 'text-slate-400'
                                }`}
                                title={isExpanded ? 'Hide additional fields' : 'Edit remarks, travel dates & accounting'}
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Row: Secondary Fields Inline Drawer */}
                          {isExpanded && (
                            <tr className="bg-slate-100/90 border-b border-slate-300 animate-in fade-in duration-100" onClick={(e) => e.stopPropagation()}>
                              <td colSpan={10} className="p-3">
                                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-col gap-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                      Detailed Settings for Voucher: <span className="font-mono text-blue-700">{rec.pnr || rec.ticketNo || 'Ticket'}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      All changes update live
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                                    
                                    {/* Base Fare */}
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] font-bold text-slate-600">Base Fare (BDT)</label>
                                      <input
                                        type="number"
                                        value={rec.ticketData.baseFare || ''}
                                        placeholder="Base Fare"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'baseFare', e.target.value)}
                                        className="text-xs font-mono border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Tax Amount */}
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] font-bold text-slate-600">Tax Amount (BDT)</label>
                                      <input
                                        type="number"
                                        value={rec.ticketData.tax || ''}
                                        placeholder="Tax"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'tax', e.target.value)}
                                        className="text-xs font-mono border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Flight / Travel Date */}
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] font-bold text-slate-600">Travel Date</label>
                                      <input
                                        type="text"
                                        value={rec.ticketData.flight || rec.travelDate || ''}
                                        placeholder="e.g. 06-Aug-26"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'flight', e.target.value)}
                                        className="text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Return Date */}
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] font-bold text-slate-600">Return Date</label>
                                      <input
                                        type="text"
                                        value={rec.ticketData.returnDate || ''}
                                        placeholder="e.g. 15-Aug-26"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'returnDate', e.target.value)}
                                        className="text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Phone */}
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] font-bold text-slate-600">Phone / Contact</label>
                                      <input
                                        type="text"
                                        value={rec.ticketData.phone || ''}
                                        placeholder="Phone Number"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'phone', e.target.value)}
                                        className="text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Office Payment / Net */}
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] font-bold text-slate-600">Office Payment / Net</label>
                                      <input
                                        type="text"
                                        value={rec.officePayment || rec.ticketData.net || ''}
                                        placeholder="Net Payment"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'net', e.target.value)}
                                        className="text-xs font-mono border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Remarks (Box 1) */}
                                    <div className="flex flex-col gap-0.5 sm:col-span-2">
                                      <label className="text-[10px] font-bold text-slate-600">Remarks (Box 1)</label>
                                      <input
                                        type="text"
                                        value={rec.ticketData.remarks || ''}
                                        placeholder="General ticket remarks"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'remarks', e.target.value)}
                                        className="text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {/* Box 2 Remarks */}
                                    <div className="flex flex-col gap-0.5 sm:col-span-2">
                                      <label className="text-[10px] font-bold text-slate-600">Office Remarks (Box 2)</label>
                                      <input
                                        type="text"
                                        value={rec.ticketData.box2Remarks || ''}
                                        placeholder="Accounting / office remarks"
                                        onChange={(e) => handleUpdateRecordField(rec.id, 'box2Remarks', e.target.value)}
                                        className="text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                      />
                                    </div>

                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Upload or paste CSV content above to preview and create vouchers with interactive column mapping.
              </span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-700">
              {selectedIds.size} of {records.length} Vouchers Selected
            </span>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                  Total Sales: ৳ {totalSelectedSales.toLocaleString()}
                </span>
                <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                  Total Gross: ৳ {totalSelectedGross.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all"
            >
              Cancel
            </button>

            {records.length > 0 && (
              <>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleLoadFirstSelectedIntoForm}
                    className="px-3 py-2 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 border border-blue-300 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                    title="Load first selected voucher into active editor"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Load
                  </button>
                )}

                {selectedIds.size > 0 && selectedIds.size < records.length && (
                  <button
                    onClick={handleBatchSave}
                    disabled={isSaving}
                    className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-400"
                  >
                    {isSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-slate-300" />
                        Save Selected ({selectedIds.size})
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-400"
                  title="Save all parsed vouchers directly to history"
                >
                  {isSaving ? (
                    <span>Saving All Vouchers...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-white" />
                      Save All Vouchers ({records.length})
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
