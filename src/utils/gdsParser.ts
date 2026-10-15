import { TicketData, emptyTicket } from '../types';
import { DEFAULT_HASNAIN_LOGO } from '../assets/defaultLogo';

export interface GdsParsedResult {
  pnr: string;
  passengerNames: string[];
  carrier: string;
  flight: string;
  sectors: string;
  returnDate: string;
  ticketNo: string;
  date: string;
  baseFare: string;
  tax: string;
  gross: string;
  salesAmount: string;
  remarks: string;
  co: string;
  rawMatchedLines: string[];
}

/**
 * Normalizes 3-letter month abbreviation to standard format
 */
function normalizeDate(rawDateStr: string): string {
  if (!rawDateStr) return '';
  const clean = rawDateStr.trim();

  // Pattern like 06AUG, 06AUG26, 06-AUG-2026, 06/08/2026
  const matchAlpha = clean.match(/(\d{1,2})[-/\s]?([A-Za-z]{3})[-/\s]?(\d{2,4})?/i);
  if (matchAlpha) {
    const day = matchAlpha[1].padStart(2, '0');
    const monthStr = matchAlpha[2].toLowerCase();
    let yearStr = matchAlpha[3] || new Date().getFullYear().toString();
    if (yearStr.length === 2) {
      yearStr = '20' + yearStr;
    }
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr];
    if (month) {
      return `${yearStr}-${month}-${day}`;
    }
  }

  // ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  return clean;
}

/**
 * Intelligent GDS Parser supporting:
 * - Sabre PNR display (e.g. *A, *I, *P)
 * - Amadeus PNR display (e.g. RT, TWD)
 * - Galileo / Travelport PNR display (*ALL)
 * - Airline e-ticket confirmation emails & terminal dumps
 */
