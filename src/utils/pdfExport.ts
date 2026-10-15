import { TicketData } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toJpeg } from 'html-to-image';

/**
 * Downloads a high-definition A4 PDF directly from the rendered ticket voucher or invoice element.
 * Employs html2canvas with a fixed, unscaled sandbox container for rock-solid cross-browser rendering,
 * and falls back to html-to-image if needed.
 */
export async function downloadTicketPdf(
  elementId: string, 
  ticket: TicketData, 
  filenamePrefix: string = 'hasnain_voucher'
): Promise<boolean> {
  // First attempt to grab the clean, dedicated print-ready node if available
  const printTargetContainer = document.getElementById('ticket-pdf-target');
  const printReadyChild = (printTargetContainer?.querySelector('#agency-invoice-sheet, #ticket-a4-sheet') ||
    printTargetContainer?.querySelector('.print-page')?.firstElementChild ||
    printTargetContainer?.firstElementChild) as HTMLElement | null;

  const element = printReadyChild || document.getElementById(elementId);
  if (!element) {
    console.error(`Target sheet element not found for PDF export (checked #ticket-pdf-target and #${elementId}).`);
    return false;
  }

  // Create an off-screen sandbox container attached at viewport origin
  // This avoids negative coordinate offsets (e.g. left: -9999px) which cause blank canvas rasterizations.
  const sandbox = document.createElement('div');
  sandbox.id = 'pdf-render-sandbox';
  sandbox.style.position = 'fixed';
  sandbox.style.left = '0';
  sandbox.style.top = '0';
  sandbox.style.width = '794px';
  sandbox.style.height = '1123px';
  sandbox.style.zIndex = '-99999';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.overflow = 'hidden';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.opacity = '1';
  sandbox.style.visibility = 'visible';

  // Clone target element and normalize dimensions to standard A4 (794px x 1123px @ 96 DPI)
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = 'temp-pdf-export-clone';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.transform = 'none';
  clone.style.width = '794px';
  clone.style.height = '1123px';
  clone.style.minHeight = '1123px';
  clone.style.maxHeight = '1123px';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = '#ffffff';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.margin = '0';
  clone.style.opacity = '1';
  clone.style.visibility = 'visible';
  clone.style.overflow = 'hidden';

  // Strip all no-print elements from clone
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Wait for all embedded images (logos, signatures) to fully decode
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          setTimeout(resolve, 2000);
        });
      })
    );

    let imgData: string | null = null;

    // Primary strategy: html2canvas (proven, avoids SVG foreignObject decode issues)
    try {
      const canvas = await html2canvas(clone, {
        scale: 2, // 2x gives crisp ~300 DPI high-definition print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123,
        logging: false,
        imageTimeout: 15000,
      });

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        imgData = canvas.toDataURL('image/jpeg', 0.98);
      }
    } catch (h2cError) {
      console.warn('html2canvas rasterization failed, falling back to html-to-image:', h2cError);
    }

    // Secondary fallback: html-to-image
    if (!imgData) {
      imgData = await toJpeg(clone, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        skipFonts: true,
        cacheBust: false,
      });
    }

    if (!imgData) {
      console.error('Failed to generate image data from sheet element.');
      return false;
    }

    // Standard A4 dimensions in millimeters (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Clean filename
    const pnrStr = ticket.pnr ? `_${ticket.pnr.trim().toUpperCase()}` : '';
    const nameStr = ticket.customerName ? `_${ticket.customerName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}` : '';
    const filename = `${filenamePrefix}${pnrStr}${nameStr}.pdf`;

    // Attempt direct save, fallback to manual Blob download
    try {
      pdf.save(filename);
    } catch (saveError) {
      console.warn('pdf.save encountered an error, falling back to blob anchor download:', saveError);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => {
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    }

    return true;
  } catch (error) {
    console.error('Direct PDF generation error:', error);
    return false;
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}
