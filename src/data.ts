import { TicketData } from './types';
import { DEFAULT_HASNAIN_LOGO } from './assets/defaultLogo';

export const sampleTickets: TicketData[] = [
  {
    id: 'default-1',
    customerName: '',
    paxNames: ['', '', '', ''],
    carrier: '',
    date: '',
    co: '',
    remarks: '',
    box2Remarks: '',
    pnr: '',
    phone: '',
    flight: '',
    sectors: '',
    returnDate: '',
    ticketNo: '',
    salesAmount: '',
    baseFare: '',
    tax: '',
    gross: '',
    commission: '',
    ait: '',
    net: '',
    cardNo: '',
    pax: '1',
    logo: DEFAULT_HASNAIN_LOGO,
    issuerSignature: '',
    foreignCurrency: 'USD',
    foreignAmount: '',
    exchangeRate: '',
    contributionMargin: '',
    keepGrossFare: false,
    createdAt: new Date().toISOString(),
  }
];

