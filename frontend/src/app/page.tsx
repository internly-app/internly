"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    service: string;
  } | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        // Check Next.js API health
        const healthRes = await fetch("/api/health");
        const healthData = await healthRes.json();
        setHealthStatus(healthData);

        // Check Supabase connection
        const supabaseRes = await fetch("/api/test");
        const supabaseData = await supabaseRes.json();
        setSupabaseStatus(supabaseData);
      } catch (err) {
        console.error("Error checking status:", err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-xl">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-bold text-center mb-8">
          🚀 Internly - Setup Complete!
        </h1>

        {/* Health Status */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Next.js API Status</h2>
          {healthStatus?.status === "healthy" ? (
            <p className="text-green-600">
              ✅ {healthStatus.service} is running
            </p>
          ) : (
            <p className="text-red-600">❌ API not responding</p>
          )}
        </div>

        {/* Supabase Status */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Supabase Connection</h2>
          {supabaseStatus?.success ? (
            <div>
              <p className="text-green-600">{supabaseStatus.message}</p>
              {supabaseStatus.count && supabaseStatus.count > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Found {supabaseStatus.count} test records
                </p>
              )}
            </div>
          ) : (
            <p className="text-red-600">❌ Supabase connection failed</p>
          )}
        </div>

        {/* Next Steps */}
        <div className="border rounded-lg p-6 bg-blue-50">
          <h2 className="text-xl font-semibold mb-3">🎯 Ready to Build!</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ Next.js + Supabase connected</li>
            <li>✅ API routes working</li>
            <li>✅ TypeScript configured</li>
            <li>
              📖 Check{" "}
              <code className="bg-white px-2 py-1 rounded">
                FILE_STRUCTURE.md
              </code>{" "}
              to understand the project
            </li>
            <li>🚀 Start building your first feature!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
