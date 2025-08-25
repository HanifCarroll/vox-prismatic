'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

/**
 * Scheduler Page - Placeholder for post scheduling interface
 */

export default function SchedulerPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/posts">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Posts
            </Button>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">Post Scheduler</h1>
        <p className="mt-2 text-gray-600">
          Schedule your approved posts for publication across social media platforms
        </p>
      </div>

      {/* Placeholder Content */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduler Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            The post scheduling interface is being redesigned with a simpler, more intuitive approach.
            Check back soon for the new scheduling experience!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}