export function parseGdsText(rawText: string): GdsParsedResult {
  const result: GdsParsedResult = {
    pnr: '',
    passengerNames: [],
    carrier: '',
    flight: '',
    sectors: '',
    returnDate: '',
    ticketNo: '',
    date: new Date().toISOString().split('T')[0],
    baseFare: '',
    tax: '',
    gross: '',
    salesAmount: '',
    remarks: '',
    co: '',
    rawMatchedLines: [],
  };

  if (!rawText || !rawText.trim()) {
    return result;
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. PNR Detection: 5 to 7 alphanumeric characters (Sabre/Amadeus/Galileo headers)
  // Look for: "RP/...", "PNR: ABCDEF", "RECORD LOCATOR: ABCDEF", "BOOKING REF: ABCDEF", or single token like "SKIDJD"
  for (const line of lines) {
    const pnrExplicit = line.match(/(?:PNR|LOCATOR|RECORD\s*LOCATOR|BOOKING\s*REF|REF)\s*[:.-]?\s*([A-Z0-9]{5,7})\b/i);
    if (pnrExplicit) {
      result.pnr = pnrExplicit[1].toUpperCase();
      result.rawMatchedLines.push(`PNR: ${result.pnr}`);
      break;
    }
    // Amadeus header: RP/DACBG2100/DACBG2100            AA/SU  04AUG26/0821Z   SKIDJD
    const amadeusPnr = line.match(/\b([A-Z0-9]{6})\b(?:\s*$|\s*-\s*)/);
    if (amadeusPnr && !result.pnr && !['TICKETS', 'ISSUED', 'RETURN', 'TRAVEL'].includes(amadeusPnr[1])) {
      // Check if line looks like header
      if (line.includes('RP/') || line.includes('SU ') || line.includes('Z ') || line.length < 25) {
        result.pnr = amadeusPnr[1].toUpperCase();
        result.rawMatchedLines.push(`PNR (Header): ${result.pnr}`);
      }
    }
  }

  // Fallback PNR search if still not found
  if (!result.pnr) {
    for (const line of lines) {
      const match = line.match(/\b([A-Z][A-Z0-9]{4,6})\b/);
      if (match && !['TICKET', 'FLIGHT', 'RETURN', 'PASSENGER', 'REMARKS', 'ISSUED'].includes(match[1])) {
        result.pnr = match[1].toUpperCase();
        break;
      }
    }
  }

  // 2. Passenger Name(s) Detection
  // Common patterns:
  // "1.1RAHMAN/MOSTAFIZUR MR"
  // "1 RAHMAN/MOSTAFIZUR MR"
  // "RAHMAN/MOSTAFIZUR MR"
  // "PAX: RAHMAN/MOSTAFIZUR MR"
  const paxList: string[] = [];
  const paxRegex1 = /(?:^\d+\.?\d*\s*|\bPAX\s*[:.-]?\s*)([A-Z]{2,20}\/[A-Z\s]{2,30}(?:MR|MRS|MS|MSTR|MISS|MD|CHLD|INF)?)/i;
  const paxRegex2 = /\b([A-Z]{2,20}\/[A-Z\s]{2,25}(?:MR|MRS|MS|MSTR|MISS))\b/i;

  for (const line of lines) {
    if (paxList.length >= 4) break;

    const m1 = line.match(paxRegex1);
    if (m1) {
      const cleanName = m1[1].trim().toUpperCase().replace(/\s+/g, ' ');
      if (!paxList.includes(cleanName) && !cleanName.includes('TICKET') && !cleanName.includes('TOTAL')) {
        paxList.push(cleanName);
        result.rawMatchedLines.push(`PAX: ${cleanName}`);
        continue;
      }
    }

    const m2 = line.match(paxRegex2);
    if (m2) {
      const cleanName = m2[1].trim().toUpperCase().replace(/\s+/g, ' ');
      if (!paxList.includes(cleanName)) {
        paxList.push(cleanName);
        result.rawMatchedLines.push(`PAX: ${cleanName}`);
      }
    }
  }
  result.passengerNames = paxList;

  // 3. Ticket Number(s) Detection (10 to 14 digits, airline ticket format e.g. 997-4883754463 or 9974883754463)
  const ticketNos: string[] = [];
  for (const line of lines) {
    const tktMatch = line.match(/(?:TKT|ETKT|TICKET|FA-PAX|FHE)\s*[:.-]?\s*(\d{3}[-\s]?\d{10}|\d{13,14})/i)
      || line.match(/\b(\d{3}[-\s]\d{10})\b/)
      || line.match(/\b(\d{13})\b/);

    if (tktMatch) {
      const cleanTkt = tktMatch[1].replace(/[-\s]/g, '');
      if (!ticketNos.includes(cleanTkt) && cleanTkt.length >= 13) {
        ticketNos.push(cleanTkt);
        result.rawMatchedLines.push(`Ticket No: ${cleanTkt}`);
      }
    }
  }
  if (ticketNos.length > 0) {
    result.ticketNo = ticketNos.join(', ');
  }

  // 4. Flight Number & Airline Code & Travel Dates
  // Patterns:
  // "1 BG 022 Y 06AUG CGPDAC HK1 0830 0915"
  // "2 SV 805 Y 08AUG DACCXD HK1"
  // "EK 585 10SEP DACDXB"
  const sectorsFound: string[] = [];
  let flightDesc = '';

  for (const line of lines) {
    const flightMatch = line.match(/(?:^\d+\s+)?([A-Z0-9]{2})\s*(\d{2,4})\s+([A-Z])?\s*(\d{1,2}[A-Z]{3})\s+([A-Z]{3})([A-Z]{3})/i);
    if (flightMatch) {
      const carrierCode = flightMatch[1].toUpperCase();
      const flightNum = flightMatch[2];
      const travelDate = flightMatch[4].toUpperCase();
      const origin = flightMatch[5].toUpperCase();
      const dest = flightMatch[6].toUpperCase();

      if (!result.carrier) {
        result.carrier = carrierCode;
      }
      sectorsFound.push(`${origin}-${dest}`);

      const formattedDate = normalizeDate(travelDate);
      if (!result.flight) {
        result.flight = `${carrierCode} ${flightNum} (${formattedDate})`;
        flightDesc = formattedDate;
      }

      result.rawMatchedLines.push(`Flight: ${carrierCode} ${flightNum} | ${origin}-${dest} on ${travelDate}`);
    }
  }

  if (sectorsFound.length > 0) {
    result.sectors = sectorsFound.join(' / ');
  } else {
    // Fallback: look for 6-letter or hyphenated route like DAC-DXB, CGP-JED
    for (const line of lines) {
      const routeMatch = line.match(/\b([A-Z]{3})[-/]([A-Z]{3})\b/);
      if (routeMatch && !result.sectors) {
        result.sectors = `${routeMatch[1].toUpperCase()}-${routeMatch[2].toUpperCase()}`;
        result.rawMatchedLines.push(`Sector: ${result.sectors}`);
        break;
      }
    }
  }

  // 5. Fares & Amount Detection (Base Fare, Tax, Total / Gross Fare)
  // Look for: "TOTAL BDT 9249", "FARE BDT 8024", "TAX BDT 1225", "TOTAL: 107095"
  for (const line of lines) {
    // Total / Gross Fare
    const totalMatch = line.match(/(?:TOTAL|TOTAL\s*FARE|GROSS)\s*[:.-]?\s*(?:BDT|TK)?\s*([0-9,]+(?:\.\d+)?)/i);
    if (totalMatch && !result.gross) {
      const clean = totalMatch[1].replace(/,/g, '');
      const parsed = parseFloat(clean);
      if (parsed > 0) {
        result.gross = Math.round(parsed).toString();
        result.salesAmount = result.gross;
        result.rawMatchedLines.push(`Total Fare: BDT ${result.gross}`);
      }
    }

    // Base Fare
    const baseMatch = line.match(/(?:BASE|BASE\s*FARE|FARE)\s*[:.-]?\s*(?:BDT|TK)?\s*([0-9,]+(?:\.\d+)?)/i);
    if (baseMatch && !result.baseFare) {
      const clean = baseMatch[1].replace(/,/g, '');
      const parsed = parseFloat(clean);
      if (parsed > 0) {
        result.baseFare = Math.round(parsed).toString();
        result.rawMatchedLines.push(`Base Fare: BDT ${result.baseFare}`);
      }
    }

    // Tax
    const taxMatch = line.match(/(?:TAX|TAXES|TAX\s*AMOUNT)\s*[:.-]?\s*(?:BDT|TK)?\s*([0-9,]+(?:\.\d+)?)/i);
    if (taxMatch && !result.tax) {
      const clean = taxMatch[1].replace(/,/g, '');
      const parsed = parseFloat(clean);
      if (parsed > 0) {
        result.tax = Math.round(parsed).toString();
        result.rawMatchedLines.push(`Tax: BDT ${result.tax}`);
      }
    }
  }

  // Auto-fill missing Total if Base and Tax are present
  if (!result.gross && result.baseFare && result.tax) {
    const sum = (parseFloat(result.baseFare) || 0) + (parseFloat(result.tax) || 0);
    if (sum > 0) {
      result.gross = Math.round(sum).toString();
      result.salesAmount = result.gross;
    }
  }

  // 6. Corporate C/O & Remarks
  for (const line of lines) {
    const coMatch = line.match(/(?:C\/O|CARE\s*OF|CLIENT|REF|REFERENCE|CORP)\s*[:.-]?\s*([A-Za-z0-9\s/-]{2,25})\b/i);
    if (coMatch && !result.co) {
      result.co = coMatch[1].trim().toUpperCase();
      result.rawMatchedLines.push(`C/O Ref: ${result.co}`);
      break;
    }
  }

  // Remarks from endorsement or general notes
  for (const line of lines) {
    if (line.startsWith('OSI') || line.startsWith('SSR') || line.includes('NON-REF') || line.includes('NON-END')) {
      if (!result.remarks) {
        result.remarks = line.slice(0, 40).trim();
      }
    }
  }

  return result;
}

export const SAMPLE_GDS_TEXT = `RP/DACBG2100/DACBG2100            AA/SU  04AUG26/0821Z   SKIDJD
1.1RAHMAN/MOSTAFIZUR MR
1  BG 022 Y 06AUG CGPDAC HK1  0830 0915   *1A/E*
FA PAX 997-4883754463/S1/P1/04AUG26/DACBG2100
FARE  BDT      8024
TAX   BDT      1225
TOTAL BDT      9249
C/O: TORAG TRAVELS
OSI BG NON-REFUNDABLE AFTER DEPARTURE`;
