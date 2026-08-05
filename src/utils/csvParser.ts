import { TicketData } from '../types';
import { DEFAULT_HASNAIN_LOGO } from '../assets/defaultLogo';

export interface CsvImportRecord {
  id: string;
  issueDate: string;
  pnr: string;
  name: string;
  ticketNo: string;
  type: string;
  airCode: string;
  travelDate: string;
  route: string;
  baseFare: string;
  taxAmount: string;
  totalFare: string;
  markUp: string;
  officePayment: string;
  ref: string;
  customerName: string;
  paxName1: string;
  paxName2: string;
  paxName3: string;
  paxName4: string;
  co: string;
  remarks: string;
  box2Remarks: string;
  phone: string;
  returnDate: string;
  salesAmount: string;
  gross: string;
  commission: string;
  ait: string;
  net: string;
  cardNo: string;
  pax: string;
  foreignCurrency: string;
  foreignAmount: string;
  exchangeRate: string;
  contributionMargin: string;
  keepGrossFare: string;
  ticketData: TicketData;
}

export function parseCsvDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // Pattern like 28Jul26, 07Aug26, 28-Jul-26
  const matchAlpha = clean.match(/^(\d{1,2})[-/\s]?([A-Za-z]{3})[-/\s]?(\d{2,4})$/);
  if (matchAlpha) {
    const day = matchAlpha[1].padStart(2, '0');
    const monthStr = matchAlpha[2].toLowerCase();
    let yearStr = matchAlpha[3];
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

  // Try standard Date parsing
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return clean;
}

