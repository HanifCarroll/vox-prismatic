import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  className?: string;
}

/**
 * Unified page header component for consistent UI across all pages
 * Based on the Prompts page design for optimal visual hierarchy
 */
export function PageHeader({ 
  title, 
  description, 
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`mb-10 ${className}`}>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">{title}</h1>
      <p className="text-gray-600 text-lg">{description}</p>
    </div>
  );
}

export default React.memo(PageHeader);