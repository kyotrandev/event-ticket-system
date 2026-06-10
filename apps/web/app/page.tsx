"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Zap, Star, LayoutGrid, Users, ShieldCheck, Heart } from "lucide-react";

export default function Home() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.5, duration: 0.8 } },
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] dark:bg-[#18181b]">
      {/* Hero Section */}
      <section className="relative px-4 pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden">
        <div className="absolute top-10 left-10 text-primary opacity-20"><Star size={64} /></div>
        <div className="absolute bottom-20 right-10 text-secondary opacity-20"><Heart size={80} /></div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center flex flex-col items-center relative z-10"
        >
          <motion.div variants={item} className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/10 text-primary px-5 py-2 font-bold shadow-sm">
            <Zap className="size-5" fill="currentColor" />
            <span>Say hello to easier ticketing!</span>
          </motion.div>
          <motion.h1 variants={item} className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-foreground">
            Find your next <br/>
            <span className="text-primary relative inline-block">
              favorite event
              <svg className="absolute -bottom-2 left-0 w-full h-4 text-secondary" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 15 100 5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
            </span>
          </motion.h1>
          <motion.p variants={item} className="text-xl md:text-2xl text-muted-foreground max-w-2xl font-medium mb-10 leading-relaxed">
            Discover amazing concerts, workshops, and meetups. Book your tickets in a snap and get ready for fun!
          </motion.p>
          <motion.div variants={item} className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
            <Link href="/events" className={buttonVariants({ size: "lg", className: "text-xl px-10 py-7 rounded-2xl w-full sm:w-auto" })}>
              Let&apos;s Go <ArrowRight className="ml-2 size-6" />
            </Link>
            <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary", className: "text-xl px-10 py-7 rounded-2xl w-full sm:w-auto" })}>
              Host an Event
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white dark:bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Why you&apos;ll love it
            </h2>
            <p className="text-xl text-muted-foreground font-medium">Everything you need, nothing you don&apos;t.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Super Safe", desc: "Your tickets are secured with magic math (cryptography) so they can't be faked.", color: "text-success", bg: "bg-success/10", border: "border-success" },
              { icon: LayoutGrid, title: "Easy Peasy", desc: "A dashboard so simple, even your grandma could host a rock concert.", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary" },
              { icon: Users, title: "Made for You", desc: "Join a community of fun-loving people attending the best local events.", color: "text-warning", bg: "bg-warning/10", border: "border-warning" }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15, type: "spring", bounce: 0.4 }}
              >
                <Card className="h-full text-center border-t-0 border-x-0 border-b-[6px] border-b-border bg-card hover:-translate-y-2 transition-transform duration-300">
                  <CardHeader className="items-center pb-2">
                    <div className={`p-5 rounded-full mb-4 ${feature.bg} ${feature.color}`}>
                      <feature.icon className="size-10" strokeWidth={2.5} />
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              {[1,2,3,4,5].map(i => <Star key={i} className="size-8 text-warning fill-warning mx-1" />)}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
              &quot;Literally the most fun I&apos;ve ever had buying a ticket.&quot;
            </h2>
            <div className="flex flex-col items-center gap-3">
              <div className="size-16 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-sm">
                JD
              </div>
              <div>
                <p className="font-bold text-xl">Jane Doe</p>
                <p className="text-muted-foreground font-medium">Party Enthusiast</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative overflow-hidden bg-primary text-primary-foreground">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6">
            Ready to dive in?
          </h2>
          <p className="text-2xl font-medium mb-10 text-primary-foreground/90">
            Join thousands of others discovering great events every day.
          </p>
          <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary", className: "text-2xl px-12 py-8 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all text-secondary-foreground" })}>
            Sign Up Now!
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
