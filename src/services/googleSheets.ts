import { TicketData } from '../types';

export interface GoogleSheetsConfig {
  scriptUrl: string;
  autoSync: boolean;
}

const GOOGLE_SHEETS_CONFIG_KEY = 'httcard_google_sheets_config';

export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(GOOGLE_SHEETS_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading Google Sheets config:', e);
  }
  const defaultUrl = (import.meta as any).env?.VITE_GOOGLE_SHEETS_SCRIPT_URL || '';
  return { scriptUrl: defaultUrl, autoSync: Boolean(defaultUrl) };
}

export function saveGoogleSheetsConfig(config: GoogleSheetsConfig): void {
  localStorage.setItem(GOOGLE_SHEETS_CONFIG_KEY, JSON.stringify(config));
}

export async function syncTicketsToGoogleSheets(
  tickets: TicketData | TicketData[],
  scriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = scriptUrl || getGoogleSheetsConfig().scriptUrl;
  if (!url || !url.startsWith('https://script.google.com/')) {
    return { success: false, message: 'Google Apps Script URL is missing or invalid.' };
  }

  try {
    const payload = Array.isArray(tickets) ? tickets : [tickets];
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script web apps handle no-cors redirect
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Successfully sent ${payload.length} ticket(s) to Google Sheets.`,
    };
  } catch (error: any) {
    console.error('Google Sheets sync error:', error);
    return {
      success: false,
      message: error.message || 'Failed to connect to Google Sheets Web App.',
    };
  }
}

export async function fetchTicketsFromGoogleSheets(
  scriptUrl?: string
): Promise<{ success: boolean; tickets: TicketData[]; message: string }> {
  const url = scriptUrl || getGoogleSheetsConfig().scriptUrl;
  if (!url || !url.startsWith('https://script.google.com/')) {
    return { success: false, tickets: [], message: 'Google Apps Script URL is missing or invalid.' };
  }

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      return { success: false, tickets: [], message: 'Invalid data format received from Google Sheets.' };
    }

    const mappedTickets: TicketData[] = rows.map((r: any, idx: number) => {
      const paxNamesRaw = r['Passenger Name(s)'] || r.paxNames || r.Name || '';
      let paxNames: string[] = ['', '', '', ''];
      if (typeof paxNamesRaw === 'string') {
        const split = paxNamesRaw.split(',').map((s: string) => s.trim());
        paxNames = [split[0] || '', split[1] || '', split[2] || '', split[3] || ''];
      } else if (Array.isArray(paxNamesRaw)) {
        paxNames = [paxNamesRaw[0] || '', paxNamesRaw[1] || '', paxNamesRaw[2] || '', paxNamesRaw[3] || ''];
      }

      return {
        id: r['Record ID'] || r.id || `sheet-${Date.now()}-${idx}`,
        customerName: r['Customer Name'] || r.customerName || paxNames[0] || 'Client',
        paxNames,
        carrier: r['Air Code / Carrier'] || r['Air Code'] || r.carrier || '',
        date: r['Issue Date'] || r.date || '',
        co: r['C/O Ref'] || r.co || r.Ref || '',
        remarks: r.Remarks || r.remarks || '',
        box2Remarks: r['Office Remarks'] || r.box2Remarks || '',
        pnr: r.PNR || r.pnr || '',
        phone: r.Phone || r.phone || '',
        flight: r['Travel Date'] || r.flight || '',
        sectors: r['Route / Sectors'] || r.Route || r.sectors || '',
        returnDate: r['Return Date'] || r.returnDate || '',
        ticketNo: String(r['Ticket Number'] || r.ticketNo || ''),
        salesAmount: String(r['Sales Amount'] || r.salesAmount || ''),
        baseFare: String(r['Base Fare'] || r.baseFare || ''),
        tax: String(r['Tax Amount'] || r.tax || ''),
        gross: String(r['Total Gross Fare'] || r.gross || ''),
        commission: String(r.Commission || r.commission || ''),
        ait: String(r.AIT || r.ait || ''),
        net: String(r['Net Amount'] || r.net || ''),
        cardNo: String(r['Card No'] || r.cardNo || ''),
        pax: String(r['PAX Count'] || r.pax || '1'),
        logo: r.logo || '',
        issuerSignature: r.issuerSignature || '',
        foreignCurrency: r.foreignCurrency || 'USD',
        foreignAmount: String(r.foreignAmount || ''),
        exchangeRate: String(r.exchangeRate || ''),
        contributionMargin: String(r['Contribution Margin'] || r.contributionMargin || ''),
        keepGrossFare: r.keepGrossFare === true || r.keepGrossFare === 'true',
        createdAt: r['Last Updated'] || r.updatedAt || new Date().toISOString(),
      };
    }).filter(t => t.customerName || t.pnr || t.ticketNo);

    return {
      success: true,
      tickets: mappedTickets,
      message: `Fetched ${mappedTickets.length} ticket(s) from Google Sheets.`,
    };
  } catch (error: any) {
    console.error('Fetch Google Sheets error:', error);
    return {
      success: false,
      tickets: [],
      message: error.message || 'Failed to fetch tickets from Google Sheets.',
    };
  }
}
