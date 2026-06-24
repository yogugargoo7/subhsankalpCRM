import React, { useState, useEffect } from 'react';

const PlotAvailability = () => {
  const [plots, setPlots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  // ⚠️ IMPORTANT: Replace with your actual API URL
  const API_URL = 'https://localhost:8080/api/public/plots';

  useEffect(() => {
    fetchPlots();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPlots, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error('Failed to fetch plots data');
      }

      const data = await response.json();
      setPlots(data.plots);
      setSummary({
        totalPlots: data.totalPlots,
        available: data.available,
        Tokened: data.Tokened,
        partPayment: data.partPayment,
        booked: data.booked,
        sold: data.sold
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPlots = () => {
    if (filter === 'all') return plots;
    return plots.filter(plot => plot.status === filter);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Available': 'bg-green-100 border-green-500 text-green-800',
      'Tokened': 'bg-yellow-100 border-yellow-500 text-yellow-800',
      'PartPayment': 'bg-blue-100 border-blue-500 text-blue-800',
      'Booked': 'bg-purple-100 border-purple-500 text-purple-800',
      'Sold': 'bg-red-100 border-red-500 text-red-800'
    };
    return colors[status] || 'bg-gray-100 border-gray-500 text-gray-800';
  };

  const getBadgeColor = (status) => {
    const colors = {
      'Available': 'bg-green-500',
      'Tokened': 'bg-yellow-500',
      'PartPayment': 'bg-blue-500',
      'Booked': 'bg-purple-500',
      'Sold': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="text-white text-2xl">Loading plots data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
        <div className="bg-red-100 border-2 border-red-500 text-red-800 p-8 rounded-xl max-w-md">
          <h3 className="text-xl font-bold mb-2">⚠️ Unable to load plots data</h3>
          <p>{error}</p>
          <button 
            onClick={fetchPlots}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">🏘️ Plot Availability Status</h1>
          <p className="text-lg opacity-90">Real-time plot availability information</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <SummaryCard label="Total Plots" value={summary.totalPlots} color="text-purple-600" />
            <SummaryCard label="Available" value={summary.available} color="text-green-600" />
            <SummaryCard label="Tokened" value={summary.Tokened} color="text-yellow-600" />
            <SummaryCard label="Part Payment" value={summary.partPayment} color="text-blue-600" />
            <SummaryCard label="Booked" value={summary.booked} color="text-purple-600" />
            <SummaryCard label="Sold" value={summary.sold} color="text-red-600" />
          </div>
        )}

        {/* Plots Container */}
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <FilterButton 
              label="All Plots" 
              active={filter === 'all'} 
              onClick={() => setFilter('all')} 
            />
            <FilterButton 
              label="Available" 
              active={filter === 'Available'} 
              onClick={() => setFilter('Available')} 
            />
            <FilterButton 
              label="Tokened" 
              active={filter === 'Tokened'} 
              onClick={() => setFilter('Tokeneded')} 
            />
            <FilterButton 
              label="Part Payment" 
              active={filter === 'PartPayment'} 
              onClick={() => setFilter('PartPayment')} 
            />
            <FilterButton 
              label="Booked" 
              active={filter === 'Booked'} 
              onClick={() => setFilter('Booked')} 
            />
            <FilterButton 
              label="Sold" 
              active={filter === 'Sold'} 
              onClick={() => setFilter('Sold')} 
            />
          </div>

          {/* Plots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getFilteredPlots().map(plot => (
              <div 
                key={plot.id}
                className={`border-2 rounded-lg p-5 transition-all hover:shadow-lg hover:-translate-y-1 ${getStatusColor(plot.status)}`}
              >
                <div className="text-2xl font-bold mb-3">{plot.plotNumber}</div>
                <div className="text-sm space-y-1 mb-4 text-gray-700">
                  <div><strong>Site:</strong> {plot.siteName}</div>
                  {plot.block && <div><strong>Block:</strong> {plot.block}</div>}
                  <div><strong>Size:</strong> {plot.plotSize}</div>
                  <div><strong>Rate:</strong> ₹{plot.basicRate?.toLocaleString()}/sq yd</div>
                  {plot.totalPrice && (
                    <div><strong>Price:</strong> ₹{plot.totalPrice.toLocaleString()}</div>
                  )}
                  {plot.facing && <div><strong>Facing:</strong> {plot.facing}</div>}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-semibold uppercase ${getBadgeColor(plot.status)}`}>
                  {plot.status}
                </span>
              </div>
            ))}
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-center text-gray-600 text-sm mt-6">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, color }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
    <div className={`text-4xl font-bold mb-2 ${color}`}>{value}</div>
    <div className="text-gray-600 text-sm uppercase tracking-wide">{label}</div>
  </div>
);

const FilterButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg border-2 transition-all ${
      active 
        ? 'bg-purple-600 text-white border-purple-600' 
        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600 hover:text-purple-600'
    }`}
  >
    {label}
  </button>
);

export default PlotAvailability;
