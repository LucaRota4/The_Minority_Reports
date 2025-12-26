"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#E8DCC4]/20 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white/80 border-[#E8DCC4]/30">
        <CardContent className="pt-12 pb-12 text-center">
          <AlertCircle className="h-20 w-20 text-[#4D89B0] mx-auto mb-6" />
          <h1 className="text-6xl font-bold text-black mb-4">404</h1>
          <h2 className="text-2xl font-bold text-black mb-3">Page Not Found</h2>
          <p className="text-[#4D89B0]/70 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Button
            onClick={() => router.push("/app")}
            size="lg"
            className="bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Enter the Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
