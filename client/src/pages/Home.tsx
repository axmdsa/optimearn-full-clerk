import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Zap, Star, Shield, ChevronRight, Play, CheckCircle2,
  DollarSign, Users, Clock, TrendingUp, Gift, Gamepad2,
  ClipboardList, Video, Smartphone, ArrowRight, Menu, X, Flame, Apple, Monitor
} from "lucide-react";

// ─── Animated Counter ─────────────────────────────────────────
function AnimatedCounter({ end, duration = 2000, prefix = "", suffix = "" }: {
  end: number; duration?: number; prefix?: string; suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span ref={ref} className="ticker-value">{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Featured Offer Card (matching Missions Featured section) ───────────────────────────────────────────────
function FeaturedOfferCard({ task, onClick }: { task: any; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const catEmoji: Record<string, string> = {
    survey: '📊', app_trial: '📱', offer: '🎯', video: '🎬', daily: '⚡', social: '👥', play_to_earn: '🎮'
  };
  const catGradient: Record<string, string> = {
    survey:    'from-blue-900/80 via-blue-900/40 to-transparent',
    app_trial: 'from-yellow-900/80 via-yellow-900/40 to-transparent',
    offer:     'from-emerald-900/80 via-emerald-900/40 to-transparent',
    video:     'from-purple-900/80 via-purple-900/40 to-transparent',
    daily:     'from-orange-900/80 via-orange-900/40 to-transparent',
    social:    'from-pink-900/80 via-pink-900/40 to-transparent',
    play_to_earn: 'from-red-900/80 via-red-900/40 to-transparent',
  };
  const catAccent: Record<string, string> = {
    survey:    'text-blue-400 border-blue-400/40 bg-blue-400/10',
    app_trial: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
    offer:     'text-primary border-primary/40 bg-primary/10',
    video:     'text-purple-400 border-purple-400/40 bg-purple-400/10',
    daily:     'text-orange-400 border-orange-400/40 bg-orange-400/10',
    social:    'text-pink-400 border-pink-400/40 bg-pink-400/10',
    play_to_earn: 'text-red-400 border-red-400/40 bg-red-400/10',
  };

  const gradient = 'from-purple-900/80 via-purple-900/40 to-transparent';
  const accent = 'text-purple-400 border-purple-400/40 bg-purple-400/10';
  const bgImage = task.imageUrl || task.thumbnailUrl;
  const payout = (task.points / 1000).toFixed(2);

  const getDeviceIcons = () => {
    if (!task.targetDevices) return [];
    try {
      const devices = typeof task.targetDevices === 'string' ? JSON.parse(task.targetDevices) : task.targetDevices;
      if (!Array.isArray(devices)) return [];
      return devices.map((device: string) => {
        if (device === 'iOS') return { key: 'iOS', icon: <Apple className="w-4 h-4 text-white/70" /> };
        if (device === 'Android') return { key: 'Android', icon: <Smartphone className="w-4 h-4 text-white/70" /> };
        if (device === 'PC') return { key: 'PC', icon: <Monitor className="w-4 h-4 text-white/70" /> };
        return null;
      }).filter(Boolean);
    } catch {
      return [];
    }
  };
  const deviceIcons = getDeviceIcons();

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-purple-500/75 hover:border-purple-400 transition-all duration-200 glow-purple-dark-neon"
      style={{ minHeight: 200 }}
    >
      {/* Background Image */}
      {bgImage && !imgErr ? (
        <img
          src={bgImage}
          alt={task.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/60 to-background" />
      )}

      {/* Dark overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col justify-between h-full" style={{ minHeight: 200 }}>
        {/* Top row: badges and device icons */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Flame badge */}
            <span className="flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Flame className="w-4 h-4" />
            </span>
            {/* Category badge */}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${accent}`}>
              {task.category.replace('_', ' ')}
            </span>
          </div>
          {/* Device icons */}
          <div className="flex items-center gap-1 shrink-0">
            {deviceIcons.map((d: any) => (
              <div key={d.key}>{d.icon}</div>
            ))}
          </div>
        </div>

        {/* Bottom row: icon + info */}
        <div className="flex items-end gap-4 mt-6">
          {/* Icon/Thumbnail */}
          <div className="shrink-0">
            {task.imageUrl && !imgErr ? (
              <img
                src={task.imageUrl}
                alt={task.title}
                className="w-16 h-16 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
                onError={() => setImgErr(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-4xl shadow-2xl ring-2 ring-white/10">
                {catEmoji[task.category] ?? '🎁'}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-lg mb-2">
              {task.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-purple-300 font-black text-lg drop-shadow-lg">
                +${payout}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="text-primary">{icon}</span>
        <span className="text-2xl font-bold font-display text-foreground">{value}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Testimonial ──────────────────────────────────────────────
const testimonials = [
  { name: "Alex M.", avatar: "A", text: "I've earned over $200 in just 2 months! The offers are legit and payouts are fast.", stars: 5 },
  { name: "Sarah K.", avatar: "S", text: "Best rewards platform I've used. The spin wheel is addictive and the surveys actually pay well.", stars: 5 },
  { name: "James T.", avatar: "J", text: "Cashed out to PayPal within 24 hours. Highly recommend to anyone looking for extra income.", stars: 5 },
  { name: "Maria L.", avatar: "M", text: "Love the gamer vibe! Completing missions feels like playing a game while actually earning real money.", stars: 5 },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: tasks } = trpc.tasks.list.useQuery({ category: 'all', country: user?.country ?? undefined }, { enabled: !isAuthenticated });

  useEffect(() => {
    if (isAuthenticated) setLocation('/dashboard');
  }, [isAuthenticated]);

  // Filter for featured tasks only
  const featuredTasks = (tasks ?? [])
    .filter((t: any) => t.isFeatured)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              Optim<span className="text-primary">Earn</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#offers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Offers</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href={getLoginUrl()} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
              Sign In
            </a>
            <a href={getLoginUrl()}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green-sm font-semibold">
                Sign Up Free
              </Button>
            </a>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-muted-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-4">
            <a href="#how-it-works" className="text-sm text-muted-foreground">How it Works</a>
            <a href="#offers" className="text-sm text-muted-foreground">Offers</a>
            <a href={getLoginUrl()}>
              <Button className="w-full bg-primary text-primary-foreground">Sign Up Free</Button>
            </a>
          </div>
        )}
      </nav>

      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="hero-gradient pt-32 pb-20 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary">9,608 offers available now</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-primary text-glow-green">Get paid</span> for testing
              <br />apps, games & surveys
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Earn up to <span className="text-primary font-semibold">$175</span> per offer. Join millions of users earning real cash rewards every day.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green font-bold text-base px-8 h-12 w-full sm:w-auto">
                  Start Earning Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary h-12 w-full sm:w-auto">
                  <Play className="mr-2 w-4 h-4" />
                  See How It Works
                </Button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Instant payouts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>No credit card</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Stats Ticker ──────────────────────────────── */}
      <section className="border-y border-border bg-card/50 py-8">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              value="17m 12s"
              label="Avg. time to earn your first cash"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              value="$24.10"
              label="Avg. withdrawal sent yesterday"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              value="$300,000+"
              label="Total amount earned on OptimEarn"
            />
          </div>
        </div>
      </section>

      {/* ─── Featured Offers ────────────────────────────────── */}
      <section id="offers" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Featured Offers</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Top Earning Opportunities
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse thousands of offers from top brands. Complete tasks and get paid instantly.
            </p>
          </div>

          {/* Featured Grid */}
          {featuredTasks.length === 1 ? (
            <div className="mb-8">
              <FeaturedOfferCard task={featuredTasks[0]} onClick={() => setLocation(getLoginUrl())} />
            </div>
          ) : featuredTasks.length === 2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {featuredTasks.map((task) => (
                <FeaturedOfferCard key={task.id} task={task} onClick={() => setLocation(getLoginUrl())} />
              ))}
            </div>
          ) : featuredTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {featuredTasks.slice(0, 3).map((task) => (
                <FeaturedOfferCard key={task.id} task={task} onClick={() => setLocation(getLoginUrl())} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { title: "Complete a Quick Survey", points: 500, category: "survey" },
                { title: "Install & Play Dice Dreams", points: 1000, category: "app_trial" },
                { title: "Sign Up for Netflix Trial", points: 2500, category: "offer" },
              ].map((t, i) => (
                <div key={i} className="relative rounded-xl p-4 transition-all duration-200 hover:-translate-y-1 cursor-pointer group bg-card border border-border hover:border-primary/30">
                  <div className="text-3xl mb-3">{t.category === 'survey' ? '📊' : t.category === 'app_trial' ? '📱' : '🎯'}</div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">{t.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-sm">+{t.points.toLocaleString()} pts</span>
                    <span className="text-xs text-muted-foreground capitalize">{t.category.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center">
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => setLocation(getLoginUrl())}>
              View All Offers <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-card/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Simple Process</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Want to earn free cash within minutes?
            </h2>
            <p className="text-primary font-semibold text-lg">Here's how</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: <Gamepad2 className="w-8 h-8" />,
                title: "Choose an Offer",
                desc: "Take your pick from thousands of tasks. We list the best offers from companies who want to advertise their apps, surveys, and products.",
                color: "from-primary/20 to-primary/5",
              },
              {
                step: "2",
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Complete the Offer",
                desc: "Most offers are very simple and have already earned money for thousands of people. Most offers take around 5–10 minutes to complete.",
                color: "from-blue-500/20 to-blue-500/5",
              },
              {
                step: "3",
                icon: <DollarSign className="w-8 h-8" />,
                title: "Get Paid",
                desc: "For each task you complete, you'll be rewarded with coins. 1000 coins = $1.00. Cashout the coins and get your hands on your free cash!",
                color: "from-yellow-500/20 to-yellow-500/5",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className={`rounded-2xl p-8 bg-gradient-to-br ${item.color} border border-border h-full`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center text-primary">
                      {item.icon}
                    </div>
                    <span className="text-4xl font-display font-black text-foreground/10">{item.step}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
                {item.step !== "3" && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight className="w-6 h-6 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Best Ways to Earn ──────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            Best Ways to Earn
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Gamepad2 className="w-6 h-6" />, title: "Play Games", desc: "In order to attract more players, game developers pay us to promote their games.", color: "text-primary" },
              { icon: <ClipboardList className="w-6 h-6" />, title: "Complete Offers", desc: "Get to know new companies by trying their products and services for rewards.", color: "text-blue-400" },
              { icon: <ClipboardList className="w-6 h-6" />, title: "Join Surveys", desc: "Companies need your opinion to create better products. Share your thoughts and earn.", color: "text-purple-400" },
              { icon: <Video className="w-6 h-6" />, title: "Watch Videos", desc: "Watch short promotional videos and earn points for every video completed.", color: "text-pink-400" },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors group">
                <div className={`${item.color} mb-4 group-hover:scale-110 transition-transform`}>{item.icon}</div>
                <h3 className="font-display font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────── */}
      <section id="testimonials" className="py-20 bg-card/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Testimonials</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Trusted by Thousands
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <span>4.8/5 from 289,123 reviews</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <div className="flex">
                      {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Recommended By ─────────────────────────────────── */}
      <section className="py-16 border-y border-border">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">Recommended by</p>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {["Forbes", "TechCrunch", "Business Insider", "PCMag", "Benzinga"].map((brand) => (
              <span key={brand} className="text-xl font-display font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors cursor-default">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="container relative text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Ready to start earning?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Join <AnimatedCounter end={115029} suffix="+" /> users who signed up in the past 24 hours.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green font-bold text-lg px-10 h-14">
              Sign Up for Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <p className="text-xs text-muted-foreground mt-4">No credit card required. Free forever.</p>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 bg-card/20">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">Optim<span className="text-primary">Earn</span></span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
              <a href="#" className="hover:text-foreground transition-colors">Blog</a>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 OptimEarn. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
