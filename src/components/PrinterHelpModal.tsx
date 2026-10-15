import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Info
} from 'lucide-react';

interface PrinterHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerPrint: () => void;
  currentMode: 'voucher' | 'invoice';
}

type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'mobile';

export function PrinterHelpModal({
  isOpen,
  onClose,
  onTriggerPrint,
  currentMode,
}: PrinterHelpModalProps) {
  // Detect default browser from user agent
  const getInitialBrowser = (): BrowserType => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('edg/')) return 'edge';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
    return 'chrome';
  };

  const [activeBrowser, setActiveBrowser] = useState<BrowserType>(getInitialBrowser());

  if (!isOpen) return null;

  const browserConfigs = {
    chrome: {
      name: 'Google Chrome',
      badge: 'Most Popular',
      steps: [
        {
          label: 'Destination',
          value: 'Select your physical printer or "Save as PDF"',
          tip: 'Ensure the printer has standard A4 paper loaded.'
        },
        {
          label: 'Paper Size',
          value: 'A4',
          important: true,
          tip: 'Crucial: Never leave on "Letter" (8.5×11") as it will clip bottom signatures.'
        },
        {
          label: 'Margins',
          value: 'None (or Minimum / Default: 0)',
          important: true,
          tip: 'Setting Margins to "None" eliminates trailing second blank pages.'
        },
        {
          label: 'Options: Background graphics',
          value: 'Must be CHECKED [✓]',
          important: true,
          tip: 'Without this, Chrome strips logos, table borders, and header badges.'
        },
        {
          label: 'Options: Headers and footers',
          value: 'UNCHECKED [ ]',
          important: true,
          tip: 'Removes the browser URL, page numbers, and system timestamp from borders.'
        },
        {
          label: 'Scale',
          value: 'Default (100%)',
          tip: 'If any line overflows, set Scale to "Fit to printable area" or 98%.'
        }
      ]
    },
    edge: {
      name: 'Microsoft Edge',
      badge: 'Chromium Engine',
      steps: [
        {
          label: 'Printer',
          value: 'Select your printer or "Microsoft Print to PDF"',
          tip: 'Check that standard A4 tray is selected.'
        },
        {
          label: 'Paper Size',
          value: 'A4',
          important: true,
          tip: 'Matches the exact 210mm × 297mm layout dimensions.'
        },
        {
          label: 'Margins',
          value: 'None',
          important: true,
          tip: 'Guarantees exact 1-page output without blank trailing pages.'
        },
        {
          label: 'Background graphics',
          value: 'Turn ON [✓]',
          important: true,
          tip: 'Preserves the deep blue headers, official stamps, and colored ledger tables.'
        },
        {
          label: 'Headers and footers',
          value: 'Turn OFF [ ]',
          tip: 'Produces a pristine commercial look without browser metadata.'
        },
        {
          label: 'Scale',
          value: '100% (Default)',
          tip: 'Use 98% if your printer hardware enforces wide physical margins.'
        }
      ]
    },
    firefox: {
      name: 'Mozilla Firefox',
      badge: 'Gecko Engine',
      steps: [
        {
          label: 'Destination',
          value: 'Select printer or "Save to PDF"',
          tip: 'Choose your desired output destination.'
        },
        {
          label: 'Orientation & Paper Size',
          value: 'Portrait • A4',
          important: true,
          tip: 'Ensure Orientation is set to Portrait and Paper size to A4.'
        },
        {
          label: 'Margins',
          value: 'None (0 mm)',
          important: true,
          tip: 'In "More settings", change Margins from Default to None.'
        },
        {
          label: 'Print backgrounds',
          value: 'Check [✓] Print backgrounds',
          important: true,
          tip: 'Essential for rendering full-color header bands, badges, and bank ledger boxes.'
        },
        {
          label: 'Print headers and footers',
          value: 'Uncheck [ ]',
          tip: 'Hides Firefox page title and URL stamps.'
        },
        {
          label: 'Scale',
          value: 'Fit to page width (or 100%)',
          tip: 'Keeps all passenger manifest and financial table rows aligned.'
        }
      ]
    },
    safari: {
      name: 'Apple Safari (macOS)',
      badge: 'Apple WebKit',
      steps: [
        {
          label: 'Paper Size',
          value: 'A4 (210 by 297 mm)',
          important: true,
          tip: 'Click "Show Details" in the macOS print dialog to reveal Paper Size.'
        },
        {
          label: 'Print Backgrounds',
          value: 'Check [✓] Print Backgrounds',
          important: true,
          tip: 'Enables background highlights, status badges, and watermark graphics.'
        },
        {
          label: 'Print headers and footers',
          value: 'Uncheck [ ]',
          tip: 'Suppresses system date and file path text on margins.'
        },
        {
          label: 'Margins',
          value: 'None or Borderless A4',
          important: true,
          tip: 'If available in your printer driver, choose "A4 (Borderless)".'
        },
        {
          label: 'Scale',
          value: '100%',
          tip: 'Do not scale above 100% to keep content inside the single A4 sheet.'
        }
      ]
    },
    mobile: {
      name: 'Mobile Devices',
      badge: 'Touch & Mobile',
      steps: [
        {
          label: 'Mobile Print Dialog',
          value: 'Tap Share / Browser Menu -> Print',
          important: true,
          tip: 'Use standard mobile AirPrint, Google Print, or system print dialog.'
        },
        {
          label: 'Paper Size',
          value: 'Select ISO A4 Sheet',
          important: true,
          tip: 'Ensures the voucher or invoice matches official international A4 sheet dimensions.'
        },
        {
          label: 'Scale & Margins',
          value: 'Set Scale to 100% or "Fit to Page", Margins to None',
          tip: 'Prevents multi-page spill on mobile viewports.'
        },
        {
          label: 'Save as PDF Option',
          value: 'Select "Save as PDF" in printer destination',
          tip: 'Both iOS and Android allow saving directly as PDF from the print preview screen.'
        }
      ]
    }
  };

  const currentConfig = browserConfigs[activeBrowser];

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display tracking-tight text-white">
                  Printer Settings & Troubleshooting Guide
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  {currentMode === 'invoice' ? 'Commercial Invoice' : 'Air Ticket Voucher'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Step-by-step browser configuration for pixel-perfect single-page A4 printing
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Printer Help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 bg-slate-50">
          
          {/* Quick Notice: Background Graphics Warning */}
          <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <span className="font-bold block text-amber-900 text-[13px] mb-0.5">
                The #1 Reason Prints Look Wrong: "Background Graphics" Disabled
              </span>
              <span>
                By default, web browsers strip header branding, table colors, and agency seals to save ink. 
                In your print dialog, expand <strong>"More Settings"</strong> and enable <strong>"Background graphics"</strong> [✓].
              </span>
            </div>
          </div>

          {/* Browser Selection Tabs */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Select Your Web Browser:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-200/80 rounded-xl border border-slate-300">
              {(['chrome', 'edge', 'firefox', 'safari', 'mobile'] as BrowserType[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setActiveBrowser(b)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    activeBrowser === b
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <span className="capitalize">{b === 'mobile' ? 'Mobile' : b}</span>
                  <span className="text-[9px] font-normal text-slate-400">
                    {b === 'chrome' ? 'Chrome' : b === 'edge' ? 'Edge' : b === 'firefox' ? 'Firefox' : b === 'safari' ? 'macOS' : 'Phone/Tablet'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Browser Instructions Card */}
          <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-display">
                  Recommended Settings for {currentConfig.name}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {currentConfig.badge}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Standard ISO A4 (210×297mm)</span>
            </div>

            {/* Steps List */}
            <div className="space-y-2.5">
              {currentConfig.steps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                    step.important 
                      ? 'bg-blue-50/60 border-blue-200' 
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      step.important 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {step.label}
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        {step.tip}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className={`inline-block px-2.5 py-1 text-xs font-mono font-bold rounded-md ${
                      step.important 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-white border border-slate-300 text-slate-800'
                    }`}>
                      {step.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Common Glitches & Troubleshooting Accordion */}
          <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-2xs flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Quick Solutions to Frequent Print Questions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  📄 Trailing 2nd Blank Page?
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Change <strong>Margins</strong> to <strong>"None"</strong> in the print dialog. Some default browser margins add a 5mm padding that triggers a page break.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  🎨 Colors / Watermarks Missing?
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Turn on <strong>"Background graphics"</strong> in More Settings. This forces the browser to print table fills, agency badges, and airline codes.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  🌐 URL & Date Printed on Margin?
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Uncheck <strong>"Headers and footers"</strong>. This removes the browser file link, timestamp, and page numbers from the document edge.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  📄 Save as Digital PDF?
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  In your browser's Print Dialog (Destination), select <strong>"Save as PDF"</strong> or <strong>"Microsoft Print to PDF"</strong> to generate a digital A4 PDF copy.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format: ISO 210mm × 297mm A4 Single-Page</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Print Action */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerPrint();
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Open Print Dialog</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
