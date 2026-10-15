import { TicketData } from '../types';
import { sampleTickets } from '../data';
import { DEFAULT_HASNAIN_LOGO } from '../assets/defaultLogo';
import { encrypt, decrypt } from '../utils/crypto';

export const APP_STORAGE_KEY = 'httcard_database_v1';
export const CURRENT_SCHEMA_VERSION = 1;

export interface AppDatabaseSchema {
  version: number;
  updatedAt: string;
  tickets: TicketData[];
  settings: {
    logo: string;
    issuerSignature: string;
  };
  activeTicketDraft: TicketData | null;
}

const getDefaultDatabase = (): AppDatabaseSchema => ({
  version: CURRENT_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  tickets: [],
  settings: {
    logo: DEFAULT_HASNAIN_LOGO,
    issuerSignature: '',
  },
  activeTicketDraft: null,
});

/**
 * Migration helper to migrate legacy localStorage keys (hasnain_tickets, etc.)
 * into the centralized httcard_database_v1 database.
 */
function migrateLegacyStorage(): AppDatabaseSchema {
  const db = getDefaultDatabase();
  let migrated = false;

  try {
    // 1. Legacy Tickets
    const legacyTicketsRaw = localStorage.getItem('hasnain_tickets');
    if (legacyTicketsRaw) {
      let decoded = legacyTicketsRaw;
      if (!decoded.trim().startsWith('[')) {
        decoded = decrypt(decoded);
      }
      if (decoded.trim().startsWith('[')) {
        const parsedTickets: TicketData[] = JSON.parse(decoded);
        if (Array.isArray(parsedTickets)) {
          db.tickets = parsedTickets;
          migrated = true;
        }
      }
    }

    // 2. Legacy Logo
    let legacyLogo = localStorage.getItem('hasnain_agency_logo');
    if (legacyLogo) {
      if (legacyLogo.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA4AAAAEICAIAAACB')) {
        legacyLogo = DEFAULT_HASNAIN_LOGO;
      } else if (!legacyLogo.startsWith('data:image/')) {
        legacyLogo = decrypt(legacyLogo);
      }
      if (legacyLogo) {
        db.settings.logo = legacyLogo;
        migrated = true;
      }
    }

    // 3. Legacy Signature
    let legacySig = localStorage.getItem('hasnain_agency_signature');
    if (legacySig) {
      if (!legacySig.startsWith('data:image/')) {
        legacySig = decrypt(legacySig);
      }
      if (legacySig) {
        db.settings.issuerSignature = legacySig;
        migrated = true;
      }
    }
  } catch (err) {
    console.error('Legacy migration error:', err);
  }

  // Save migrated database to central storage key if any data migrated
  if (migrated) {
    saveDatabase(db);
  }

  return db;
}

/**
 * Reads and deserializes the entire application database from Local Storage.
 * Handles corrupt data gracefully and runs schema migrations as needed.
 */
export function getDatabase(): AppDatabaseSchema {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) {
      // Check for legacy storage to migrate
      return migrateLegacyStorage();
    }

    let jsonStr = raw;
    if (!jsonStr.trim().startsWith('{')) {
      jsonStr = decrypt(jsonStr);
    }

    const db: AppDatabaseSchema = JSON.parse(jsonStr);

    // Validate essential database structure
    if (!db || typeof db !== 'object' || typeof db.version !== 'number') {
      console.warn('Corrupted database detected. Reinitializing default database.');
      const fallback = getDefaultDatabase();
      saveDatabase(fallback);
      return fallback;
    }

    // Ensure array fields exist
    if (!Array.isArray(db.tickets)) {
      db.tickets = [];
    }

    if (!db.settings || typeof db.settings !== 'object') {
      db.settings = {
        logo: DEFAULT_HASNAIN_LOGO,
        issuerSignature: '',
      };
    }

    // Filter out tickets older than 72 hours (preserving existing retention policy)
    const now = new Date().getTime();
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
    const validTickets = db.tickets.filter((ticket) => {
      if (!ticket.createdAt) return true;
      const createdTime = new Date(ticket.createdAt).getTime();
      return !isNaN(createdTime) && now - createdTime <= SEVENTY_TWO_HOURS;
    });

    if (validTickets.length !== db.tickets.length) {
      db.tickets = validTickets;
      saveDatabase(db);
    }

    return db;
  } catch (err) {
    console.error('Failed to read database from Local Storage:', err);
    const fallback = getDefaultDatabase();
    saveDatabase(fallback);
    return fallback;
  }
}

/**
 * Serializes and writes the database to Local Storage under single namespace.
 */
export function saveDatabase(db: AppDatabaseSchema): void {
  try {
    db.updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(db);
    const encrypted = encrypt(serialized);
    localStorage.setItem(APP_STORAGE_KEY, encrypted);
  } catch (err) {
    console.error('Failed to save database to Local Storage:', err);
  }
}

/**
 * Retrieves all stored tickets from Local Storage.
 */
