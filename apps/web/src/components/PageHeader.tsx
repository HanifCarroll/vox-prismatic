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
      {/* Compact Header Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
            
            {/* Inline Stats - Desktop only */}
            {stats && stats.length > 0 && (
              <div className="hidden lg:flex items-center gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {stat.icon && (
                      <stat.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </span>
                      <span className="text-xs text-gray-500">{stat.label}</span>
                      {stat.trend && (
                        <span className="ml-1">
                          {getTrendIcon(stat.trend)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Stats Row - Mobile and Tablet */}
          {stats && stats.length > 0 && (
            <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2">
                  {stat.icon && (
                    <stat.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-lg font-semibold text-gray-900 leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PageHeader);