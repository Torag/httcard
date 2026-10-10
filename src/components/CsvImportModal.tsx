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
  DollarSign
} from 'lucide-react';
import { TicketData } from '../types';
import { 
  parseCsvToRecords, 
  extractCsvHeaders,
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
  const [selectedSalesCol, setSelectedSalesCol] = useState<string>('');
  const [customMarkup, setCustomMarkup] = useState<string>('');

  // Extract detected headers from uploaded or pasted CSV
  const detectedHeaders = useMemo(() => {
    return extractCsvHeaders(rawCsvText);
  }, [rawCsvText]);

  // Identify if an explicit SALES AMOUNT (BDT) column exists
  const autoDetectedSalesCol = useMemo(() => {
    if (!detectedHeaders.length) return null;
    const candidates = [
      'sales amount (bdt)',
      'sales amount bdt',
      'sales amount',
      'sales (bdt)',
      'sales bdt',
      'sales amt',
      'sales_amount_bdt',
      'sales_amount',
      'sale amount (bdt)',
      'sale amount bdt',
      'sale amount',
      'sale amt',
      'selling price (bdt)',
      'selling price',
      'selling amount (bdt)',
      'selling amount',
      'sales',
      'sale',
      'client fare',
      'customer fare'
    ];
    return detectedHeaders.find(h => candidates.includes(h.trim().toLowerCase())) || null;
  }, [detectedHeaders]);

  // Parse CSV text whenever text, grouping, or sales amount import options change
  useEffect(() => {
    if (rawCsvText.trim()) {
      const parsed = parseCsvToRecords(rawCsvText, {
        groupByPnr,
        logo: currentLogo,
        signature: currentSignature,
        salesAmountColumn: selectedSalesCol,
        salesAmountMode: salesAmountMode,
        customMarkupBDT: customMarkup,
      });
      setRecords(parsed);
      setSelectedIds(new Set(parsed.map(r => r.id)));
    } else {
      setRecords([]);
      setSelectedIds(new Set());
    }
  }, [rawCsvText, groupByPnr, currentLogo, currentSignature, selectedSalesCol, salesAmountMode, customMarkup]);

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
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
                Upload or paste your flight ticket manifest with SALES AMOUNT (BDT) field support
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
                  Supports headers: Issue Date, PNR, Name, Ticket Number, Sales Amount (BDT), Total Fare, etc.
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

          {/* SALES AMOUNT (BDT) Import Options Section */}
          {records.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Sales Amount (BDT) Field Options
                  </span>
                </div>
                {autoDetectedSalesCol && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Detected Column: &quot;{autoDetectedSalesCol}&quot;
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                
                {/* Column Mapping Selector */}
                <div className="md:col-span-4 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-amber-900 uppercase">
                    CSV Field for Sales Amount
                  </label>
                  <select
                    value={selectedSalesCol}
                    onChange={(e) => setSelectedSalesCol(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">
                      Auto-Detect {autoDetectedSalesCol ? `("${autoDetectedSalesCol}")` : '(SALES AMOUNT BDT)'}
                    </option>
                    {detectedHeaders.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calculation / Source Mode */}
                <div className="md:col-span-8 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-amber-900 uppercase">
                    Sales Amount Import Strategy
                  </label>
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
                          className="w-20 text-xs font-mono font-bold outline-none text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Grouping Options */}
          {records.length > 0 && (
            <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Voucher Passenger Grouping:</span>
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
                  <span>1 Voucher per Line (Individual)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="grouping"
                    checked={groupByPnr}
                    onChange={() => setGroupByPnr(true)}
                    className="accent-blue-600"
                  />
                  <span>Group Passengers by PNR (Max 4/Voucher)</span>
                </label>
              </div>
            </div>
          )}

          {/* Parsed Vouchers Preview Table */}
          {records.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  Parsed Vouchers ({records.length})
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({selectedIds.size} selected)
                  </span>
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  {selectedIds.size === records.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <button onClick={handleSelectAll}>
                          {selectedIds.size === records.length ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-2.5">PNR & Date</th>
                      <th className="p-2.5">Passenger Name(s)</th>
                      <th className="p-2.5">Ticket No & Carrier</th>
                      <th className="p-2.5">Route</th>
                      <th className="p-2.5 text-right bg-amber-100/70 text-amber-900 border-x border-amber-200/80">
                        Sales Amount (BDT)
                      </th>
                      <th className="p-2.5 text-right">Total Fare (BDT)</th>
                      <th className="p-2.5 text-center">Pricing Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {records.map((rec) => {
                      const isSelected = selectedIds.has(rec.id);
                      const salesVal = parseFloat(rec.ticketData.salesAmount) || 0;
                      const grossVal = parseFloat(rec.ticketData.gross) || 0;
                      const margin = salesVal - grossVal;

                      return (
                        <tr 
                          key={rec.id} 
                          onClick={() => handleToggleSelect(rec.id)}
                          className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleToggleSelect(rec.id)}>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-800">{rec.pnr || '-'}</div>
                            <div className="text-[10px] text-slate-500 font-sans">{rec.ticketData.date || rec.issueDate}</div>
                          </td>
                          <td className="p-2.5 font-sans font-bold text-slate-800 max-w-[190px] truncate">
                            {rec.name}
                          </td>
                          <td className="p-2.5">
                            <div className="text-slate-800 truncate max-w-[150px]">{rec.ticketNo || '-'}</div>
                            <div className="text-[10px] text-slate-500 font-sans font-bold">{rec.airCode}</div>
                          </td>
                          <td className="p-2.5 font-sans">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold">
                              {rec.ticketData.sectors || rec.route || '-'}
                            </span>
                          </td>
                          
                          {/* Sales Amount (BDT) column */}
                          <td className="p-2.5 text-right bg-amber-50/50 border-x border-amber-200/60 font-bold text-amber-950">
                            {rec.ticketData.salesAmount ? (
                              <span className="px-2 py-0.5 bg-amber-100/90 text-amber-900 border border-amber-300 rounded font-mono font-bold text-xs inline-block">
                                ৳ {parseInt(rec.ticketData.salesAmount).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* Gross Fare (BDT) column */}
                          <td className="p-2.5 text-right font-bold text-slate-800">
                            {rec.ticketData.gross ? `৳ ${parseInt(rec.ticketData.gross).toLocaleString()}` : '-'}
                          </td>

                          {/* Pricing Rule / Margin badge */}
                          <td className="p-2.5 text-center font-sans">
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
                        </tr>
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
                Upload or paste CSV content above to preview and create vouchers with SALES AMOUNT (BDT).
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
