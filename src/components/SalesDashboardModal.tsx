import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Plane, 
  Users, 
  Building2, 
  Download, 
  X,
  CreditCard,
  Percent
} from 'lucide-react';
import { TicketData } from '../types';

interface SalesDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: TicketData[];
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

export function SalesDashboardModal({
  isOpen,
  onClose,
  tickets,
}: SalesDashboardModalProps) {
  const [filter, setFilter] = useState<DateFilter>('month');

  // Filter tickets by selected timeframe
  const filteredTickets = useMemo(() => {
    if (filter === 'all') return tickets;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return tickets.filter(t => {
      if (!t.date && !t.createdAt) return false;
      const tDateStr = t.date || (t.createdAt ? t.createdAt.split('T')[0] : '');

      if (filter === 'today') {
        return tDateStr === todayStr;
      }

      const tTime = new Date(tDateStr).getTime();
      if (isNaN(tTime)) return false;

      const diffDays = (now.getTime() - tTime) / (1000 * 60 * 60 * 24);

      if (filter === 'week') {
        return diffDays <= 7;
      }
      if (filter === 'month') {
        return diffDays <= 30;
      }

      return true;
    });
  }, [tickets, filter]);

  // Aggregate financial metrics
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalGross = 0;
    let totalBase = 0;
    let totalTax = 0;
    let totalCommission = 0;
    let totalAit = 0;
    let totalNet = 0;
    let totalPax = 0;

    const airlineMap: Record<string, { count: number; sales: number }> = {};
    const routeMap: Record<string, { count: number; sales: number }> = {};
    const coMap: Record<string, { count: number; sales: number }> = {};

    filteredTickets.forEach(t => {
      const sales = parseFloat(t.salesAmount) || parseFloat(t.gross) || 0;
      const gross = parseFloat(t.gross) || 0;
      const base = parseFloat(t.baseFare) || 0;
      const tax = parseFloat(t.tax) || 0;
      const comm = parseFloat(t.commission) || (base * 0.07);
      const ait = parseFloat(t.ait) || ((base + tax - comm) * 0.003);
      const net = parseFloat(t.net) || (base + tax - comm + ait);
      const pax = parseInt(t.pax) || (t.paxNames ? t.paxNames.filter(Boolean).length : 1) || 1;

      totalSales += sales;
      totalGross += gross;
      totalBase += base;
      totalTax += tax;
      totalCommission += comm;
      totalAit += ait;
      totalNet += net;
      totalPax += pax;

      // Group by Airline
      const carrier = (t.carrier || 'Other').toUpperCase();
      if (!airlineMap[carrier]) airlineMap[carrier] = { count: 0, sales: 0 };
      airlineMap[carrier].count += 1;
      airlineMap[carrier].sales += sales;

      // Group by Route
      const route = (t.sectors || 'Unassigned').toUpperCase();
      if (!routeMap[route]) routeMap[route] = { count: 0, sales: 0 };
      routeMap[route].count += 1;
      routeMap[route].sales += sales;

      // Group by C/O Account
      const co = (t.co || 'Direct Client').toUpperCase();
      if (!coMap[co]) coMap[co] = { count: 0, sales: 0 };
      coMap[co].count += 1;
      coMap[co].sales += sales;
    });

    // Net Agency Profit = Sales Amount - Net Amount (or markup + commission - ait)
    const totalAgencyProfit = totalSales - totalNet;

    const topAirlines = Object.entries(airlineMap)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const topRoutes = Object.entries(routeMap)
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const topAccounts = Object.entries(coMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    return {
      totalSales: Math.round(totalSales),
      totalGross: Math.round(totalGross),
      totalBase: Math.round(totalBase),
      totalTax: Math.round(totalTax),
      totalCommission: Math.round(totalCommission),
      totalAit: Math.round(totalAit),
      totalNet: Math.round(totalNet),
      totalAgencyProfit: Math.round(totalAgencyProfit),
      totalPax,
      voucherCount: filteredTickets.length,
      topAirlines,
      topRoutes,
      topAccounts,
    };
  }, [filteredTickets]);

  if (!isOpen) return null;

  // Export summary report to CSV
  const handleExportCsv = () => {
    const csvRows = [
      ['Hasnain Travels & Tours - Sales Analytics Report'],
      ['Timeframe', filter.toUpperCase()],
      ['Generated Date', new Date().toISOString()],
      [''],
      ['Metric', 'Amount (BDT)'],
      ['Total Sales Volume', metrics.totalSales],
      ['Total Gross Fare', metrics.totalGross],
      ['Total Net Cost', metrics.totalNet],
      ['Net Agency Profit Margin', metrics.totalAgencyProfit],
      ['Total Commission', metrics.totalCommission],
      ['Total AIT Deducted', metrics.totalAit],
      ['Total Vouchers Issued', metrics.voucherCount],
      ['Total Passengers (PAX)', metrics.totalPax],
      [''],
      ['Top Airlines', 'Vouchers', 'Sales (BDT)'],
      ...metrics.topAirlines.map(a => [a.code, a.count, a.sales]),
      [''],
      ['Top Routes', 'Vouchers', 'Sales (BDT)'],
      ...metrics.topRoutes.map(r => [r.route, r.count, r.sales]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hasnain_sales_summary_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight text-white flex items-center gap-2">
                Agency Sales & Profit Analytics
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Hasnain Travels & Tours ticketing sales, profit margins, and route insights
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 bg-slate-50">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setFilter('today')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filter === 'today' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setFilter('week')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filter === 'week' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setFilter('month')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filter === 'month' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time ({tickets.length})
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Summary CSV
            </button>
          </div>

          {/* Primary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Total Sales */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Sales Volume
              </span>
              <div className="text-xl font-mono font-extrabold text-blue-700">
                ৳ {metrics.totalSales.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">
                {metrics.voucherCount} vouchers issued
              </span>
            </div>

            {/* Total Agency Profit */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-2xs flex flex-col gap-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                Net Agency Profit
              </span>
              <div className="text-xl font-mono font-extrabold text-emerald-800">
                ৳ {metrics.totalAgencyProfit.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-700">
                Markup + 7% Comm - AIT
              </span>
            </div>

            {/* Total Gross Published Fare */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Gross Airline Fare
              </span>
              <div className="text-xl font-mono font-extrabold text-slate-800">
                ৳ {metrics.totalGross.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">
                Net Cost: ৳ {metrics.totalNet.toLocaleString()}
              </span>
            </div>

            {/* Passenger Count */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-600" />
                Passengers Handled
              </span>
              <div className="text-xl font-mono font-extrabold text-slate-800">
                {metrics.totalPax} PAX
              </div>
              <span className="text-[10px] text-slate-400">
                Avg ৳ {metrics.totalPax > 0 ? Math.round(metrics.totalSales / metrics.totalPax).toLocaleString() : 0} / PAX
              </span>
            </div>

          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Top Airlines */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Plane className="w-3.5 h-3.5 text-blue-600" />
                Top Airlines
              </span>
              {metrics.topAirlines.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {metrics.topAirlines.map(a => (
                    <div key={a.code} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="w-7 text-center py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono">
                          {a.code}
                        </span>
                        <span className="text-slate-500 font-normal">({a.count} tkts)</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        ৳ {a.sales.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 py-3 text-center">No airline data</span>
              )}
            </div>

            {/* Top Routes */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Top Sectors / Routes
              </span>
              {metrics.topRoutes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {metrics.topRoutes.map(r => (
                    <div key={r.route} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono">
                          {r.route}
                        </span>
                        <span className="text-slate-500 font-normal">({r.count})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        ৳ {r.sales.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 py-3 text-center">No route data</span>
              )}
            </div>

            {/* Top Accounts */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                Top Accounts (C/O)
              </span>
              {metrics.topAccounts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {metrics.topAccounts.map(ac => (
                    <div key={ac.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 max-w-[150px] truncate" title={ac.name}>
                        <span className="truncate">{ac.name}</span>
                        <span className="text-slate-500 font-normal shrink-0">({ac.count})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 shrink-0">
                        ৳ {ac.sales.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 py-3 text-center">No account data</span>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600 font-bold">
            Based on {filteredTickets.length} saved vouchers
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