export function formatRoute(routeStr: string): string {
  if (!routeStr) return '';
  const clean = routeStr.trim().toUpperCase();
  if (clean.length === 6 && !clean.includes('-') && !clean.includes(' ')) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

export function parseCSVText(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export function parseCsvToRecords(
  csvText: string,
  groupByPnr: boolean = false,
  logo: string = DEFAULT_HASNAIN_LOGO,
  signature: string = ''
): CsvImportRecord[] {
  if (!csvText || csvText.length > 10 * 1024 * 1024) return []; // 10MB safety cap
  const finalLogo = logo || DEFAULT_HASNAIN_LOGO;
  let rows = parseCSVText(csvText);
  if (rows.length < 2) return [];
  if (rows.length > 2500) {
    rows = rows.slice(0, 2500); // Cap max parsed rows to 2500 to prevent browser memory freeze
  }

  // Find header indices
  const headers = rows[0].map(h => h.trim().toLowerCase());
  
  const getIndex = (possibleNames: string[]) => {
    const exactIndex = headers.findIndex(h => possibleNames.some(p => h === p));
    if (exactIndex >= 0) return exactIndex;
    return headers.findIndex(h => possibleNames.some(p => h.includes(p)));
  };

  const parseBool = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'gross', 'locked'].includes(normalized);
  };

  const cleanNumber = (value: string) => value.replace(/,/g, '').trim();
  const roundedText = (value: string) => {
    const parsed = parseFloat(cleanNumber(value));
    return parsed > 0 ? Math.round(parsed).toString() : '';
  };

  const idxIssueDate = getIndex(['issue date', 'date', 'issued']);
  const idxPnr = getIndex(['pnr']);
  const idxCustomerName = getIndex(['customer name', 'client name', 'saved name']);
  const idxName = getIndex(['name', 'passenger', 'pax']);
  const idxPaxName1 = getIndex(['pax name 1', 'passenger 1', 'pax1', 'pax 1']);
  const idxPaxName2 = getIndex(['pax name 2', 'passenger 2', 'pax2', 'pax 2']);
  const idxPaxName3 = getIndex(['pax name 3', 'passenger 3', 'pax3', 'pax 3']);
  const idxPaxName4 = getIndex(['pax name 4', 'passenger 4', 'pax4', 'pax 4']);
  const idxTicketNo = getIndex(['ticket number', 'ticket no', 'ticket']);
  const idxType = getIndex(['type']);
  const idxAirCode = getIndex(['air code', 'air', 'airline', 'carrier']);
  const idxTravelDate = getIndex(['travel date', 'flight date', 'fly date']);
  const idxRoute = getIndex(['route', 'sector']);
  const idxBaseFare = getIndex(['base fare', 'base']);
  const idxTaxAmount = getIndex(['tax amount', 'tax']);
  const idxTotalFare = getIndex(['total fare', 'total', 'gross']);
  const idxGross = getIndex(['gross fare', 'gross']);
  const idxCommission = getIndex(['commission', 'comm']);
  const idxAit = getIndex(['ait']);
  const idxNet = getIndex(['net amount', 'net']);
  const idxSalesAmount = getIndex(['sales amount', 'sales']);
  const idxMarkUp = getIndex(['mark up', 'markup', 'margin', 'contribution margin', 'contribution_margin', 'contribution', 'cm']);
  const idxOfficePayment = getIndex(['office payment', 'office', 'net', 'payment']);
  const idxRef = getIndex(['ref', 'reference', 'c/o']);
  const idxCo = getIndex(['c/o', 'co', 'care of', 'client', 'm/s']);
  const idxRemarks = getIndex(['remarks', 'remark']);
  const idxBox2Remarks = getIndex(['box2 remarks', 'box 2 remarks', 'second remarks', 'ledger remarks']);
  const idxPhone = getIndex(['phone', 'mobile', 'contact']);
  const idxReturnDate = getIndex(['return date', 'return']);
  const idxCardNo = getIndex(['card no', 'card number', 'card']);
  const idxPax = getIndex(['pax count', 'pax total', 'no of pax', 'pax']);
  const idxForeignCurrency = getIndex(['foreign currency', 'currency']);
  const idxForeignAmount = getIndex(['foreign amount', 'foreign amt']);
  const idxExchangeRate = getIndex(['exchange rate', 'rate']);
  const idxKeepGrossFare = getIndex(['keep gross fare', 'keep gross', 'gross lock']);

  const parsedRawRows = rows.slice(1).map((row, rIdx) => {
    const getValue = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] : '');
    return {
      rawId: `row-${rIdx}-${Date.now()}`,
      issueDate: getValue(idxIssueDate),
      pnr: getValue(idxPnr).toUpperCase(),
      name: getValue(idxName).toUpperCase(),
      customerName: getValue(idxCustomerName),
      paxName1: getValue(idxPaxName1).toUpperCase(),
      paxName2: getValue(idxPaxName2).toUpperCase(),
      paxName3: getValue(idxPaxName3).toUpperCase(),
      paxName4: getValue(idxPaxName4).toUpperCase(),
      ticketNo: getValue(idxTicketNo),
      type: getValue(idxType).toUpperCase(),
      airCode: getValue(idxAirCode).toUpperCase(),
      travelDate: getValue(idxTravelDate),
      route: getValue(idxRoute).toUpperCase(),
      baseFare: getValue(idxBaseFare),
      taxAmount: getValue(idxTaxAmount),
      totalFare: getValue(idxTotalFare),
      gross: getValue(idxGross),
      commission: getValue(idxCommission),
      ait: getValue(idxAit),
      net: getValue(idxNet),
      salesAmount: getValue(idxSalesAmount),
      markUp: getValue(idxMarkUp),
      officePayment: getValue(idxOfficePayment),
      ref: getValue(idxRef),
      co: getValue(idxCo),
      remarks: getValue(idxRemarks),
      box2Remarks: getValue(idxBox2Remarks),
      phone: getValue(idxPhone),
      returnDate: getValue(idxReturnDate),
      cardNo: getValue(idxCardNo),
      pax: getValue(idxPax),
      foreignCurrency: getValue(idxForeignCurrency).toUpperCase(),
      foreignAmount: getValue(idxForeignAmount),
      exchangeRate: getValue(idxExchangeRate),
      contributionMargin: getValue(idxMarkUp),
      keepGrossFare: getValue(idxKeepGrossFare),
    };
  }).filter(r => r.name || r.paxName1 || r.ticketNo || r.pnr);

  if (!groupByPnr) {
    return parsedRawRows.map((r, i) => {
      const issueDateParsed = parseCsvDate(r.issueDate);
      const travelDateParsed = parseCsvDate(r.travelDate);
      const formattedSectors = formatRoute(r.route);

      const base = parseFloat(r.baseFare) || 0;
      const taxNum = parseFloat(r.taxAmount) || 0;
      const totalNum = parseFloat(r.totalFare) || (base + taxNum);
      const commNum = base * 0.07;
      const aitNum = (base + taxNum - commNum) * 0.003;
      const netNum = base + taxNum - commNum + aitNum;
      const marginNum = parseFloat(r.markUp) || 0;
      const paxNames = [
        r.paxName1 || r.name || '',
        r.paxName2 || '',
        r.paxName3 || '',
        r.paxName4 || '',
      ];

      const cardNo = r.cardNo || Math.floor(100000 + Math.random() * 900000).toString();
      const detectedPaxCount = paxNames.filter(Boolean).length;
      const paxCount = r.pax || (detectedPaxCount > 0 ? detectedPaxCount.toString() : '1');

      const ticketData: TicketData = {
        id: `csv-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        customerName: r.customerName || r.name || r.paxName1 || 'Client',
        paxNames,
        carrier: r.airCode || '',
        date: issueDateParsed,
        co: r.ref || r.co || '',
        remarks: r.remarks || (r.type ? `Type: ${r.type}` : ''),
        box2Remarks: r.box2Remarks || (r.officePayment ? `Office Payment: ${r.officePayment}` : ''),
        pnr: r.pnr || '',
        phone: r.phone || '',
        flight: travelDateParsed,
        sectors: formattedSectors,
        returnDate: parseCsvDate(r.returnDate),
        ticketNo: r.ticketNo || '',
        salesAmount: roundedText(r.salesAmount) || ((netNum + marginNum) > 0 ? Math.round(netNum + marginNum).toString() : (totalNum > 0 ? Math.round(totalNum).toString() : '')),
        baseFare: base > 0 ? Math.round(base).toString() : '',
        tax: taxNum > 0 ? Math.round(taxNum).toString() : '',
        gross: roundedText(r.gross) || (totalNum > 0 ? Math.round(totalNum).toString() : (base + taxNum > 0 ? Math.round(base + taxNum).toString() : '')),
        commission: roundedText(r.commission) || (commNum > 0 ? Math.round(commNum).toString() : ''),
        ait: roundedText(r.ait) || (aitNum > 0 ? Math.round(aitNum).toString() : ''),
        net: roundedText(r.net) || (netNum > 0 ? Math.round(netNum).toString() : ''),
        cardNo: cardNo,
        pax: paxCount,
        logo: finalLogo,
        issuerSignature: signature,
        foreignCurrency: r.foreignCurrency || 'USD',
        foreignAmount: cleanNumber(r.foreignAmount),
        exchangeRate: cleanNumber(r.exchangeRate),
        contributionMargin: roundedText(r.contributionMargin) || (marginNum > 0 ? Math.round(marginNum).toString() : ''),
        keepGrossFare: parseBool(r.keepGrossFare),
        createdAt: new Date().toISOString(),
      };

      return {
        ...r,
        id: ticketData.id,
        ticketData,
      };
    });
  } else {
    // Group rows by PNR
    const pnrGroups = new Map<string, typeof parsedRawRows>();
    parsedRawRows.forEach(r => {
      const key = r.pnr || `NO_PNR_${r.rawId}`;
      if (!pnrGroups.has(key)) {
        pnrGroups.set(key, []);
      }
      pnrGroups.get(key)!.push(r);
    });

    const records: CsvImportRecord[] = [];
    let groupCounter = 0;

    pnrGroups.forEach((group, pnrKey) => {
      // Chunk groups into max 4 pax per ticket voucher
      for (let c = 0; c < group.length; c += 4) {
        groupCounter++;
        const chunk = group.slice(c, c + 4);
        const first = chunk[0];

        const paxNames = ['', '', '', ''];
        chunk.forEach((item, idx) => {
          paxNames[idx] = item.name;
        });

        const ticketNos = chunk.map(item => item.ticketNo).filter(Boolean).join(', ');
        const totalBase = chunk.reduce((sum, item) => sum + (parseFloat(item.baseFare) || 0), 0);
        const totalTax = chunk.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
        const totalFareSum = chunk.reduce((sum, item) => sum + (parseFloat(item.totalFare) || 0), 0);
        const totalMargin = chunk.reduce((sum, item) => sum + (parseFloat(item.markUp) || 0), 0);

        const issueDateParsed = parseCsvDate(first.issueDate);
        const travelDateParsed = parseCsvDate(first.travelDate);
        const formattedSectors = formatRoute(first.route);

        const commNum = totalBase * 0.07;
        const aitNum = (totalBase + totalTax - commNum) * 0.003;
        const netNum = totalBase + totalTax - commNum + aitNum;
        const cardNo = first.cardNo || Math.floor(100000 + Math.random() * 900000).toString();

        const custName = chunk.length > 1 
          ? `${first.name} (+${chunk.length - 1} pax)`
          : (first.name || 'Client');

        const ticketData: TicketData = {
          id: `csv-group-${Date.now()}-${groupCounter}-${Math.floor(Math.random() * 1000)}`,
          customerName: first.customerName || custName,
          paxNames: paxNames,
          carrier: first.airCode || '',
          date: issueDateParsed,
          co: first.ref || first.co || '',
          remarks: first.remarks || (first.type ? `Type: ${first.type} (${chunk.length} PAX)` : `${chunk.length} PAX`),
          box2Remarks: first.box2Remarks || (first.officePayment ? `Office Payment: ${first.officePayment}` : ''),
          pnr: first.pnr || '',
          phone: first.phone || '',
          flight: travelDateParsed,
          sectors: formattedSectors,
          returnDate: parseCsvDate(first.returnDate),
          ticketNo: ticketNos,
          salesAmount: roundedText(first.salesAmount) || ((netNum + totalMargin) > 0 ? Math.round(netNum + totalMargin).toString() : (totalFareSum > 0 ? Math.round(totalFareSum).toString() : '')),
          baseFare: totalBase > 0 ? Math.round(totalBase).toString() : '',
          tax: totalTax > 0 ? Math.round(totalTax).toString() : '',
          gross: roundedText(first.gross) || (totalFareSum > 0 ? Math.round(totalFareSum).toString() : (totalBase + totalTax > 0 ? Math.round(totalBase + totalTax).toString() : '')),
          commission: roundedText(first.commission) || (commNum > 0 ? Math.round(commNum).toString() : ''),
          ait: roundedText(first.ait) || (aitNum > 0 ? Math.round(aitNum).toString() : ''),
          net: roundedText(first.net) || (netNum > 0 ? Math.round(netNum).toString() : ''),
          cardNo: cardNo,
          pax: first.pax || chunk.length.toString(),
          logo: finalLogo,
          issuerSignature: signature,
          foreignCurrency: first.foreignCurrency || 'USD',
          foreignAmount: cleanNumber(first.foreignAmount),
          exchangeRate: cleanNumber(first.exchangeRate),
          contributionMargin: roundedText(first.contributionMargin) || (totalMargin > 0 ? Math.round(totalMargin).toString() : ''),
          keepGrossFare: parseBool(first.keepGrossFare),
          createdAt: new Date().toISOString(),
        };

        records.push({
          id: ticketData.id,
          issueDate: first.issueDate,
          pnr: first.pnr,
          name: custName,
          ticketNo: ticketNos,
          type: first.type,
          airCode: first.airCode,
          travelDate: first.travelDate,
          route: first.route,
          baseFare: totalBase > 0 ? totalBase.toString() : '',
          taxAmount: totalTax > 0 ? totalTax.toString() : '',
          totalFare: totalFareSum > 0 ? totalFareSum.toString() : '',
          markUp: totalMargin > 0 ? totalMargin.toString() : '',
          officePayment: first.officePayment,
          ref: first.ref,
          customerName: first.customerName,
          paxName1: paxNames[0],
          paxName2: paxNames[1],
          paxName3: paxNames[2],
          paxName4: paxNames[3],
          co: first.co,
          remarks: first.remarks,
          box2Remarks: first.box2Remarks,
          phone: first.phone,
          returnDate: first.returnDate,
          salesAmount: first.salesAmount,
          gross: first.gross,
          commission: first.commission,
          ait: first.ait,
          net: first.net,
          cardNo: first.cardNo,
          pax: first.pax,
          foreignCurrency: first.foreignCurrency,
          foreignAmount: first.foreignAmount,
          exchangeRate: first.exchangeRate,
          contributionMargin: first.contributionMargin,
          keepGrossFare: first.keepGrossFare,
          ticketData: ticketData,
        });
      }
    });

    return records;
  }
}

export const SAMPLE_CSV_CONTENT = `Issue Date,PNR,Name,Ticket Number,Type,Air Code,Travel Date,Route,Base Fare,Tax Amount,Total Fare,Mark Up,Office Payment,Ref
04-Aug-26,SKIDJD,RAHMAN/MOSTAFIZUR MR,9974883754463,D,BG,06-Aug-26,CGP-DAC,8024,1225,9249,,8715,TORAG
04-Aug-26,QGSFLK,BEGUM/MAJEDA MRS,9974883754460,I,BG,09-Aug-26,CGP-JED-DAC-CXB,89415,17680,107095,,101157,AYNAT
04-Aug-26,JTMTXM,HQOUE/MOHAMMED JAHEDUL MR,9974883754459,I,BG,08-Aug-26,CGP-DXB,38233,10699,48932,,46402,AYNAT`;
