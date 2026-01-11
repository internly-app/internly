"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  Edit,
  Users,
  Building2,
  FileText,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dynamic imports for below-the-fold components
const Footer = dynamic(() => import("@/components/Footer"));

export default function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <motion.div
        className="flex-1 max-w-3xl mx-auto px-6 py-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            What is Internly?
          </h1>
        </motion.div>

        {/* What is Internly */}
        <motion.div className="mb-12 text-center" variants={itemVariants}>
          <p className="text-xl text-muted-foreground">
            Students share detailed internship reviews: what they actually
            worked on, interview processes, compensation, and honest advice.
          </p>
        </motion.div>

        {/* How to Use It */}
        <motion.div variants={itemVariants}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">
                How to Maximize Your Success
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Search className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    1. Research Before Applying
                  </h3>
                  <p className="text-muted-foreground">
                    Search for companies you&apos;re interested in. Learn what
                    technologies they use, how they interview, and what past
                    interns actually worked on. Tailor your applications
                    accordingly.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <FileText className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    2. Optimize for ATS
                  </h3>
                  <p className="text-muted-foreground">
                    Don&apos;t let a bot reject you. Use our free Resume Scanner
                    to check your resume against job descriptions and ensure
                    you&apos;re hitting the right keywords.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Users className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    3. Prepare Strategically
                  </h3>
                  <p className="text-muted-foreground">
                    Use interview tips and preparation advice from students who
                    got the roles you want. Focus on the skills and topics they
                    mention.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Edit className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    4. Share Your Experience
                  </h3>
                  <p className="text-muted-foreground">
                    After your internship, write a detailed review. Help the
                    next person and build the community that helped you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* What Makes Us Different */}
        <motion.div variants={itemVariants}>
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-2xl">
                What Makes Us Different
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>No corporate BS:</strong> Real reviews from students
                    who actually did the work
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Actionable details:</strong> Specific technologies,
                    interview questions, and preparation tips
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Transparent:</strong> Compensation data, work
                    culture, and honest pros/cons
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Student-focused:</strong> Built by students who
                    understand your challenges
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center bg-muted/30 rounded-lg p-8"
          variants={itemVariants}
        >
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Start Using Internly
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Button asChild className="gap-2 group">
              <Link href="/write-review">
                Write a Review
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 group">
              <Link href="/reviews">
                Browse Reviews
                <Search className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 group">
              <Link href="/companies">
                Browse Companies
                <Building2 className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 group">
              <Link href="/ats">
                Scan Resume
                <FileText className="size-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </motion.div>
      <Footer />
    </main>
  );
}
