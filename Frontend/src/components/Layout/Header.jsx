import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Search, FileText, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { receiptsAPI, plotsAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ receipts: [], plots: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults({ receipts: [], plots: [] });
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const performSearch = async (query) => {
    try {
      setIsSearching(true);
      
      // Search receipts and plots in parallel
      const [receiptsResponse, plotsResponse] = await Promise.all([
        receiptsAPI.getReceipts({ 
          pageSize: 5,
          customerName: query 
        }).catch(() => ({ data: { data: [] } })),
        plotsAPI.getPlots({ 
          pageSize: 5,
          plotNumber: query 
        }).catch(() => ({ data: { data: [] } }))
      ]);

      setSearchResults({
        receipts: receiptsResponse.data.data || [],
        plots: plotsResponse.data.data || []
      });
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (type, item) => {
    setShowResults(false);
    setSearchQuery('');
    
    if (type === 'receipt') {
      navigate('/receipts');
    } else if (type === 'plot') {
      navigate('/plots');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults({ receipts: [], plots: [] });
    setShowResults(false);
  };

  const totalResults = searchResults.receipts.length + searchResults.plots.length;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center flex-1">
          <button
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Search bar */}
          <div className="hidden sm:block ml-4 flex-1 max-w-lg" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                placeholder="Search receipts, plots, customers..."
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm">Searching...</p>
                    </div>
                  ) : totalResults === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No results found for "{searchQuery}"</p>
                      <p className="text-xs mt-1">Try searching by receipt number, customer name, or plot number</p>
                    </div>
                  ) : (
                    <>
                      {/* Receipts Section */}
                      {searchResults.receipts.length > 0 && (
                        <div className="border-b border-gray-100">
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-600 uppercase">Receipts ({searchResults.receipts.length})</p>
                          </div>
                          {searchResults.receipts.map((receipt) => (
                            <button
                              key={receipt.id}
                              onClick={() => handleResultClick('receipt', receipt)}
                              className="w-full px-4 py-3 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-start">
                                <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {receipt.receiptNo}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {receipt.fromName} • {receipt.siteName} - {receipt.plotVillaNo}
                                  </p>
                                  <div className="flex items-center mt-1 space-x-2">
                                    <span className="text-xs font-medium text-gray-900">
                                      {formatCurrency(receipt.amount)}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      receipt.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                      receipt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {receipt.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Plots Section */}
                      {searchResults.plots.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-600 uppercase">Plots ({searchResults.plots.length})</p>
                          </div>
                          {searchResults.plots.map((plot) => (
                            <button
                              key={plot.id}
                              onClick={() => handleResultClick('plot', plot)}
                              className="w-full px-4 py-3 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-start">
                                <MapPin className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {plot.siteName} - Plot {plot.plotVillaNo}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {plot.plotSize} • {plot.facing}
                                  </p>
                                  <div className="flex items-center mt-1 space-x-2">
                                    <span className="text-xs font-medium text-gray-900">
                                      {formatCurrency(plot.totalPrice)}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      plot.status === 'Available' ? 'bg-green-100 text-green-800' :
                                      plot.status === 'Booked' ? 'bg-yellow-100 text-yellow-800' :
                                      plot.status === 'Sold' ? 'bg-red-100 text-red-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {plot.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
            <Bell className="h-6 w-6" />
          </button>

          {/* User info */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;