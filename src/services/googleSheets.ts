import { TicketData } from '../types';

export interface GoogleSheetsConfig {
  scriptUrl: string;
  autoSync: boolean;
}

const GOOGLE_SHEETS_CONFIG_KEY = 'httcard_google_sheets_config';

/**
 * Normalizes Google Apps Script Web App URL and detects common user URL entry issues
 */
export function normalizeScriptUrl(url: string): { url: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { url: '', error: 'Google Apps Script URL is empty.' };
  }
  let trimmed = url.trim();

  // Detect accidental pasting of Google Sheets document URL
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return {
      url: trimmed,
      error: 'Spreadsheet link detected: Please deploy a Google Apps Script Web App (Extensions > Apps Script > Deploy > New Deployment > Web App) and use the generated Web App URL (ends in /exec).',
    };
  }

  // Auto-correct common URL endings (/edit or /dev -> /exec)
  if (trimmed.includes('script.google.com/macros/s/')) {
    if (trimmed.endsWith('/edit')) {
      trimmed = trimmed.replace(/\/edit$/, '/exec');
    } else if (trimmed.endsWith('/dev')) {
      trimmed = trimmed.replace(/\/dev$/, '/exec');
    } else if (trimmed.endsWith('/')) {
      trimmed = trimmed + 'exec';
    } else if (!trimmed.endsWith('/exec')) {
      trimmed = trimmed + '/exec';
    }
  }

  if (!trimmed.startsWith('https://script.google.com/macros/s/')) {
    return {
      url: trimmed,
      error: 'Invalid Google Apps Script URL. It must begin with https://script.google.com/macros/s/... and end with /exec.',
    };
  }

  return { url: trimmed };
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(GOOGLE_SHEETS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.scriptUrl) {
        parsed.scriptUrl = normalizeScriptUrl(parsed.scriptUrl).url || parsed.scriptUrl;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading Google Sheets config:', e);
  }
  const defaultUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_SHEETS_SCRIPT_URL || '';
  return { scriptUrl: defaultUrl, autoSync: Boolean(defaultUrl) };
}

export function saveGoogleSheetsConfig(config: GoogleSheetsConfig): void {
  const normalized = normalizeScriptUrl(config.scriptUrl).url || config.scriptUrl;
  localStorage.setItem(GOOGLE_SHEETS_CONFIG_KEY, JSON.stringify({ ...config, scriptUrl: normalized }));
}

let isSyncInFlight = false;

