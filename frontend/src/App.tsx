import React, { useEffect, useState } from "react";
import {
  Building2,
  WalletCards,
  TrendingUp,
  TrendingDown,
  Activity,
  Briefcase,
  History,
} from "lucide-react";

interface Trade {
  id: number;
  marketId: string;
  marketName: string;
  direction: "YES" | "NO";
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  exitAt?: string;
  strategy?: string;
}

interface Portfolio {
  startingBalance: number;
  cash: number;
  realizedPnl: number;
  capitalDeployed: number;
  openPositionCount: number;
  closedTradeCount: number;
  positions: Trade[];
}

export default function App() {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("polly_api_key") || "",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !apiKey) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const headers = {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        };

        const [portfolioRes, tradesRes] = await Promise.all([
          fetch("/api/trades/portfolio", { headers }),
          fetch("/api/trades?status=OPEN", { headers }),
        ]);

        if (!portfolioRes.ok || !tradesRes.ok) {
          if (portfolioRes.status === 401 || tradesRes.status === 401) {
            setIsAuthenticated(false);
            localStorage.removeItem("polly_api_key");
            throw new Error("Invalid API Key");
          }
          throw new Error(
            "Failed to fetch data. Check your API key and whether the server is running.",
          );
        }

        const portfolioData = await portfolioRes.json();
        const tradesData = await tradesRes.json();

        setPortfolio(portfolioData);
        setTrades(tradesData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, apiKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("polly_api_key", apiKey.trim());
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("polly_api_key");
    setApiKey("");
    setIsAuthenticated(false);
    setPortfolio(null);
    setTrades([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-500/10 p-4 rounded-full border border-blue-500/20 mb-4">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-50">
              Polly Authentication
            </h1>
            <p className="text-slate-400 text-sm mt-2 text-center">
              Enter your runtime API key to connect to the Polly agent backend.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-slate-400 mb-1"
              >
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                placeholder="i1u2e19nu1c029eu1209ecun..."
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
            >
              Connect to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !portfolio) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Activity className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-lg w-full text-center">
          <p className="text-red-400 font-medium mb-2">Error Loading Data</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 pb-20 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">
                Polly Dashboard
              </h1>
              <p className="text-sm text-slate-400 tracking-wide">
                Automated Prediction Market Trading
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-sm text-slate-400 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span>Connected</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Portfolio Stats */}
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Cash"
              value={`$${portfolio.cash.toFixed(2)}`}
              icon={<WalletCards />}
              trend={portfolio.realizedPnl >= 0 ? "up" : "down"}
              subtitle={`Starting: $${portfolio.startingBalance.toFixed(2)}`}
            />
            <StatCard
              title="Realized PnL"
              value={`$${Math.abs(portfolio.realizedPnl).toFixed(2)}`}
              icon={
                portfolio.realizedPnl >= 0 ? <TrendingUp /> : <TrendingDown />
              }
              trend={portfolio.realizedPnl >= 0 ? "up" : "down"}
              valuePrefix={portfolio.realizedPnl >= 0 ? "+" : "-"}
            />
            <StatCard
              title="Capital Deployed"
              value={`$${portfolio.capitalDeployed.toFixed(2)}`}
              icon={<Briefcase />}
              subtitle={`${portfolio.openPositionCount} open position${portfolio.openPositionCount !== 1 ? "s" : ""}`}
            />
            <StatCard
              title="Total Trades"
              value={(
                portfolio.openPositionCount + portfolio.closedTradeCount
              ).toString()}
              icon={<History />}
              subtitle={`${portfolio.closedTradeCount} closed trades`}
            />
          </div>
        )}

        {/* Open Trades Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-50 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span>Active Positions</span>
            </h2>
            <span className="text-xs font-medium bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
              {trades.length} Open
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950/50 text-slate-300 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Market</th>
                  <th className="px-6 py-4 font-medium">Position</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Entry Price
                  </th>
                  <th className="px-6 py-4 font-medium text-right">Quantity</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Total Cost
                  </th>
                  <th className="px-6 py-4 font-medium">Strategy</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Entry Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trades.length > 0 ? (
                  trades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div
                          className="font-medium text-slate-200 truncate max-w-xs group-hover:text-blue-400 transition-colors"
                          title={trade.marketName}
                        >
                          {trade.marketName || trade.marketId}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono truncate max-w-xs">
                          {trade.marketId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                            trade.direction === "YES"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {(trade.entryPrice * 100).toFixed(1)}¢
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {trade.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-300">
                        ${(trade.entryPrice * trade.quantity).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {trade.strategy ? (
                          <span className="inline-flex items-center px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                            {trade.strategy}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                        {new Date(trade.createdAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <WalletCards className="w-10 h-10 text-slate-700" />
                        <span className="text-sm">
                          No open positions currently deployed.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  valuePrefix = "",
}: {
  title: string;
  value: string;
  icon: React.ReactElement<{ className?: string }>;
  trend?: "up" | "down";
  subtitle?: string;
  valuePrefix?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-300">
        <div
          className={`w-24 h-24 rounded-full blur-2xl ${
            trend === "up"
              ? "bg-emerald-500"
              : trend === "down"
                ? "bg-rose-500"
                : "bg-blue-500"
          }`}
        />
      </div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div
          className={`p-2 rounded-lg border ${
            trend === "up"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : trend === "down"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          }`}
        >
          {React.cloneElement(icon, {
            className: "w-5 h-5",
          })}
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="text-3xl font-bold text-slate-50 tracking-tight flex items-center">
          {valuePrefix && (
            <span
              className={`text-xl mr-1 ${trend === "up" ? "text-emerald-400" : "text-rose-400"}`}
            >
              {valuePrefix}
            </span>
          )}
          {value}
        </h3>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-2 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
