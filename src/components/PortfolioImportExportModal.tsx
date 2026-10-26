import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  FileSpreadsheet,
  ArrowRight,
  Database
} from 'lucide-react';
import { PortfolioHolding } from '../types';
import { api } from '../services/api';

interface PortfolioImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: PortfolioHolding[];
  onPortfolioUpdated: (updatedHoldings: PortfolioHolding[]) => void;
}

export const PortfolioImportExportModal: React.FC<PortfolioImportExportModalProps> = ({
  isOpen,
  onClose,
  holdings,
  onPortfolioUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [pastedData, setPastedData] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<Partial<PortfolioHolding>[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // EXPORT HANDLERS
  const handleExportCSV = () => {
    const headers = ['Ticker', 'Company Name', 'Quantity', 'Avg Buy Price', 'Current Price', 'Total Invested', 'Current Value', 'PnL ($)', 'PnL (%)'];
    const rows = holdings.map(h => [
      h.ticker,
      `"${h.companyName.replace(/"/g, '""')}"`,
      h.quantity,
      (h.avgBuyPrice || h.averageBuyPrice || 0).toFixed(2),
      h.currentPrice.toFixed(2),
      h.totalInvested.toFixed(2),
      h.currentValue.toFixed(2),
      h.pnl.toFixed(2),
      h.pnlPercent.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trade-vision-portfolio-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(holdings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trade-vision-portfolio-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(holdings, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // PARSER HELPER
  const parseRawContent = (content: string) => {
    setImportError(null);
    setImportSuccess(null);
    try {
      const trimmed = content.trim();
      if (!trimmed) {
        setParsedPreview(null);
        return;
      }

      // Check if JSON
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const normalized = list.map((item: any) => ({
          ticker: String(item.ticker || item.symbol || item.Instrument || item.Stock || '').toUpperCase().trim(),
          companyName: item.companyName || item.name || item.description || item.ticker || 'Holding',
          quantity: Number(item.quantity || item.shares || item.Qty || item.qty || 1),
          avgBuyPrice: Number(item.avgBuyPrice || item.averageBuyPrice || item.buyPrice || item.avg_price || item.Price || 100),
          currentPrice: Number(item.currentPrice || item.price || item.last_price || item.LTP || item.avgBuyPrice || 100),
        })).filter(h => h.ticker && h.quantity > 0);

        if (normalized.length === 0) {
          throw new Error('No valid holdings could be parsed from the JSON data.');
        }
        setParsedPreview(normalized);
        return;
      }

      // Parse CSV / TSV lines
      const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        throw new Error('Empty CSV data.');
      }

      // Skip header if first row has words like Ticker / Symbol / Stock
      const firstLineLower = lines[0].toLowerCase();
      const hasHeader = firstLineLower.includes('ticker') || firstLineLower.includes('symbol') || firstLineLower.includes('instrument');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const results: Partial<PortfolioHolding>[] = [];
      for (const line of dataLines) {
        // Handle comma or tab or semicolon
        const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
        const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 2) continue;

        const ticker = parts[0].toUpperCase();
        let qty = 1;
        let price = 100;
        let company = ticker;

        // Formats:
        // Format A: Ticker, Quantity, Price, (Company)
        // Format B: Ticker, Company, Quantity, Price
        if (parts.length >= 3) {
          if (!isNaN(Number(parts[1])) && !isNaN(Number(parts[2]))) {
            qty = Number(parts[1]);
            price = Number(parts[2]);
            if (parts[3]) company = parts[3];
          } else if (isNaN(Number(parts[1])) && !isNaN(Number(parts[2])) && !isNaN(Number(parts[3]))) {
            company = parts[1];
            qty = Number(parts[2]);
            price = Number(parts[3]);
          } else {
            qty = Number(parts[1]) || 1;
            price = Number(parts[2]) || 100;
          }
        } else {
          qty = Number(parts[1]) || 1;
        }

        if (ticker) {
          results.push({
            ticker,
            companyName: company || ticker,
            quantity: Math.max(1, qty),
            avgBuyPrice: Math.max(0.01, price),
            currentPrice: Math.max(0.01, price),
          });
        }
      }

      if (results.length === 0) {
        throw new Error('Unable to parse holdings from the CSV format provided.');
      }

      setParsedPreview(results);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse portfolio data. Verify format.');
      setParsedPreview(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedData(text);
      parseRawContent(text);
    };
    reader.onerror = () => {
      setImportError('Failed to read the uploaded file.');
    };
    reader.readAsText(file);
  };

  const handleApplyImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setIsSubmitting(true);
    setImportError(null);
    try {
      const response = await api.importPortfolioBatch({
        holdings: parsedPreview as any[],
        mode: importMode,
      });

      if (response && response.holdings) {
        onPortfolioUpdated(response.holdings);
        setImportSuccess(`Successfully imported ${parsedPreview.length} holdings into your active portfolio!`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error('Server did not return updated holdings.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to submit imported holdings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Portfolio Portability & Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export to CSV/JSON or import from brokers (Zerodha, Groww, Robinhood, Schwab, CSV)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Portfolio ({holdings.length} Positions)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import from File or Broker
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Export Your Holdings
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Download or copy your complete portfolio with live market valuations, cost basis, and profit metrics.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleExportCSV}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-sm transition-all group"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Download CSV</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Spreadsheet compatible</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-sm transition-all group"
                  >
                    <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Download JSON</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Full structured backup</span>
                  </button>

                  <button
                    onClick={handleCopyJSON}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-sm transition-all group"
                  >
                    {copied ? (
                      <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                    ) : (
                      <Copy className="w-8 h-8 text-slate-600 dark:text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {copied ? 'Copied to Clipboard!' : 'Copy Raw JSON'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Quick programmatic sync</span>
                  </button>
                </div>
              </div>

              {/* Summary table preview */}
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Positions Included ({holdings.length})
                </h5>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Ticker</th>
                        <th className="py-2 px-3">Shares</th>
                        <th className="py-2 px-3 text-right">Avg Price</th>
                        <th className="py-2 px-3 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {holdings.map(h => (
                        <tr key={h.id || h.ticker}>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{h.ticker}</td>
                          <td className="py-2 px-3">{h.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono">${(h.avgBuyPrice || h.averageBuyPrice || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">${h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* IMPORT VIEW */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Import Portfolio Holdings
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload a CSV/JSON file or paste comma-separated data.
                  </p>
                </div>

                {/* Import mode radio */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <button
                    onClick={() => setImportMode('append')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      importMode === 'append' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Merge (Append)
                  </button>
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      importMode === 'replace' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Overwrite Portfolio
                  </button>
                </div>
              </div>

              {/* Upload trigger */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Select File from Computer
                </button>
                <span className="text-xs text-slate-400">or paste text below:</span>
              </div>

              {/* Paste Textarea */}
              <div>
                <textarea
                  rows={4}
                  value={pastedData}
                  onChange={(e) => {
                    setPastedData(e.target.value);
                    parseRawContent(e.target.value);
                  }}
                  placeholder={'Ticker, Quantity, BuyPrice\nAAPL, 15, 185.50\nRELIANCE, 25, 2900.00\nNVDA, 10, 850.00\nMSFT, 8, 410.00'}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Errors & Success */}
              {importError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/60">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreview && parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Parsed Preview ({parsedPreview.length} Valid Holdings Found):</span>
                    <span className="text-[11px] text-slate-400">Ready to sync</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Ticker</th>
                          <th className="py-2 px-3">Qty</th>
                          <th className="py-2 px-3 text-right">Cost Basis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedPreview.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{item.ticker}</td>
                            <td className="py-2 px-3">{item.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">${(item.avgBuyPrice || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
          {activeTab === 'import' && (
            <button
              onClick={handleApplyImport}
              disabled={!parsedPreview || parsedPreview.length === 0 || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <span>Commit to Portfolio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default PortfolioImportExportModal;
