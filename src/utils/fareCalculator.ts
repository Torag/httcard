import { TicketData } from '../types';

export function calculateFareFields<K extends keyof TicketData>(
  data: TicketData, 
  updatedField: K, 
  value: TicketData[K]
): TicketData {
  const updated: TicketData = { ...data, [updatedField]: value };
  
  if (
    updatedField === 'baseFare' || 
    updatedField === 'tax' || 
    updatedField === 'contributionMargin' || 
    updatedField === 'keepGrossFare' ||
    updatedField === 'foreignAmount' ||
    updatedField === 'exchangeRate'
  ) {
    const base = parseFloat(updated.baseFare) || 0;
    const tax = parseFloat(updated.tax) || 0;
    const margin = parseFloat(updated.contributionMargin) || 0;
    const keepGross = updated.keepGrossFare;
    const foreignAmt = parseFloat(updated.foreignAmount) || 0;
    const rate = parseFloat(updated.exchangeRate) || 0;
    
    const grossNum = base + tax;
    const commNum = base * 0.07;
    const aitNum = (base + tax - commNum) * 0.003;
    
    let netNum = base + tax - commNum + aitNum;
    if (foreignAmt > 0 && rate > 0) {
      const res = foreignAmt * rate;
      netNum = res + (res * 0.003);
    }
    
    updated.gross = grossNum > 0 ? Math.round(grossNum).toString() : '';
    updated.commission = commNum > 0 ? Math.round(commNum).toString() : '';
    updated.ait = aitNum > 0 ? Math.round(aitNum).toString() : '';
    updated.net = netNum > 0 ? Math.round(netNum).toString() : '';
    
    // Calculate sales amount based on rules
    if (keepGross) {
      updated.salesAmount = grossNum > 0 ? Math.round(grossNum).toString() : '';
    } else {
      const finalNet = netNum > 0 ? Math.round(netNum) : 0;
      updated.salesAmount = (finalNet + margin) > 0 ? Math.round(finalNet + margin).toString() : '';
    }
  }
  
  return updated;
}
