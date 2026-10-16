import { DEFAULT_HASNAIN_LOGO } from './assets/defaultLogo';

export interface TicketData {
  id: string;
  customerName: string; // Internal name for saved history reference
  paxNames: string[];  // 4 rows of passenger names
  carrier: string;
  date: string;
  co: string;          // Care of / Corporate account
  remarks: string;     // Remarks
  box2Remarks?: string; // Remarks in 2nd box
  pnr: string;
  phone: string;
  issuer?: string;
  flight: string;      // Flight details text area content
  sectors: string;     // Sectors details text area content
  returnDate: string;  // Return details text area content
  ticketNo: string;
  salesAmount: string;
  baseFare: string;
  tax: string;
  gross: string;
  commission: string;  // Commission (Base Fare * 7%)
  ait: string;         // AIT ((Base Fare + Tax - Commission) * 0.3%)
  net: string;
  cardNo: string;      // Automatic unique 6-digit card number
  pax: string;         // Number of pax
  logo: string;        // Base64 logo uploaded by user
  issuerSignature?: string; // Base64 signature uploaded by user
  foreignCurrency: string; // Currency selection (e.g., USD, AED, SAR)
  foreignAmount: string;   // Foreign amount input
  exchangeRate: string;    // Exchange rate input
  contributionMargin: string; // Additional markup margin
  keepGrossFare: boolean;     // Flag to lock sales to gross fare
  showDiscount?: boolean;     // Option to show discount on invoice
  discount?: string;          // Discount amount in BDT
  invoiceItemDesc?: string;   // Customizable line item description
  invoiceBankName?: string;   // Customizable Bank Name
  invoiceAccountName?: string;// Customizable A/C Name
  invoiceBranch?: string;     // Customizable Branch
  invoiceAccountNo?: string;  // Customizable Account No
  invoicePaymentRef?: string; // Customizable payment instructions
  invoiceTicketRules?: string;// Customizable ticket rules
  invoiceTravelDocs?: string; // Customizable travel documents
  invoiceOfficialDoc?: string;// Customizable official document note
  hideBankDetails?: boolean;  // Option to hide bank details box
  hideTerms?: boolean;        // Option to hide terms & conditions
  createdAt: string;
}

export const emptyTicket: TicketData = {
  id: '',
  customerName: 'New Client Invoice',
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
  pax: '',
  logo: DEFAULT_HASNAIN_LOGO,
  issuerSignature: '',
  foreignCurrency: 'USD',
  foreignAmount: '',
  exchangeRate: '',
  contributionMargin: '',
  keepGrossFare: false,
  showDiscount: false,
  discount: '',
  createdAt: '',
};
