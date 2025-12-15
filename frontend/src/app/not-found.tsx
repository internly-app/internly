"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex items-center justify-center max-w-2xl mx-auto px-6 py-12"
      >
        <Card>
          <CardContent className="pt-12 pb-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Page Not Found
              </h2>
              <p className="text-muted-foreground mb-8">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="gap-2">
                  <Link href="/">
                    <Home className="size-4" />
                    Go Home
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="size-4" />
                  Go Back
                </Button>
                <Button variant="outline" asChild className="gap-2">
                  <Link href="/reviews">
                    <Search className="size-4" />
                    Browse Reviews
                  </Link>
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
      
      <Footer />
    </main>
  );
}

