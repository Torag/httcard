import React, { useRef } from 'react';
import { TicketData } from '../types';
import { DEFAULT_HASNAIN_LOGO } from '../assets/defaultLogo';
import { updateSettings } from '../services/storage';

interface InvoicePreviewProps {
  data: TicketData;
  onChange?: (data: TicketData) => void;
  scale?: number;
  isPrinting?: boolean;
}

// Convert numbers up to 100 million to words in Bangladeshi Taka
function numberToWordsBDT(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Taka Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertChunk(n % 100);
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = Math.floor(num);

  if (crore > 0) words += convertChunk(crore) + 'Crore ';
  if (lakh > 0) words += convertChunk(lakh) + 'Lakh ';
  if (thousand > 0) words += convertChunk(thousand) + 'Thousand ';
  if (remainder > 0) words += convertChunk(remainder);

  return words.trim() + ' Taka Only';
}

export function InvoicePreview({
  data,
  onChange,
  scale = 1,
  isPrinting = false,
}: InvoicePreviewProps) {
  const sigInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChange) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const sig = event.target.result as string;
          try {
            updateSettings({ issuerSignature: sig });
          } catch (err) {
            console.error('Failed to persist signature setting:', err);
          }
          onChange({ ...data, issuerSignature: sig });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    try {
      updateSettings({ issuerSignature: '' });
    } catch (err) {
      console.error('Failed to persist signature removal:', err);
    }
    if (onChange) {
      onChange({ ...data, issuerSignature: '' });
    }
  };
  const grossNum = parseFloat(data.gross) || 0;
  const salesNum = parseFloat(data.salesAmount) || 0;
  const baseSales = salesNum > 0 ? salesNum : grossNum;

  // Auto-calculated discount is Gross Fare - Sell Amount (whenever Gross > Sell)
  const autoDiscount = (grossNum > salesNum && salesNum > 0) ? Math.round(grossNum - salesNum) : 0;

  // Automatically show discount by default if Gross Fare > Sell Amount, unless explicitly disabled (data.showDiscount === false)
  const isExplicitlyDisabled = data.showDiscount === false;
  const showDiscount = !isExplicitlyDisabled && (autoDiscount > 0 || (Boolean(data.showDiscount) && parseFloat(data.discount || '0') > 0));

  // Determine active discount value (user custom override or auto-calculated discount)
  let discountFare = 0;
  if (showDiscount) {
    if (data.discount !== undefined && data.discount !== '' && !isNaN(parseFloat(data.discount))) {
      discountFare = parseFloat(data.discount);
    } else {
      discountFare = autoDiscount;
    }
  }

  // Calculate Subtotal and Grand Total:
  // Default price on invoice is always Gross Fare whenever available
  let subtotalFare: number;
  let grandTotalFare: number;

  if (showDiscount && discountFare > 0) {
    if (grossNum > 0 && (grossNum >= baseSales || grossNum >= (baseSales + discountFare))) {
      subtotalFare = grossNum;
      grandTotalFare = Math.max(0, subtotalFare - discountFare);
    } else {
      subtotalFare = baseSales + discountFare;
      grandTotalFare = baseSales;
    }
  } else {
    // If discount is not shown, subtotal and grand total both reflect the net sales amount
    subtotalFare = baseSales > 0 ? baseSales : grossNum;
    grandTotalFare = subtotalFare;
  }

  const subtotalStr = subtotalFare > 0 ? subtotalFare.toLocaleString('en-IN') : '0';
  const discountStr = discountFare > 0 ? discountFare.toLocaleString('en-IN') : '0';
  const grandTotalStr = grandTotalFare > 0 ? grandTotalFare.toLocaleString('en-IN') : '0';
  const amountWords = numberToWordsBDT(grandTotalFare);

  const formattedDate = data.date ? (() => {
    const d = new Date(data.date);
    if (isNaN(d.getTime())) return data.date;
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  })() : new Date().toLocaleDateString('en-GB');

  const paxList = data.paxNames && data.paxNames.filter(Boolean).length > 0
    ? data.paxNames.filter(Boolean)
    : [data.customerName || 'Passenger'];

  const paxCount = parseInt(data.pax) || paxList.length || 1;
  const unitFare = paxCount > 0 ? Math.round(subtotalFare / paxCount) : subtotalFare;
  const unitFareStr = unitFare > 0 ? unitFare.toLocaleString('en-IN') : subtotalStr;

  const invoiceNo = data.cardNo ? `INV-${data.cardNo}` : `INV-${new Date().getFullYear()}-001`;

  return (
    <div 
      id="agency-invoice-sheet"
      className={`bg-white text-slate-900 font-sans relative print-container origin-top mx-auto ${
        isPrinting ? 'shadow-none border-none' : 'shadow-2xl'
      }`}
      style={{
        width: isPrinting ? '210mm' : '794px',
        minHeight: isPrinting ? '297mm' : '1123px',
        height: isPrinting ? '297mm' : 'auto',
        maxHeight: isPrinting ? '297mm' : undefined,
        transform: !isPrinting && scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        boxSizing: 'border-box',
        padding: isPrinting ? '10mm 12mm' : '36px 42px',
      }}
    >
      <div className="h-full flex flex-col justify-between">
        
        {/* Top Header: Logo + Agency Details + Invoice Badge */}
        <div>
          {/* Quick Interactive Discount Bar (no-print) */}
          {!isPrinting && onChange && (
            <div className="no-print mb-4 p-2.5 bg-slate-900 text-white rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    let d = data.discount || '';
                    if (checked && (!d || d === '0')) {
                      d = autoDiscount > 0 ? autoDiscount.toString() : '1000';
                    }
                    onChange({ ...data, showDiscount: checked, discount: checked ? d : '0' });
                  }}
                  className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400 bg-slate-800 border-slate-700"
                />
                <span className="text-xs font-bold tracking-wide">
                  Show Discount on Invoice
                </span>
                {autoDiscount > 0 && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded font-mono">
                    Auto: Gross (৳{grossNum.toLocaleString('en-IN')}) - Sell (৳{salesNum.toLocaleString('en-IN')}) = ৳{autoDiscount.toLocaleString('en-IN')}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                {showDiscount && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-slate-300">Discount (৳):</span>
                    <input
                      type="number"
                      value={data.discount !== undefined && data.discount !== '' ? data.discount : (discountFare > 0 ? Math.round(discountFare).toString() : '')}
                      onChange={(e) => onChange({ ...data, discount: e.target.value, showDiscount: true })}
                      placeholder={autoDiscount > 0 ? Math.round(autoDiscount).toString() : 'e.g. 1500'}
                      className="w-24 px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center gap-1">
                      {autoDiscount > 0 && (
                        <button
                          type="button"
                          onClick={() => onChange({ ...data, discount: autoDiscount.toString(), showDiscount: true })}
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border transition-all cursor-pointer ${
                            discountFare === autoDiscount
                              ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Auto: ৳{autoDiscount.toLocaleString('en-IN')}
                        </button>
                      )}
                      {['500', '1000', '2000', '3000', '5000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onChange({ ...data, discount: preset, showDiscount: true })}
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border transition-all cursor-pointer ${
                            discountFare === parseInt(preset)
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          ৳{parseInt(preset).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            {/* Agency Branding */}
            <div className="flex items-start gap-4">
              <img 
                src={data.logo || DEFAULT_HASNAIN_LOGO} 
                alt="Hasnain Travels" 
                className="h-16 w-auto object-contain max-w-[190px]"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tight text-slate-900 font-display">
                  HASNAIN TRAVELS & TOURS
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-300">
                    Licence: Hajj 815 | Umrah 381 | Recruiting 1592 | IATA 42307764
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 font-medium mt-1 max-w-lg leading-tight">
                  Al Razi Complex, Suite No. G-603, Lift-6, 166-167, Shahid Sayed Nazrul Islam Sharani, Bijoy Nagar Water Tank, Dhaka-1000, Bangladesh
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Hotline: +880 1805-976295 • E-mail: hasnain.ttbd@gmail.com
                </p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="flex flex-col items-end text-right">
              <div className="inline-block bg-slate-900 text-white px-3.5 py-1 text-xs font-black tracking-widest uppercase rounded-xs">
                INVOICE
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoice No:</span>
                <span className="text-sm font-mono font-black text-slate-900">{invoiceNo}</span>
              </div>
              <div className="mt-1 text-right text-[11px]">
                <span className="text-slate-500 font-medium">Date: </span>
                <span className="font-semibold text-slate-800">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Billing Info Section: 2 Columns */}
          <div className="grid grid-cols-2 gap-4 my-4">
            {/* Bill To */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Billed To / Client:
                </span>
                <div className="text-sm font-black text-slate-900">
                  {data.customerName || 'Valued Corporate Client'}
                </div>
                {data.co && (
                  <div className="text-xs font-medium text-slate-600 mt-0.5">
                    <span className="text-slate-400 font-normal">C/O: </span>{data.co}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Passenger(s) ({paxList.length}):</span>
                <span className="font-bold text-slate-800 line-clamp-2">
                  {paxList.join(', ')}
                </span>
              </div>
            </div>

            {/* Travel & Booking Meta */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xs grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2 pb-1 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Booking & Ticket Reference
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">GDS PNR:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{data.pnr || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Airlines:</span>
                <span className="font-bold text-slate-800">{data.carrier || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Flight No / Date:</span>
                <span className="font-medium text-slate-800">{data.flight || formattedDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Routing / Sector:</span>
                <span className="font-mono font-bold text-slate-900">{data.sectors || 'N/A'}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold inline mr-1">E-Ticket No:</span>
                <span className="font-mono text-[11px] font-bold text-slate-700">{data.ticketNo || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Itemized Invoice Table */}
          <div className="border border-slate-900 rounded-xs overflow-hidden my-3">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Service & Ticket Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">Route</th>
                  <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right w-28">Rate (BDT)</th>
                  <th className="py-2.5 px-3 text-right w-32">Total (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="py-3 px-3 text-center text-slate-500 font-sans font-medium">01</td>
                  <td className="py-3 px-3 font-sans">
                    <div className="font-bold text-slate-900 text-xs">
                      Air Passenger Ticket Issuance
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Carrier: <span className="font-semibold">{data.carrier || 'Airline'}</span> • PNR: <span className="font-mono font-bold text-blue-800">{data.pnr || 'N/A'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Ticket No: {data.ticketNo || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                    {data.sectors || 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {paxCount}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800">
                    ৳ {unitFareStr}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    ৳ {subtotalStr}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                <tr>
                  <td colSpan={4} rowSpan={showDiscount && discountFare > 0 ? 3 : 2} className="p-3 align-top border-r border-slate-200 font-sans">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Amount in Words:
                    </span>
                    <span className="text-xs font-bold text-slate-900 italic block">
                      {amountWords}
                    </span>
                    {data.remarks && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] font-normal text-slate-600">
                        <span className="font-semibold text-slate-700">Remarks: </span>
                        {data.remarks}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right uppercase text-[10px] text-slate-600">Subtotal:</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-900">৳ {subtotalStr}</td>
                </tr>
                {showDiscount && discountFare > 0 && (
                  <tr className="border-t border-slate-200 bg-rose-50/70">
                    <td className="py-2 px-3 text-right uppercase text-[10px] text-rose-700 font-bold">
                      Special Discount:
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-rose-700 font-black">
                      - ৳ {discountStr}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 bg-slate-100">
                  <td className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-900 font-black">Grand Total:</td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-900 font-black">৳ {grandTotalStr}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment & Bank Details Box */}
          <div className="grid grid-cols-2 gap-4 text-xs my-3">
            <div className="border border-slate-300 bg-slate-50 p-3 rounded-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Please pay your bill to our bank account:
              </span>
              <div className="text-[11px] text-slate-800 space-y-0.5">
                <p><span className="font-bold text-slate-900">Bank:</span> United Commercial Bank</p>
                <p><span className="font-bold text-slate-900">A/C Name:</span> Hasnain Travels & Tours</p>
                <p><span className="font-bold text-slate-900">Branch:</span> Bashundhara</p>
                <p><span className="font-bold text-slate-900">Account No:</span> <span className="font-mono font-black text-slate-950 text-xs">7022141000180073</span></p>
              </div>
            </div>

            <div className="border border-slate-200 bg-slate-50 p-3 rounded-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Payment Reference & Instructions:
                </span>
                <p className="text-[11px] text-slate-800 font-medium">
                  Please mention PNR <span className="font-mono font-bold text-slate-900">{data.pnr || 'N/A'}</span> or Ticket No in payment reference/narration.
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Accepted via Direct Deposit, NPSB / BEFTN Fund Transfer, RTGS, or Corporate Cheque.
                </p>
              </div>
              <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1 mt-1">
                <span>ℹ️</span> Official Billing Account • Hasnain Travels & Tours
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border-t border-slate-300 pt-2.5 my-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block mb-1">
              Terms & Conditions
            </span>
            <div className="text-[9.5px] text-slate-600 space-y-0.5 leading-snug">
              <p>
                <strong className="text-slate-800 font-bold">Ticket Rules:</strong> Air ticket cancellations, reissues, refunds, and date changes are strictly subject to individual airline fare rules and applicable service penalties.
              </p>
              <p>
                <strong className="text-slate-800 font-bold">Travel Documents:</strong> Maintaining a valid passport (with a minimum of 6 months validity from the travel date) and obtaining all necessary visas remain the sole responsibility of the passenger.
              </p>
              <p>
                <strong className="text-slate-800 font-bold">Official Document:</strong> This invoice serves as an official electronic document issued by Hasnain Travels & Tours.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Signatures Section */}
        <div className="flex items-end justify-between pt-4 mt-6">
          <div className="text-center w-48">
            <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-700">
              Customer Acceptance
            </div>
            <span className="text-[9px] text-slate-400 uppercase">Signature & Date</span>
          </div>

          <div className="text-center w-52 flex flex-col items-center">
            {/* Uploaded signature image if exists */}
            {data.issuerSignature ? (
              <div className="relative flex flex-col items-center mb-1 group">
                <img 
                  src={data.issuerSignature} 
                  alt="Authorized Signature" 
                  className="h-10 max-w-[160px] object-contain mb-1 select-none pointer-events-none" 
                  referrerPolicy="no-referrer"
                />
                {!isPrinting && onChange && (
                  <button
                    type="button"
                    onClick={handleRemoveSignature}
                    className="absolute -top-2 -right-6 bg-red-100 hover:bg-red-200 text-red-600 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-red-200 shadow-xs transition-all cursor-pointer"
                    title="Remove signature"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              !isPrinting && onChange ? (
                <button
                  type="button"
                  onClick={() => sigInputRef.current?.click()}
                  className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded px-2.5 py-1 mb-2.5 tracking-wide uppercase transition-all cursor-pointer"
                >
                  ✍️ Upload Signature
                </button>
              ) : (
                <div className="h-9 flex items-center justify-center text-[10px] text-slate-400 italic">
                  [Authorized Seal & Sign]
                </div>
              )
            )}

            <input 
              type="file" 
              ref={sigInputRef} 
              onChange={handleSignatureUpload} 
              accept="image/*" 
              className="hidden" 
            />

            <div className="border-t-2 border-slate-900 pt-1 text-[11px] font-bold text-slate-900 w-full">
              For Hasnain Travels & Tours
            </div>
            <span className="text-[9px] text-slate-500 uppercase font-semibold">Authorized Signatory</span>
          </div>
        </div>

      </div>
    </div>
  );
}