export async function syncTicketsToGoogleSheets(
  tickets: TicketData | TicketData[],
  scriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const rawUrl = scriptUrl || getGoogleSheetsConfig().scriptUrl;
  const { url, error: urlError } = normalizeScriptUrl(rawUrl);

  if (urlError || !url) {
    return { success: false, message: urlError || 'Google Apps Script URL is missing or invalid.' };
  }

  // Prevent race conditions and redundant in-flight network calls from overlapping
  if (isSyncInFlight) {
    return { success: true, message: 'Sync request is already in progress. Please wait a moment.' };
  }

  isSyncInFlight = true;

  try {
    const rawList = Array.isArray(tickets) ? tickets : [tickets];

    // Client-side payload deduplication: Keep the latest record for each unique ID / Ticket No
    const uniqueMap = new Map<string, TicketData>();
    rawList.forEach((t, index) => {
      const key = t.id || t.ticketNo || (t.pnr && t.pnr !== 'N/A' ? `pnr-${t.pnr}` : `idx-${index}`);
      uniqueMap.set(key, t);
    });
    const payload = Array.from(uniqueMap.values());

    if (payload.length === 0) {
      return { success: true, message: 'No valid tickets to sync.' };
    }

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script web apps handle no-cors redirect
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Successfully synchronized ${payload.length} unique ticket(s) to Google Sheets.`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to connect to Google Sheets Web App.';
    return {
      success: false,
      message,
    };
  } finally {
    isSyncInFlight = false;
  }
}

export async function fetchTicketsFromGoogleSheets(
  scriptUrl?: string
): Promise<{ success: boolean; tickets: TicketData[]; message: string }> {
  const rawUrl = scriptUrl || getGoogleSheetsConfig().scriptUrl;
  const { url, error: urlError } = normalizeScriptUrl(rawUrl);

  if (urlError || !url) {
    return { success: false, tickets: [], message: urlError || 'Google Apps Script URL is missing or invalid.' };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    if (response.status === 404) {
      return {
        success: false,
        tickets: [],
        message: 'Google Apps Script Web App not found (HTTP 404). Please ensure you deployed as "Web App", set "Who has access" to "Anyone", and that your URL ends with /exec.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        tickets: [],
        message: `Google Sheets returned HTTP ${response.status} (${response.statusText || 'Error'}). Please check Web App deployment permissions.`,
      };
    }

    let rows: unknown;
    try {
      rows = await response.json();
    } catch {
      return {
        success: false,
        tickets: [],
        message: 'Received invalid response from Google Apps Script (expected JSON array). Please check that your doGet function is returning JSON.',
      };
    }

    if (!Array.isArray(rows)) {
      return { success: false, tickets: [], message: 'Invalid data format received from Google Sheets (expected JSON array).' };
    }

    const mappedTickets: TicketData[] = rows.map((r: Record<string, unknown>, idx: number) => {
      const paxNamesRaw = (r['Passenger Name(s)'] || r.paxNames || r.Name || '') as unknown;
      let paxNames: string[] = ['', '', '', ''];
      if (typeof paxNamesRaw === 'string') {
        const split = paxNamesRaw.split(',').map((s: string) => s.trim());
        paxNames = [split[0] || '', split[1] || '', split[2] || '', split[3] || ''];
      } else if (Array.isArray(paxNamesRaw)) {
        paxNames = [String(paxNamesRaw[0] || ''), String(paxNamesRaw[1] || ''), String(paxNamesRaw[2] || ''), String(paxNamesRaw[3] || '')];
      }

      return {
        id: String(r['Record ID'] || r.id || `sheet-${Date.now()}-${idx}`),
        customerName: String(r['Customer Name'] || r.customerName || paxNames[0] || 'Client'),
        paxNames,
        carrier: String(r['Air Code / Carrier'] || r['Air Code'] || r.carrier || ''),
        date: String(r['Issue Date'] || r.date || ''),
        co: String(r['C/O Ref'] || r.co || r.Ref || ''),
        remarks: String(r.Remarks || r.remarks || ''),
        box2Remarks: String(r['Box 2 Remarks'] || r.box2Remarks || ''),
        pnr: String(r.PNR || r.pnr || ''),
        phone: String(r.Phone || r.phone || ''),
        flight: String(r['Travel Date'] || r.flight || ''),
        sectors: String(r['Route / Sectors'] || r.Route || r.sectors || ''),
        returnDate: String(r['Return Date'] || r.returnDate || ''),
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
        logo: String(r.logo || ''),
        issuerSignature: String(r.issuerSignature || ''),
        foreignCurrency: String(r.foreignCurrency || 'USD'),
        foreignAmount: String(r.foreignAmount || ''),
        exchangeRate: String(r.exchangeRate || ''),
        contributionMargin: String(r['Contribution Margin'] || r.contributionMargin || ''),
        keepGrossFare: r.keepGrossFare === true || r.keepGrossFare === 'true',
        createdAt: String(r['Last Updated'] || r.updatedAt || new Date().toISOString()),
      };
    }).filter(t => t.customerName || t.pnr || t.ticketNo);

    return {
      success: true,
      tickets: mappedTickets,
      message: `Fetched ${mappedTickets.length} ticket(s) from Google Sheets.`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tickets from Google Sheets.';
    return {
      success: false,
      tickets: [],
      message,
    };
  }
}
