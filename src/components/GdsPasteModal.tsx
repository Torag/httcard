import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  Sparkles, 
  Check, 
  X, 
  Plane, 
  Ticket, 
  DollarSign, 
  ArrowRight, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { TicketData } from '../types';
import { parseGdsText, SAMPLE_GDS_TEXT, GdsParsedResult } from '../utils/gdsParser';

interface GdsPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedTicket: (updatedFields: Partial<TicketData>) => void;
  currentTicket: TicketData;
}

export function GdsPasteModal({
  isOpen,
  onClose,
  onApplyParsedTicket,
  currentTicket,
}: GdsPasteModalProps) {
  const [rawText, setRawText] = useState<string>('');

  const parsed: GdsParsedResult = useMemo(() => {
    return parseGdsText(rawText);
  }, [rawText]);

  if (!isOpen) return null;

  const handleApply = () => {
    const paxNames = [...(currentTicket.paxNames || ['', '', '', ''])];
    if (parsed.passengerNames.length > 0) {
      parsed.passengerNames.forEach((name, i) => {
        if (i < 4) paxNames[i] = name;
      });
    }

    const updates: Partial<TicketData> = {};

    if (parsed.pnr) updates.pnr = parsed.pnr;
    if (parsed.ticketNo) updates.ticketNo = parsed.ticketNo;
    if (parsed.carrier) updates.carrier = parsed.carrier;
    if (parsed.sectors) updates.sectors = parsed.sectors;
    if (parsed.flight) updates.flight = parsed.flight;
    if (parsed.baseFare) updates.baseFare = parsed.baseFare;
    if (parsed.tax) updates.tax = parsed.tax;
    if (parsed.gross) updates.gross = parsed.gross;
    if (parsed.salesAmount) updates.salesAmount = parsed.salesAmount;
    if (parsed.co) updates.co = parsed.co;
    if (parsed.remarks) updates.remarks = parsed.remarks;
    if (parsed.date) updates.date = parsed.date;

    if (parsed.passengerNames.length > 0) {
      updates.paxNames = paxNames;
      updates.customerName = parsed.passengerNames[0];
      updates.pax = parsed.passengerNames.length.toString();
    }

    onApplyParsedTicket(updates);
    onClose();
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_GDS_TEXT);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight text-white flex items-center gap-2">
                Quick Paste GDS / Terminal PNR Text
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Instant extraction from Sabre, Amadeus, Galileo, Biman, or airline confirmation text
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

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 bg-slate-50">
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Paste Raw PNR Text Below:
            </label>
            <button
              onClick={handleLoadSample}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Load Sample Terminal Text
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste Sabre (*A/*P), Amadeus (RT), Galileo (*ALL) or airline text here...\n\nExample:\n1.1RAHMAN/MOSTAFIZUR MR\n1 BG 022 Y 06AUG CGPDAC HK1\nFA PAX 997-4883754463\nTOTAL BDT 9249`}
            rows={6}
            className="w-full font-mono text-xs p-3.5 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none leading-relaxed text-slate-900 shadow-2xs"
          />

          {/* Live Extraction Preview */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Live Extracted Data Preview:
            </span>

            {parsed.rawMatchedLines.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {/* PNR & Airline */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">PNR & Airline</span>
                  <div className="text-sm font-bold text-blue-700 font-mono">
                    {parsed.pnr || <span className="text-slate-400">Not detected</span>}
                    {parsed.carrier && <span className="ml-2 text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">AIR: {parsed.carrier}</span>}
                  </div>
                </div>

                {/* Passenger */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Passenger(s) ({parsed.passengerNames.length})</span>
                  <div className="text-xs font-bold text-slate-800 truncate" title={parsed.passengerNames.join(', ')}>
                    {parsed.passengerNames.length > 0 ? parsed.passengerNames.join(', ') : <span className="text-slate-400">Not detected</span>}
                  </div>
                </div>

                {/* Ticket Number */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ticket Number</span>
                  <div className="text-xs font-bold text-slate-800 font-mono truncate" title={parsed.ticketNo}>
                    {parsed.ticketNo || <span className="text-slate-400">Not detected</span>}
                  </div>
                </div>

                {/* Route & Flight */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Route / Flight</span>
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {parsed.sectors || <span className="text-slate-400">Not detected</span>}
                  </div>
                  {parsed.flight && <span className="text-[10px] text-slate-500">{parsed.flight}</span>}
                </div>

                {/* Fares */}
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Fare / Sales Amount</span>
                  <div className="text-sm font-bold text-amber-950 font-mono">
                    {parsed.gross ? `৳ ${parseInt(parsed.gross).toLocaleString()}` : <span className="text-slate-400">Not detected</span>}
                  </div>
                  {parsed.baseFare && <span className="text-[10px] text-amber-700">Base: ৳ {parsed.baseFare} | Tax: ৳ {parsed.tax || '0'}</span>}
                </div>

                {/* C/O & Remarks */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">C/O & Remarks</span>
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {parsed.co || parsed.remarks || <span className="text-slate-400">-</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3.5 bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Paste terminal text above. The parser will instantly identify PNR, passengers, tickets, and fares.</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {parsed.rawMatchedLines.length} field(s) identified
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={parsed.rawMatchedLines.length === 0}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Apply to Voucher Editor
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
