import React from 'react';
import { TrendingUp, Activity, Clock } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface PageHeaderProps {
  title: string;
  description: string;
  stats?: StatItem[];
  className?: string;
}

/**
 * Unified page header component for consistent UI across all pages
 * Supports optional stats summary bar for data overview
 */
export function PageHeader({ 
  title, 
  description, 
  stats,
  className = '' 
}: PageHeaderProps) {
  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return <Activity className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className={`${className}`}>
      {/* Header Section with subtle gradient background */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-8 mb-6 border border-gray-100 shadow-sm">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 text-lg">{description}</p>
        
        {/* Stats Summary Bar */}
        {stats && stats.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {stat.icon && (
                    <div className="flex-shrink-0">
                      <stat.icon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate">{stat.label}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-semibold text-gray-900">
                        {stat.value}
                      </p>
                      {stat.trend && (
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(stat.trend)}
                          {stat.trendValue && (
                            <span className={`text-xs ${
                              stat.trend === 'up' ? 'text-green-500' : 
                              stat.trend === 'down' ? 'text-red-500' : 
                              'text-gray-400'
                            }`}>
                              {stat.trendValue}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PageHeader);