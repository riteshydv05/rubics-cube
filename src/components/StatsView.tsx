import { useState, useEffect } from 'react';
import { getSolveStats, getSolveHistory, deleteSolve, type SolveStats, type SolveRecord } from '../services/auth';

interface StatsViewProps {
  onBack: () => void;
  userName?: string;
}

export default function StatsView({ onBack, userName }: StatsViewProps) {
  const [stats, setStats] = useState<SolveStats | null>(null);
  const [history, setHistory] = useState<SolveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [statsResult, historyResult] = await Promise.all([
        getSolveStats(),
        getSolveHistory(1, 10)
      ]);
      
      if (statsResult) {
        setStats(statsResult);
      }
      
      if (historyResult) {
        setHistory(historyResult.solves);
        setHasMore(historyResult.pagination.hasMore);
        setTotalItems(historyResult.pagination.totalItems);
      }
    } catch (err) {
      setError('Failed to load statistics. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreHistory = async () => {
    const nextPage = currentPage + 1;
    const result = await getSolveHistory(nextPage, 10);
    
    if (result) {
      setHistory(prev => [...prev, ...result.solves]);
      setCurrentPage(nextPage);
      setHasMore(result.pagination.hasMore);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this solve?')) return;
    
    const success = await deleteSolve(id);
    if (success) {
      setHistory(prev => prev.filter(s => s._id !== id));
      setTotalItems(prev => prev - 1);
      // Reload stats
      const statsResult = await getSolveStats();
      if (statsResult) setStats(statsResult);
    }
  };

  const formatTime = (ms: number | null): string => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar">
            <span>📊 LOADING STATS...</span>
            <button onClick={onBack} className="retro-title-btn">←</button>
          </div>
          <div className="p-8 bg-gray-300 text-center">
            <div className="text-6xl mb-4 animate-pulse">📈</div>
            <div className="text-black text-xl font-bold">Loading your statistics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar bg-red-600">
            <span>❌ ERROR</span>
            <button onClick={onBack} className="retro-title-btn">←</button>
          </div>
          <div className="p-6 bg-gray-300 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-black text-xl font-bold mb-4">{error}</div>
            <button onClick={loadData} className="retro-btn">
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="retro-window">
        <div className="retro-title-bar">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span>YOUR STATISTICS</span>
          </div>
          <button onClick={onBack} className="retro-title-btn">←</button>
        </div>
        <div className="p-4 bg-gray-300">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-black">
              Welcome back, {userName || 'Cuber'}! 👋
            </div>
            <div className="text-gray-700 text-sm">
              Here's your solving journey so far
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="retro-window">
        <div className="retro-title-bar">
          <span>🏆 OVERVIEW</span>
        </div>
        <div className="p-4 bg-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Solves */}
            <div className="retro-panel p-4 text-center bg-blue-50">
              <div className="text-4xl font-bold text-blue-600">
                {stats?.totalSolves || 0}
              </div>
              <div className="text-black text-sm font-medium mt-1">
                Total Solves
              </div>
            </div>
            
            {/* Average Moves */}
            <div className="retro-panel p-4 text-center bg-green-50">
              <div className="text-4xl font-bold text-green-600">
                {stats?.avgMoves ? Math.round(stats.avgMoves) : 0}
              </div>
              <div className="text-black text-sm font-medium mt-1">
                Avg Moves
              </div>
            </div>
            
            {/* Best (Min) Moves */}
            <div className="retro-panel p-4 text-center bg-yellow-50">
              <div className="text-4xl font-bold text-yellow-600">
                {stats?.minMoves || '-'}
              </div>
              <div className="text-black text-sm font-medium mt-1">
                Best (Min Moves)
              </div>
            </div>
            
            {/* Fastest Solve */}
            <div className="retro-panel p-4 text-center bg-purple-50">
              <div className="text-4xl font-bold text-purple-600">
                {formatTime(stats?.fastestSolve || null)}
              </div>
              <div className="text-black text-sm font-medium mt-1">
                Fastest Time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Chart */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className="retro-window">
          <div className="retro-title-bar">
            <span>📈 LAST 7 DAYS</span>
          </div>
          <div className="p-4 bg-gray-300">
            <div className="flex items-end gap-2 h-32 justify-center">
              {stats.recentActivity.map((day, idx) => {
                const maxCount = Math.max(...stats.recentActivity.map(d => d.count));
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                const dayName = new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' });
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="text-xs text-black font-bold">{day.count}</div>
                    <div 
                      className="w-8 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${height}%`, minHeight: day.count > 0 ? '8px' : '0px' }}
                      title={`${day.count} solves, avg ${Math.round(day.avgMoves)} moves`}
                    />
                    <div className="text-xs text-gray-600">{dayName}</div>
                  </div>
                );
              })}
            </div>
            {stats.recentActivity.length === 0 && (
              <div className="text-center text-gray-600 py-4">
                No activity in the last 7 days
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solve History */}
      <div className="retro-window">
        <div className="retro-title-bar">
          <span>📝 SOLVE HISTORY ({totalItems})</span>
        </div>
        <div className="p-4 bg-gray-300">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🧩</div>
              <div className="text-black text-lg font-bold mb-2">No solves yet!</div>
              <div className="text-gray-600 text-sm">
                Complete your first cube solve to start tracking your progress.
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((solve, idx) => (
                  <div 
                    key={solve._id} 
                    className="retro-panel p-3 flex items-center justify-between bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {solve.completed ? '✅' : '⏳'}
                      </div>
                      <div>
                        <div className="text-black font-bold">
                          Solve #{totalItems - (currentPage - 1) * 10 - idx}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {formatDate(solve.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-black font-bold">
                          {solve.moveCount} moves
                        </div>
                        <div className="text-gray-600 text-xs">
                          {formatTime(solve.solveTime)}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(solve._id)}
                        className="retro-btn px-2 py-1 text-xs bg-red-100 hover:bg-red-200"
                        title="Delete solve"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <button 
                  onClick={loadMoreHistory}
                  className="retro-btn w-full mt-4"
                >
                  Load More
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Back Button */}
      <button onClick={onBack} className="retro-btn w-full py-3">
        ← Back to Cube
      </button>
    </div>
  );
}