export function getTickets(): TicketData[] {
  const db = getDatabase();
  return db.tickets;
}

/**
 * Normalizes ticket data ensuring no undefined values and at least 4 passenger name slots.
 */
export function normalizeTicket(ticket: TicketData): TicketData {
  const normalized: TicketData = { ...ticket };
  (Object.keys(normalized) as (keyof TicketData)[]).forEach((key) => {
    if (normalized[key] === undefined) {
      (normalized[key] as unknown) = '';
    }
  });

  if (!normalized.paxNames || !Array.isArray(normalized.paxNames) || normalized.paxNames.length === 0) {
    normalized.paxNames = ['', '', '', ''];
  } else if (normalized.paxNames.length < 4) {
    normalized.paxNames = [
      normalized.paxNames[0] || '',
      normalized.paxNames[1] || '',
      normalized.paxNames[2] || '',
      normalized.paxNames[3] || '',
    ];
  }

  return normalized;
}

/**
 * Finds index of an existing ticket by ID, Ticket Number, or PNR + Customer Name.
 */
function findMatchingTicketIndex(tickets: TicketData[], candidate: TicketData): number {
  return tickets.findIndex((t) => {
    if (t.id && candidate.id && t.id === candidate.id) return true;
    if (t.ticketNo && candidate.ticketNo && t.ticketNo === candidate.ticketNo) return true;
    if (
      t.pnr && 
      candidate.pnr && 
      t.pnr.trim().toUpperCase() === candidate.pnr.trim().toUpperCase() && 
      t.customerName === candidate.customerName
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Creates or updates a ticket record in Local Storage.
 */
export function saveTicketRecord(ticket: TicketData): TicketData[] {
  const db = getDatabase();
  const validTicket = normalizeTicket(ticket);
  const existingIdx = findMatchingTicketIndex(db.tickets, validTicket);

  if (existingIdx >= 0) {
    db.tickets[existingIdx] = {
      ...db.tickets[existingIdx],
      ...validTicket,
      id: db.tickets[existingIdx].id,
    };
  } else {
    db.tickets.unshift(validTicket);
  }

  // Sort tickets by createdAt descending
  db.tickets.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  saveDatabase(db);
  return db.tickets;
}

/**
 * Saves multiple ticket records in a single batch operation.
 */
export function saveMultipleTicketRecords(ticketsToSave: TicketData[]): TicketData[] {
  const db = getDatabase();

  for (const ticket of ticketsToSave) {
    const validTicket = normalizeTicket(ticket);
    const existingIdx = findMatchingTicketIndex(db.tickets, validTicket);

    if (existingIdx >= 0) {
      db.tickets[existingIdx] = {
        ...db.tickets[existingIdx],
        ...validTicket,
        id: db.tickets[existingIdx].id, // preserve existing local ID
      };
    } else {
      db.tickets.unshift(validTicket);
    }
  }

  db.tickets.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  saveDatabase(db);
  return db.tickets;
}

/**
 * Deletes multiple tickets by ID from Local Storage.
 */
export function deleteTicketsRecords(ids: string[]): TicketData[] {
  const db = getDatabase();
  db.tickets = db.tickets.filter((t) => !ids.includes(t.id));
  saveDatabase(db);
  return db.tickets;
}

/**
 * Deletes a single ticket by ID from Local Storage.
 */
export function deleteTicketRecord(id: string): TicketData[] {
  return deleteTicketsRecords([id]);
}

/**
 * Retrieves stored application settings (logo, issuer signature).
 */
export function getSettings(): { logo: string; issuerSignature: string } {
  const db = getDatabase();
  return {
    logo: db.settings?.logo || DEFAULT_HASNAIN_LOGO,
    issuerSignature: db.settings?.issuerSignature || '',
  };
}

/**
 * Updates application settings immediately in Local Storage.
 */
export function updateSettings(newSettings: Partial<{ logo: string; issuerSignature: string }>): { logo: string; issuerSignature: string } {
  const db = getDatabase();
  db.settings = {
    ...db.settings,
    ...newSettings,
  };
  saveDatabase(db);
  return db.settings;
}

/**
 * Retrieves the currently active ticket draft form state.
 */
export function getActiveTicketDraft(): TicketData | null {
  const db = getDatabase();
  return db.activeTicketDraft || null;
}

/**
 * Saves the active ticket form state immediately to Local Storage.
 */
export function saveActiveTicketDraft(draft: TicketData): void {
  const db = getDatabase();
  db.activeTicketDraft = draft;
  saveDatabase(db);
}

/**
 * Clears the active ticket form draft from Local Storage.
 */
export function clearActiveTicketDraft(): void {
  const db = getDatabase();
  db.activeTicketDraft = null;
  saveDatabase(db);
}

/**
 * Fully resets Local Storage data upon explicit user action.
 */
export function resetDatabase(): AppDatabaseSchema {
  const clean = getDefaultDatabase();
  saveDatabase(clean);
  return clean;
}
