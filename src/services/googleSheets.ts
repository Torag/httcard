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
  return { scriptUrl: '', autoSync: false };
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
