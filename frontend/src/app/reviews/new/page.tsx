import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./ReviewForm";
import { AuthPanel } from "@/components/auth/AuthPanel";

export const dynamic = "force-dynamic";

export default async function NewReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      <header className="bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
          >
            ← Back to reviews
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {isAuthenticated ? (
          <ReviewForm />
        ) : (
          <div className="bg-gray-900/70 rounded-xl border border-gray-800 p-6 sm:p-8 text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Sign in to write a review
              </h1>
              <p className="text-gray-400">
                Reviews are tied to your Supabase account so employers can trust
                the source. Sign in with Google or create a secure
                email&nbsp;+&nbsp;password login to continue.
              </p>
            </div>
            <AuthPanel redirectTo="/reviews/new" />
          </div>
        )}
      </main>
    </div>
  );
}
