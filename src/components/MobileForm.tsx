import React, { useRef } from 'react';
import { TicketData } from '../types';
import { DEFAULT_HASNAIN_LOGO } from '../assets/defaultLogo';
import { calculateFareFields } from '../utils/fareCalculator';
import { RotateCcw } from 'lucide-react';

interface MobileFormProps {
  data: TicketData;
  onChange: (data: TicketData) => void;
  onFreshStart?: () => void;
}

export function MobileForm({ data, onChange, onFreshStart }: MobileFormProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof TicketData, value: any) => {
    const updated = calculateFareFields(data, field, value);
    onChange(updated);
  };

  const handlePaxChange = (index: number, value: string) => {
    const updatedPax = [...(data.paxNames || ['', '', '', ''])];
    updatedPax[index] = value.toUpperCase();
    onChange({ ...data, paxNames: updatedPax });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleFieldChange('logo', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleFieldChange('issuerSignature', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="flex flex-col gap-5 p-4 pb-12 w-full bg-slate-50 md:max-w-xl md:mx-auto md:mt-4 md:rounded-2xl md:shadow-xs md:border md:border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-1">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-display">Voucher Editor</h2>
          <p className="text-[11px] text-slate-500 font-medium">Mobile Quick Form</p>
        </div>
        {onFreshStart && (
          <button
            type="button"
            onClick={onFreshStart}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            title="Fresh Start / Reset Form"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fresh Start</span>
          </button>
        )}
      </div>

      {/* Basic Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Basic Header Info</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Logo Customization</label>
            <div className="flex gap-2 items-center">
              <button 
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                Change Logo
              </button>
              {data.logo && data.logo !== DEFAULT_HASNAIN_LOGO && (
                <button 
                  type="button"
                  onClick={() => handleFieldChange('logo', DEFAULT_HASNAIN_LOGO)}
                  className="px-3 py-2 text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                >
                  Reset Default
                </button>
              )}
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Card No</label>
            <input 
              type="text" 
              value={data.cardNo || ''}
              onChange={(e) => handleFieldChange('cardNo', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase bg-slate-50/50 focus:bg-white font-mono font-bold transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Issue Date <span className="text-rose-500">*</span></label>
            <input 
              type="date" 
              value={data.date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              onFocus={handleFocus}
              className={`w-full border rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase transition-all ${!data.date ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50 focus:bg-white'}`}
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Client / M/S</label>
            <input 
              type="text" 
              value={data.co || ''}
              onChange={(e) => handleFieldChange('co', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Remarks</label>
            <input 
              type="text" 
              value={data.remarks || ''}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Phone</label>
            <input 
              type="text" 
              value={data.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Pax <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={data.pax || ''}
              onChange={(e) => handleFieldChange('pax', e.target.value)}
              onFocus={handleFocus}
              className={`w-full border rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase transition-all ${!data.pax ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50 focus:bg-white'}`}
            />
          </div>
        </div>
      </div>

      {/* Passengers Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Passengers</h3>
        {(data.paxNames || ['', '', '', '']).map((pax, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500">Passenger {idx + 1}</label>
            <input 
              type="text" 
              value={pax || ''}
              onChange={(e) => handlePaxChange(idx, e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>
        ))}
      </div>

      {/* Carrier & PNR Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Carrier & PNR</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Carrier</label>
            <input 
              type="text" 
              value={data.carrier || ''}
              onChange={(e) => handleFieldChange('carrier', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase bg-slate-50/50 focus:bg-white transition-all font-bold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">PNR</label>
            <input 
              type="text" 
              value={data.pnr || ''}
              onChange={(e) => handleFieldChange('pnr', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase bg-slate-50/50 focus:bg-white transition-all font-mono font-bold"
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Ticket No <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={data.ticketNo || ''}
              onChange={(e) => handleFieldChange('ticketNo', e.target.value)}
              onFocus={handleFocus}
              className={`w-full border rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase font-mono transition-all ${!data.ticketNo ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50 focus:bg-white'}`}
            />
          </div>
        </div>
      </div>

      {/* Flight Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Flight Info</h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Flight Date</label>
            <input 
              type="date" 
              value={data.flight || ''}
              onChange={(e) => handleFieldChange('flight', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Sectors Description</label>
            <input 
              type="text" 
              value={data.sectors || ''}
              onChange={(e) => handleFieldChange('sectors', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none uppercase bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Return Date / Info</label>
            <input 
              type="date" 
              value={data.returnDate || ''}
              onChange={(e) => handleFieldChange('returnDate', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Financials Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Financial Calculations</h3>
        
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Foreign Currency</label>
            <select 
              value={data.foreignCurrency || 'USD'}
              onChange={(e) => handleFieldChange('foreignCurrency', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all cursor-pointer font-bold"
            >
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="SAR">SAR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Foreign Amount</label>
            <input 
              type="number" 
              value={data.foreignAmount || ''}
              onChange={(e) => handleFieldChange('foreignAmount', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Exchange Rate</label>
            <input 
              type="number" 
              value={data.exchangeRate || ''}
              onChange={(e) => handleFieldChange('exchangeRate', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Base Fare</label>
            <input 
              type="number" 
              value={data.baseFare || ''}
              onChange={(e) => handleFieldChange('baseFare', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tax</label>
            <input 
              type="number" 
              value={data.tax || ''}
              onChange={(e) => handleFieldChange('tax', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Gross Amount</label>
            <input 
              type="number" 
              value={data.gross || ''}
              readOnly
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm bg-slate-100 text-slate-600 font-bold font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Commission</label>
            <input 
              type="number" 
              value={data.commission || ''}
              readOnly
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm bg-slate-100 text-slate-600 font-bold font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">AIT</label>
            <input 
              type="number" 
              value={data.ait || ''}
              readOnly
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm bg-slate-100 text-slate-600 font-bold font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Net Amount</label>
            <input 
              type="number" 
              value={data.net || ''}
              readOnly
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm bg-slate-100 text-slate-600 font-bold font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Contribution Margin</label>
            <input 
              type="number" 
              value={data.contributionMargin || ''}
              onChange={(e) => handleFieldChange('contributionMargin', e.target.value)}
              onFocus={handleFocus}
              className="w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none bg-slate-50/50 focus:bg-white transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={data.keepGrossFare || false}
                onChange={(e) => handleFieldChange('keepGrossFare', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">Keep Sales = Gross Fare?</span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase">Sales Amount</label>
            <input 
              type="number" 
              value={data.salesAmount || ''}
              onChange={(e) => handleFieldChange('salesAmount', e.target.value)}
              onFocus={handleFocus}
              className={`w-full border border-slate-200 rounded-xl h-10 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none font-bold font-mono transition-all ${data.keepGrossFare ? 'bg-slate-100 text-slate-500' : 'bg-slate-50/50 focus:bg-white text-slate-900'}`}
              disabled={data.keepGrossFare}
            />
          </div>
        </div>
      </div>

      {/* Signature Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Authorized Signature</h3>
        <div className="flex gap-2.5 items-center">
          <button 
            type="button"
            onClick={() => sigInputRef.current?.click()}
            className="px-3.5 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            Upload Signature
          </button>
          {data.issuerSignature && (
            <button 
              type="button"
              onClick={() => handleFieldChange('issuerSignature', '')}
              className="px-3 py-2 text-xs text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              Remove
            </button>
          )}
          <input type="file" ref={sigInputRef} onChange={handleSignatureUpload} accept="image/*" className="hidden" />
        </div>
      </div>
      
    </div>
  );
}
