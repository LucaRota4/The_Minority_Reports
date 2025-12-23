"use client";
import { useSpaceDescription } from '@/hooks/useSpaceDescription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

/**
 * Example component to display space description
 * Usage: <SpaceDescriptionDisplay spaceId="myspace" />
 */
export function SpaceDescriptionDisplay({ spaceId }) {
  const { description, loading, error } = useSpaceDescription(spaceId);

  if (loading) {
    return (
      <Card className="bg-white/80 border-[#E8DCC4]/30">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently fail - description is optional
  }

  if (!description?.description) {
    return null; // No description available
  }

  return (
    <Card className="bg-white/80 border-[#E8DCC4]/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-black">
          <FileText className="h-5 w-5 text-[#4D89B0]" />
          About This Space
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-black whitespace-pre-wrap">{description.description}</p>
        {description.createdAt && (
          <p className="text-sm text-black/60 mt-4">
            Created {new Date(description.createdAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
