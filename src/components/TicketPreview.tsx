import React, { useRef, useEffect } from 'react';
import { TicketData } from '../types';
import { DEFAULT_HASNAIN_LOGO } from '../assets/defaultLogo';
import { calculateFareFields } from '../utils/fareCalculator';

interface TicketPreviewProps {
  data: TicketData;
  scale?: number; // Zoom scale for on-screen viewing
  isPrinting?: boolean;
  onChange?: (updatedData: TicketData) => void;
}

export const TicketPreview: React.FC<TicketPreviewProps> = ({
  data,
  scale = 1,
  isPrinting = false,
  onChange,
}) => {
  const sigInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleFieldChange('issuerSignature', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Automatically generate unique 6-digit cardNo on load if it is missing
  useEffect(() => {
    if (!data.cardNo && onChange) {
      onChange({
        ...data,
        cardNo: Math.floor(100000 + Math.random() * 900000).toString(),
      });
    }
  }, [data.cardNo, onChange]);

  // Helpers to update fields
  const handleFieldChange = (field: keyof TicketData, value: any) => {
    if (onChange) {
      const updated = calculateFareFields(data, field, value);
      onChange(updated);
    }
  };

  const handlePaxChange = (index: number, value: string) => {
    if (onChange) {
      const updatedPax = [...(data.paxNames || ['', '', '', ''])];
      updatedPax[index] = value.toUpperCase(); // Ticket passenger names are uppercase
      onChange({
        ...data,
        paxNames: updatedPax,
      });
    }
  };

  const renderValue = (val: string) => val || '';

  const renderFormattedDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const formatPrintCurrency = (val: string) => {
    if (!val) return '';
    const parsed = parseFloat(val);
    return isNaN(parsed) ? val : parsed.toLocaleString();
  };

  // Render a beautifully styled SVG logo or the custom uploaded logo, with Card No on the top left above the first box
  const LogoSection = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            handleFieldChange('logo', event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const triggerFileSelect = () => {
      if (!isPrinting) {
        fileInputRef.current?.click();
      }
    };

    const handleResetLogo = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleFieldChange('logo', DEFAULT_HASNAIN_LOGO);
    };

    let displayLogo = data.logo || DEFAULT_HASNAIN_LOGO;
    if (displayLogo && displayLogo.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA4AAAAEICAIAAACB')) {
      displayLogo = DEFAULT_HASNAIN_LOGO;
    }

    return (
      <div className="w-full flex flex-col select-none shrink-0 group pt-6">
        
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleLogoUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Centered logo container */}
        <div className="flex justify-center w-full mb-2 z-10">
          <div 
            onClick={triggerFileSelect}
            className={`relative flex items-center justify-center gap-2.5 bg-white px-2 py-1 transition-all ${
              !isPrinting 
                ? 'cursor-pointer hover:scale-[1.02] hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg' 
                : ''
            }`}
            title={!isPrinting ? "Click to change logo" : undefined}
          >
            {displayLogo ? (
              <div className="flex items-center gap-3">
                <img 
                  src={displayLogo} 
                  alt="Hasnain Travels Logo" 
                  className="h-24 max-w-[320px] object-contain"
                  referrerPolicy="no-referrer"
                />
                {!isPrinting && data.logo && data.logo !== DEFAULT_HASNAIN_LOGO && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 hover:border-red-200 transition-all shadow-xs"
                    title="Reset to default Hasnain Travels logo"
                  >
                    Reset Default
                  </button>
                )}
              </div>
            ) : null}

            {/* Quick upload tooltip (non-printing only) */}
            {!isPrinting && !data.logo && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm pointer-events-none tracking-wider">
                CLICK TO UPLOAD CUSTOM LOGO
              </div>
            )}
          </div>
        </div>

        {/* ISSUE DATE and CARD NO Row with divider behind */}
        <div className="relative w-full flex items-center justify-between pb-2">
          {/* Horizontal divider line */}
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-300" />
          </div>

          {/* ISSUE DATE ON THE TOP LEFT */}
          <div className="flex items-center gap-2 bg-white pr-4 z-10 select-none shrink-0">
            <span className="text-[10px] font-black text-slate-800 font-display tracking-wider uppercase">
              ISSUE DATE <span className="text-red-500 font-bold">*</span> :
            </span>
            {!isPrinting ? (
              <input
                type="date"
                value={data.date || ''}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className={`border focus:border-blue-500 rounded-md h-6 w-32 text-center text-xs font-mono font-bold text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all cursor-pointer ${
                  !data.date ? 'border-red-400 bg-red-50' : 'border-slate-300'
                }`}
              />
            ) : (
              <span className="text-xs font-mono font-bold text-slate-950 tracking-wider">
                {renderFormattedDate(data.date)}
              </span>
            )}
          </div>

          {/* CARD NO ON THE TOP RIGHT */}
          <div className="flex items-center gap-2 bg-white pl-4 z-10 select-none shrink-0">
            <span className="text-[10px] font-black text-slate-800 font-display tracking-wider uppercase">CARD NO :</span>
            {!isPrinting ? (
              <input
                type="text"
                maxLength={12}
                value={data.cardNo || ''}
                onChange={(e) => handleFieldChange('cardNo', e.target.value)}
                className="border border-slate-300 focus:border-blue-500 rounded-md h-6 w-24 text-center text-sm font-mono font-bold text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all"
                placeholder=""
              />
            ) : (
              <span className="text-sm font-mono font-bold text-slate-950 tracking-wider">
                {data.cardNo || '000000'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="ticket-a4-sheet"
      className={`bg-white print-container flex flex-col justify-between ${
        !isPrinting ? 'shadow-2xl border border-gray-300' : 'border-none shadow-none'
      }`}
      style={{
        width: '794px',
        height: '1123px',
        transform: isPrinting ? 'none' : `scale(${scale})`,
        transformOrigin: 'top center',
        padding: '45px 45px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. TOP PORTION (FIRST BOX) */}
      <div className="flex flex-col h-[132mm] justify-start gap-2.5 relative">
        <LogoSection />

        {/* Outer Box 1 */}
        <div className="border border-black p-3.5 flex flex-col justify-between h-[105mm] relative bg-white">
          
          {/* Upper row: Pax names & Metadata */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* LEFT COLUMN: Passenger List (Cols 1-7) */}
            <div className="col-span-7 flex flex-col gap-1.5">
              <div className="flex items-center text-[10px] font-bold font-display select-none pb-0.5 px-1">
                <div className="w-8 text-black text-center shrink-0">SL.</div>
                <div className="flex-grow text-black text-center">PASSENGER NAME</div>
              </div>

              {/* PAX Input fields (4 slots exactly like reference image) */}
              <div className="flex flex-col gap-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-8 text-xs font-mono font-bold text-black text-center shrink-0">{idx + 1}</div>
                    <div className="flex-grow">
                      {isPrinting ? (
                        <div className="border border-black rounded-md h-7 px-2.5 flex items-center justify-center text-center text-xs font-mono font-medium text-black bg-white select-all">
                          {renderValue((data.paxNames || ['', '', '', ''])[idx])}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={(data.paxNames || ['', '', '', ''])[idx] || ''}
                          onChange={(e) => handlePaxChange(idx, e.target.value)}
                          className="border border-black focus:border-blue-500 rounded-md h-7 px-2.5 w-full text-center text-xs font-mono font-medium text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all uppercase"
                          placeholder=""
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Metadata (Cols 8-12) */}
            <div className="col-span-5 flex flex-col gap-1.5">
              
              {/* Carrier */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0">
                  CARRIER <span className="text-red-500 font-bold">*</span> :
                </span>
                {isPrinting ? (
                  <div className="border border-black rounded-md h-7 px-2 flex-grow flex items-center justify-center text-center text-xs font-mono font-semibold text-black bg-white">
                    {renderValue(data.carrier)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.carrier || ''}
                    onChange={(e) => handleFieldChange('carrier', e.target.value)}
                    className={`border focus:border-blue-500 rounded-md h-7 px-2 flex-grow text-center text-xs font-mono font-semibold text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all ${
                      !data.carrier ? 'border-red-400 bg-red-50' : 'border-black'
                    }`}
                    placeholder=""
                  />
                )}
              </div>

              {/* C/O */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0">
                  C/O <span className="text-red-500 font-bold">*</span> :
                </span>
                {isPrinting ? (
                  <div className="border border-black rounded-md h-7 px-2 flex-grow flex items-center justify-center text-center text-xs font-mono text-black bg-white truncate">
                    {renderValue(data.co)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.co || ''}
                    onChange={(e) => handleFieldChange('co', e.target.value)}
                    className={`border focus:border-blue-500 rounded-md h-7 px-2 flex-grow text-center text-xs font-mono text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all ${
                      !data.co ? 'border-red-400 bg-red-50' : 'border-black'
                    }`}
                    placeholder=""
                  />
                )}
              </div>

              {/* Remarks */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0">
                  REMARKS :
                </span>
                {isPrinting ? (
                  <div className="border border-black rounded-md h-7 px-2 flex-grow flex items-center justify-center text-center text-xs font-mono text-black bg-white truncate">
                    {renderValue(data.remarks)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.remarks || ''}
                    onChange={(e) => handleFieldChange('remarks', e.target.value)}
                    className="border border-black focus:border-blue-500 rounded-md h-7 px-2 flex-grow text-center text-xs font-mono text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all"
                    placeholder=""
                  />
                )}
              </div>

              {/* PNR */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0">
                  PNR <span className="text-red-500 font-bold">*</span> :
                </span>
                {isPrinting ? (
                  <div className="border border-black rounded-md h-7 px-2 flex-grow flex items-center justify-center text-center text-xs font-mono font-bold tracking-wider text-black bg-white">
                    {renderValue(data.pnr)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.pnr || ''}
                    onChange={(e) => handleFieldChange('pnr', e.target.value.toUpperCase())}
                    className={`border focus:border-blue-500 rounded-md h-7 px-2 flex-grow text-center text-xs font-mono font-bold tracking-wider text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all uppercase ${
                      !data.pnr ? 'border-red-400 bg-red-50' : 'border-black'
                    }`}
                    placeholder=""
                  />
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0">PHONE :</span>
                {isPrinting ? (
                  <div className="border border-black rounded-md h-7 px-2 flex-grow flex items-center justify-center text-center text-xs font-mono text-black bg-white truncate">
                    {renderValue(data.phone)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="border border-black focus:border-blue-500 rounded-md h-7 px-2 flex-grow text-center text-xs font-mono text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all"
                    placeholder=""
                  />
                )}
              </div>

              {/* PAX */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0">PAX <span className="text-red-500 font-bold">*</span> :</span>
                {isPrinting ? (
                  <div className="border border-black rounded-md h-7 px-2 flex-grow flex items-center justify-center text-center text-xs font-mono font-bold text-black bg-white">
                    {renderValue(data.pax)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.pax || ''}
                    onChange={(e) => handleFieldChange('pax', e.target.value.toUpperCase())}
                    className={`border focus:border-blue-500 rounded-md h-7 px-2 flex-grow text-center text-xs font-mono font-bold text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all uppercase ${!data.pax ? 'border-red-400 bg-red-50' : 'border-black'}`}
                    placeholder=""
                  />
                )}
              </div>
            </div>

          </div>

          {/* Middle row: Appropriate Sized Flight, Sector, Return Boxes */}
          <div className="grid grid-cols-12 gap-3 mt-1.5">
            
            {/* Flight Date Column */}
            <div className="col-span-3 flex flex-col gap-1">
              <span className="text-[9px] font-bold font-display text-black select-none tracking-wide text-center">
                FLIGHT DATE <span className="text-red-500 font-bold">*</span>
              </span>
              {isPrinting ? (
                <div className="border border-black rounded-md h-7 flex items-center justify-center text-center bg-white text-xs font-mono font-bold text-black uppercase">
                  {renderFormattedDate(data.flight)}
                </div>
              ) : (
                <input
                  type="date"
                  value={data.flight || ''}
                  onChange={(e) => handleFieldChange('flight', e.target.value)}
                  className={`border focus:border-blue-500 rounded-md h-7 px-2 text-center text-xs font-mono font-bold text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none cursor-pointer w-full ${
                    !data.flight ? 'border-red-400 bg-red-50' : 'border-black'
                  }`}
                />
              )}
            </div>

            {/* Sectors Description Column (Expanded to col-span-6) */}
            <div className="col-span-6 flex flex-col gap-1">
              <span className="text-[9px] font-bold font-display text-black select-none tracking-wide text-center">
                SECTORS DESCRIPTION <span className="text-red-500 font-bold">*</span>
              </span>
              {isPrinting ? (
                <div className="border border-black rounded-md px-2.5 h-7 flex items-center justify-center text-center bg-white text-xs font-mono text-black truncate">
                  {renderValue(data.sectors)}
                </div>
              ) : (
                <input
                  type="text"
                  value={data.sectors || ''}
                  onChange={(e) => handleFieldChange('sectors', e.target.value)}
                  className={`border focus:border-blue-500 rounded-md h-7 px-3 text-center text-xs font-mono text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none w-full ${
                    !data.sectors ? 'border-red-400 bg-red-50' : 'border-black'
                  }`}
                  placeholder=""
                />
              )}
            </div>

            {/* Return Date Column */}
            <div className="col-span-3 flex flex-col gap-1">
              <span className="text-[9px] font-bold font-display text-black select-none tracking-wide text-center">RETURN DATE</span>
              {isPrinting ? (
                <div className="border border-black rounded-md h-7 flex items-center justify-center text-center bg-white text-xs font-mono font-bold text-black uppercase">
                  {renderFormattedDate(data.returnDate)}
                </div>
              ) : (
                <input
                  type="date"
                  value={data.returnDate || ''}
                  onChange={(e) => handleFieldChange('returnDate', e.target.value)}
                  className="border border-black focus:border-blue-500 rounded-md h-7 px-2 text-center text-xs font-mono font-bold text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none cursor-pointer w-full"
                />
              )}
            </div>

          </div>

          {/* Bottom row: Ticket Number */}
          <div className="flex items-center gap-3 mt-2 select-none">
            <span className="text-[10px] font-bold text-black font-display shrink-0">TICKET NO. <span className="text-red-500 font-bold">*</span> :</span>
            {isPrinting ? (
              <div className="border border-black rounded-md h-7 px-3 flex-grow flex items-center justify-start text-left text-xs font-mono font-semibold tracking-wider text-black bg-white">
                {renderValue(data.ticketNo)}
              </div>
            ) : (
              <input
                type="text"
                value={data.ticketNo || ''}
                onChange={(e) => handleFieldChange('ticketNo', e.target.value)}
                className={`border focus:border-blue-500 rounded-md h-7 px-3 flex-grow text-left text-xs font-mono font-semibold tracking-wider text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none ${!data.ticketNo ? 'border-red-400 bg-red-50' : 'border-black'}`}
                placeholder=""
              />
            )}
          </div>
          
          {/* Subtle Watermark inside Box 1 */}
          <div className="absolute right-4 bottom-14 opacity-[0.02] select-none pointer-events-none">
            <span className="font-display font-black text-4xl tracking-widest text-black">HASNAIN</span>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL LINE ON THE MIDDLE OF THE PAGE (A4 fold/cut indicator) */}
      <div className="relative w-full flex items-center justify-center select-none py-1.5">
        <div className="w-full border-t-2 border-dashed border-gray-400" />
        <span className="absolute right-6 text-[8px] font-mono uppercase tracking-widest text-gray-400 bg-white px-2">
          ✂️ Fold or Cut Line (Middle of A4 Page)
        </span>
      </div>

      {/* 3. BOTTOM PORTION (SECOND BOX UNDER THE LINE) */}
      <div className="flex flex-col h-[132mm] justify-start gap-4 relative">
        
        {/* Modern, Highly Professional Unified Financial Ledger Grid */}
        <div className="border border-black bg-white grid grid-cols-4 select-none mt-3 rounded-md overflow-hidden">
          
          {/* Row 1, Col 1: Foreign Currency Selection */}
          <div className="border-r border-b border-black flex flex-col bg-slate-50">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-slate-800 tracking-wider uppercase text-center w-full">
              AED / USD / SAR
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              {!isPrinting ? (
                <select
                  value={data.foreignCurrency || 'USD'}
                  onChange={(e) => handleFieldChange('foreignCurrency', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-black outline-none cursor-pointer text-center"
                  style={{ textAlignLast: 'center' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED (Dh)</option>
                  <option value="SAR">SAR (SR)</option>
                </select>
              ) : (
                <div className="w-full text-xs font-mono font-bold text-black text-center uppercase">
                  {renderValue(data.foreignCurrency || 'USD')}
                </div>
              )}
            </div>
          </div>

          {/* Row 1, Col 2: Foreign Currency Amount */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-slate-800 tracking-wider uppercase text-center w-full">
              FOREIGN AMOUNT
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              {!isPrinting ? (
                <input
                  type="text"
                  value={data.foreignAmount || ''}
                  onChange={(e) => handleFieldChange('foreignAmount', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-black outline-none placeholder:text-slate-300 text-center"
                  placeholder=""
                />
              ) : (
                <div className="w-full text-xs font-mono font-bold text-black text-center">
                  {data.foreignAmount ? formatPrintCurrency(data.foreignAmount) : '-'}
                </div>
              )}
            </div>
          </div>

          {/* Row 1, Col 3: Exchange Rate */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-slate-800 tracking-wider uppercase text-center w-full">
              EXCHANGE RATE
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              {!isPrinting ? (
                <input
                  type="text"
                  value={data.exchangeRate || ''}
                  onChange={(e) => handleFieldChange('exchangeRate', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-black outline-none placeholder:text-slate-300 text-center"
                  placeholder=""
                />
              ) : (
                <div className="w-full text-xs font-mono font-bold text-black text-center">
                  {data.exchangeRate ? formatPrintCurrency(data.exchangeRate) : '-'}
                </div>
              )}
            </div>
          </div>

          {/* Row 1, Col 4: Conversion Formula Info */}
          <div className="border-b border-black flex flex-col bg-slate-50">
            <div className="bg-slate-200 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-slate-800 tracking-wider uppercase text-center w-full">
              CONVERSION SUMMARY
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-slate-50 text-[10px] font-mono text-slate-700 text-center">
              {data.foreignAmount && data.exchangeRate ? (
                <div className="w-full text-center text-[10px]">
                  <span className="font-bold text-slate-950">
                    {Math.round(
                      (parseFloat(data.foreignAmount) || 0) * (parseFloat(data.exchangeRate) || 0) * 1.003
                    ).toLocaleString()}{' '}
                    BDT
                  </span>
                  <span className="text-[7px] text-slate-500 block leading-none mt-0.5">(RATE*AMT + 0.3%)</span>
                </div>
              ) : (
                <div className="w-full text-center text-[8px] italic text-slate-500 font-sans tracking-wide uppercase">
                  Rate * Amount + 0.3% → Net
                </div>
              )}
            </div>
          </div>

          {/* Row 2, Col 1: Base Fare */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-black tracking-wider uppercase text-center w-full">
              BASE FARE (BDT)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              {!isPrinting ? (
                <input
                  type="text"
                  value={data.baseFare || ''}
                  onChange={(e) => handleFieldChange('baseFare', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-black outline-none placeholder:text-slate-300 text-center"
                  placeholder=""
                />
              ) : (
                <div className="w-full text-xs font-mono font-bold text-black text-center">
                  {formatPrintCurrency(data.baseFare)}
                </div>
              )}
            </div>
          </div>

          {/* Row 2, Col 2: Tax */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-black tracking-wider uppercase text-center w-full">
              TAX (BDT)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              {!isPrinting ? (
                <input
                  type="text"
                  value={data.tax || ''}
                  onChange={(e) => handleFieldChange('tax', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-black outline-none placeholder:text-slate-300 text-center"
                  placeholder=""
                />
              ) : (
                <div className="w-full text-xs font-mono font-bold text-black text-center">
                  {formatPrintCurrency(data.tax)}
                </div>
              )}
            </div>
          </div>

          {/* Row 2, Col 3: Commission */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-black tracking-wider uppercase text-center w-full">
              COMMISSION (7%)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              <div className="w-full text-xs font-mono font-bold text-black text-center">
                {formatPrintCurrency(data.commission)}
              </div>
            </div>
          </div>

          {/* Row 2, Col 4: Net Amount */}
          <div className="border-b border-black flex flex-col bg-blue-50">
            <div className="bg-blue-100 border-b border-blue-200 px-2.5 py-1 text-[8px] font-bold text-blue-900 tracking-wider uppercase text-center w-full">
              NET AMOUNT (BDT)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-blue-50">
              <div className="w-full text-xs font-mono font-bold text-blue-800 text-center">
                {formatPrintCurrency(data.net)}
              </div>
            </div>
          </div>

          {/* Row 3, Col 1: Sales Amount */}
          <div className="border-r border-black flex flex-col bg-amber-50">
            <div className="bg-amber-100 border-b border-amber-200 px-2.5 py-1 flex items-center justify-between">
              <span className="text-[8px] font-bold text-amber-900 tracking-wider uppercase flex-grow text-center ml-4">
                SALES AMOUNT (BDT)
              </span>
              {!isPrinting && (
                <label className="flex items-center gap-1 cursor-pointer select-none shrink-0" title="Check to force sales amount equal to base fare + tax">
                  <input
                    type="checkbox"
                    checked={data.keepGrossFare || false}
                    onChange={(e) => handleFieldChange('keepGrossFare', e.target.checked)}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span className="text-[7px] font-black text-blue-700 tracking-wide uppercase mr-1">
                    GROSS
                  </span>
                </label>
              )}
              {isPrinting && data.keepGrossFare && (
                <span className="text-[7px] font-bold text-blue-700 uppercase tracking-wide mr-1 shrink-0">
                  (LOCKED)
                </span>
              )}
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-amber-50">
              {!isPrinting && !data.keepGrossFare ? (
                <input
                  type="text"
                  value={data.salesAmount || ''}
                  onChange={(e) => handleFieldChange('salesAmount', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-amber-800 outline-none placeholder:text-slate-300 text-center"
                  placeholder=""
                />
              ) : (
                <div className={`w-full text-xs font-mono font-bold text-center ${data.keepGrossFare ? 'text-blue-700 font-black' : 'text-amber-800'}`}>
                  {formatPrintCurrency(data.salesAmount)}
                </div>
              )}
            </div>
          </div>

          {/* Row 3, Col 2: Gross Fare */}
          <div className="border-r border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-black tracking-wider uppercase text-center w-full">
              GROSS FARE (BDT)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              <div className="w-full text-xs font-mono font-bold text-black text-center">
                {formatPrintCurrency(data.gross)}
              </div>
            </div>
          </div>

          {/* Row 3, Col 3: AIT */}
          <div className="border-r border-black flex flex-col">
            <div className="bg-slate-100 border-b border-gray-300 px-2.5 py-1 text-[8px] font-bold text-black tracking-wider uppercase text-center w-full">
              AIT (0.3%)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-white">
              <div className="w-full text-xs font-mono font-bold text-black text-center">
                {formatPrintCurrency(data.ait)}
              </div>
            </div>
          </div>

          {/* Row 3, Col 4: Contribution Margin */}
          <div className="flex flex-col bg-emerald-50">
            <div className="bg-emerald-100 border-b border-emerald-200 px-2.5 py-1 text-[8px] font-bold text-emerald-900 tracking-wider uppercase text-center w-full">
              CONTRIBUTION MARGIN (BDT)
            </div>
            <div className="h-11 px-2.5 flex items-center justify-center bg-emerald-50">
              {!isPrinting ? (
                <input
                  type="text"
                  value={data.contributionMargin || ''}
                  onChange={(e) => handleFieldChange('contributionMargin', e.target.value)}
                  className="w-full h-full bg-transparent text-xs font-mono font-bold text-emerald-800 outline-none placeholder:text-slate-300 text-center"
                  placeholder=""
                />
              ) : (
                <div className="w-full text-xs font-mono font-bold text-emerald-800 text-center">
                  {formatPrintCurrency(data.contributionMargin || '0')}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Remarks Box in Second Box */}
        <div className="flex items-start gap-2 mt-4 px-2">
          <span className="w-16 text-[9px] font-bold text-black font-display text-right shrink-0 mt-2">
            REMARKS :
          </span>
          {isPrinting ? (
            <div className="border border-black rounded-md min-h-[1.75rem] px-2 py-1 flex-grow text-left text-xs font-mono text-black bg-white whitespace-pre-wrap break-words">
              {renderValue(data.box2Remarks)}
            </div>
          ) : (
            <textarea
              value={data.box2Remarks || ''}
              onChange={(e) => handleFieldChange('box2Remarks', e.target.value)}
              className="border border-black focus:border-blue-500 rounded-md min-h-[1.75rem] px-2 py-1 flex-grow text-left text-xs font-mono text-black bg-slate-50 hover:bg-blue-50 focus:bg-white outline-none transition-all resize-none overflow-hidden"
              rows={Math.max(1, (data.box2Remarks || '').split('\n').length)}
              placeholder=""
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
            />
          )}
        </div>

        {/* Elegant Signatures Area */}
        <div className="flex justify-between items-end mt-12 mb-4 px-8 w-full select-none">
          {/* Bottom Left: Authorized Signature */}
          <div className="flex flex-col items-center">
            {/* Uploaded signature image if exists */}
            {data.issuerSignature ? (
              <div className="relative flex flex-col items-center mb-1 group">
                <img
                  src={data.issuerSignature}
                  alt="Authorized Signature"
                  className="h-10 max-w-[160px] object-contain select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                {!isPrinting && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange('issuerSignature', '')}
                    className="absolute -top-2 -right-6 bg-red-100 hover:bg-red-200 text-red-600 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-red-200 shadow-sm transition-all"
                    title="Remove signature"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              !isPrinting && (
                <button
                  type="button"
                  onClick={() => sigInputRef.current?.click()}
                  className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded px-2.5 py-1 mb-2.5 tracking-wide uppercase transition-all"
                >
                  ✍️ Upload Signature
                </button>
              )
            )}
            
            <input 
              type="file" 
              ref={sigInputRef} 
              onChange={handleSignatureUpload} 
              accept="image/*" 
              className="hidden" 
            />

            <div className="border-b border-black w-48 pb-1 h-5 flex items-center justify-center text-center text-xs font-mono font-bold text-slate-800 uppercase" />
            <span className="text-[9px] font-bold text-slate-600 font-display mt-2 uppercase tracking-widest text-center">
              AUTHORIZED SIGNATURE
            </span>
          </div>

          {/* Bottom Right: Client/Receiver Signature */}
          <div className="flex flex-col items-center">
            <div className="border-b border-black w-48 pb-1 h-5 flex items-center justify-center text-center text-xs font-mono font-bold text-slate-800 uppercase" />
            <span className="text-[9px] font-bold text-slate-600 font-display mt-2 uppercase tracking-widest text-center">
              RECEIVER SIGNATURE
            </span>
          </div>
        </div>

        {/* Small authentic layout footer details */}
        <div className="flex justify-between items-center mt-auto px-1 text-[8px] text-gray-400 font-mono select-none">
          <span />
          <span>Printed on: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
