import React, { useState } from 'react';
import { Table, Save, ExternalLink, CheckCircle, AlertCircle, RefreshCw, X, Copy, Check, Download } from 'lucide-react';
import { 
  getGoogleSheetsConfig, 
  saveGoogleSheetsConfig, 
  syncTicketsToGoogleSheets, 
  fetchTicketsFromGoogleSheets,
  normalizeScriptUrl 
} from '../services/googleSheets';
import { TicketData } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyTickets: TicketData[];
  onBatchSaveTickets: (tickets: TicketData[]) => Promise<void>;
  onToast: (msg: string) => void;
}

export function GoogleSheetsModal({ isOpen, onClose, historyTickets, onBatchSaveTickets, onToast }: GoogleSheetsModalProps) {
  const [config, setConfig] = useState(getGoogleSheetsConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const urlCheck = config.scriptUrl ? normalizeScriptUrl(config.scriptUrl) : null;

  const handleSaveConfig = () => {
    if (config.scriptUrl) {
      const { url, error } = normalizeScriptUrl(config.scriptUrl);
      if (error) {
        onToast(error);
        return;
      }
      const updated = { ...config, scriptUrl: url };
      setConfig(updated);
      saveGoogleSheetsConfig(updated);
    } else {
      saveGoogleSheetsConfig(config);
    }
    onToast('Google Sheets settings saved successfully!');
  };

  const handleSyncAllNow = async () => {
    const { url, error } = normalizeScriptUrl(config.scriptUrl);
    if (error || !url) {
      onToast(error || 'Please enter a valid Google Apps Script Web App URL first.');
      return;
    }
    if (historyTickets.length === 0) {
      onToast('No vouchers available in history to sync.');
      return;
    }

    setIsSyncing(true);
    const res = await syncTicketsToGoogleSheets(historyTickets, url);
    setIsSyncing(false);

    if (res.success) {
      onToast(`Exported ${historyTickets.length} voucher(s) to Google Sheets!`);
    } else {
      onToast(`Sync failed: ${res.message}`);
    }
  };

  const scriptSnippet = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  var headers = data[0];
  var rows = data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // 1. Acquire mutex script lock to prevent race conditions during concurrent syncs
  var lock = LockService.getScriptLock();
  try {
    var hasLock = lock.tryLock(30000); // Wait up to 30s
    if (!hasLock) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Server busy: lock timeout."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    var headers = [
      "id", "date", "pnr", "customerName", "paxNames", "ticketNo",
      "carrier", "flight", "sectors", "returnDate", "co", "remarks",
      "box2Remarks", "phone", "baseFare", "tax", "gross", "salesAmount",
      "commission", "ait", "net", "contributionMargin", "cardNo", "pax", "updatedAt"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    var items = Array.isArray(payload) ? payload : [payload];
    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: 0 })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Index existing records by Unique Key (id, ticketNo, pnr)
    var lastRow = sheet.getLastRow();
    var keyMap = {}; // Maps unique key -> sheet row number (1-indexed)
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var r = 0; r < existingData.length; r++) {
        var rowNum = r + 2;
        var rId = String(existingData[r][0] || "").trim();
        var rPnr = String(existingData[r][2] || "").trim();
        var rTkt = String(existingData[r][5] || "").trim();
        if (rId) keyMap["id:" + rId] = rowNum;
        if (rTkt) keyMap["tkt:" + rTkt] = rowNum;
        if (rPnr && rPnr !== "N/A") keyMap["pnr:" + rPnr] = rowNum;
      }
    }

    var inserted = 0;
    var updated = 0;

    // 3. Upsert each item: update existing matching row, or append new row
    items.forEach(function(item) {
      var paxNamesStr = Array.isArray(item.paxNames)
        ? item.paxNames.filter(Boolean).join(", ")
        : (item.paxNames || "");

      var itemId = String(item.id || "").trim();
      var itemPnr = String(item.pnr || "").trim();
      var itemTkt = String(item.ticketNo || "").trim();

      var row = [
        itemId, item.date || "", itemPnr, item.customerName || "",
        paxNamesStr, itemTkt, item.carrier || "", item.flight || "",
        item.sectors || "", item.returnDate || "", item.co || "", item.remarks || "",
        item.box2Remarks || "", item.phone || "", item.baseFare || "", item.tax || "",
        item.gross || "", item.salesAmount || "", item.commission || "", item.ait || "",
        item.net || "", item.contributionMargin || "", item.cardNo || "", item.pax || "1",
        item.updatedAt || new Date().toISOString()
      ];

      var matchRow = null;
      if (itemId && keyMap["id:" + itemId]) {
        matchRow = keyMap["id:" + itemId];
      } else if (itemTkt && keyMap["tkt:" + itemTkt]) {
        matchRow = keyMap["tkt:" + itemTkt];
      } else if (itemPnr && itemPnr !== "N/A" && keyMap["pnr:" + itemPnr]) {
        matchRow = keyMap["pnr:" + itemPnr];
      }

      if (matchRow) {
        // In-place update prevents duplicate rows
        sheet.getRange(matchRow, 1, 1, row.length).setValues([row]);
        updated++;
      } else {
        // Insert new row and record in lookup map
        sheet.appendRow(row);
        var newRow = sheet.getLastRow();
        if (itemId) keyMap["id:" + itemId] = newRow;
        if (itemTkt) keyMap["tkt:" + itemTkt] = newRow;
        if (itemPnr && itemPnr !== "N/A") keyMap["pnr:" + itemPnr] = newRow;
        inserted++;
      }
    });

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: items.length,
      inserted: inserted,
      updated: updated
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    // 4. Release lock safely
    lock.releaseLock();
  }
}`;

  const copyScriptCode = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleFetchFromSheets = async () => {
    const { url, error } = normalizeScriptUrl(config.scriptUrl);
    if (error || !url) {
      onToast(error || 'Please enter a valid Google Apps Script Web App URL first.');
      return;
    }

    setIsFetching(true);
    const res = await fetchTicketsFromGoogleSheets(url);
    setIsFetching(false);

    if (res.success && res.tickets.length > 0) {
      await onBatchSaveTickets(res.tickets);
      onToast(`Successfully loaded ${res.tickets.length} ticket(s) from Google Sheets into History!`);
    } else if (res.success) {
      onToast('No ticket records found in Google Sheets.');
    } else {
      onToast(`Fetch notice: ${res.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <Table className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight text-white flex items-center gap-2">
                Google Sheets Integration
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                Connect your ticket vouchers to Google Sheets in real-time
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 bg-slate-50">
          
          {/* Web App URL Input */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Google Apps Script Web App URL
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Must end with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/exec</code>
              </span>
            </div>
            <input
              type="text"
              value={config.scriptUrl}
              onChange={(e) => setConfig({ ...config, scriptUrl: e.target.value })}
              onBlur={() => {
                if (config.scriptUrl) {
                  const { url } = normalizeScriptUrl(config.scriptUrl);
                  if (url && url !== config.scriptUrl) {
                    setConfig({ ...config, scriptUrl: url });
                  }
                }
              }}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-slate-50/50"
            />

            {/* URL Validation Notice */}
            {urlCheck?.error && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{urlCheck.error}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <span>Automatically sync new vouchers when saved</span>
              </label>

              <button
                onClick={handleSaveConfig}
                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </button>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="flex flex-col gap-3">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-emerald-900">
                  Bulk Export History to Google Sheets
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  Sends all {historyTickets.length} local ticket records directly into your sheet as rows.
                </span>
              </div>
              <button
                onClick={handleSyncAllNow}
                disabled={isSyncing || !config.scriptUrl}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:bg-slate-400 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Exporting...' : 'Export All Now'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-blue-900">
                  Import / Sync from Google Sheets to App History
                </span>
                <span className="text-[11px] text-blue-700 font-medium">
                  Fetches all rows from your Google Sheet and loads them into your History list for viewing & editing.
                </span>
              </div>
              <button
                onClick={handleFetchFromSheets}
                disabled={isFetching || !config.scriptUrl}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:bg-slate-400 shrink-0"
              >
                <Download className={`w-3.5 h-3.5 ${isFetching ? 'animate-bounce' : ''}`} />
                {isFetching ? 'Loading...' : 'Import from Sheets'}
              </button>
            </div>
          </div>

          {/* Apps Script Setup Instructions */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Google Apps Script Setup Code
              </h3>
              <button
                onClick={copyScriptCode}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied!' : 'Copy Script Code'}
              </button>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
              <span>🛡️</span>
              <span><strong>Built-in Deduplication & Mutex Lock:</strong> Re-syncing or network retries will safely update matching existing rows (by ID, Ticket No, or PNR) rather than creating duplicate rows.</span>
            </div>

            <ol className="text-xs text-slate-600 list-decimal pl-4 flex flex-col gap-1 font-medium">
              <li>Open your Google Sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a></li>
              <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
              <li>Paste the script code into the Apps Script editor</li>
              <li>Click <strong>Deploy &gt; New Deployment &gt; Web App</strong></li>
              <li>Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong></li>
              <li>Click <strong>Deploy</strong> and copy your Web App URL into the box above</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
