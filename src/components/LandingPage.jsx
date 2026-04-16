import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Video, Users, BarChart3, Eye, Globe, Shield, ChevronRight, Zap, Star, ArrowRight, Play } from 'lucide-react';

/* ─────────────────── helpers ─────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.7, ease: [.22, 1, .36, 1] } }),
};

const AnimatedCounter = ({ target, suffix = '', duration = 2000 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString('de-DE')}{suffix}</span>;
};

const Section = ({ children, className = '', id }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={`relative ${className}`}
    >
      {children}
    </motion.section>
  );
};

/* ─────────────────── Features data ─────────────────── */
const features = [
  { icon: Video, title: 'Video-Highlights', desc: 'Lade deine besten Spielszenen hoch und präsentiere dein Talent in einem professionellen Portfolio.', color: 'from-cyan-500 to-blue-500' },
  { icon: Eye, title: 'Scout-Netzwerk', desc: 'Werde von Scouts und Vereinen aus der ganzen Welt entdeckt. Dein Profil, global sichtbar.', color: 'from-amber-400 to-orange-500' },
  { icon: BarChart3, title: 'Statistiken & Analysen', desc: 'Verfolge deine Entwicklung mit detaillierten Leistungsdaten und einem FIFA-Style Radar-Chart.', color: 'from-emerald-400 to-cyan-500' },
  { icon: Globe, title: 'Internationale Chancen', desc: 'Verbinde dich mit Vereinen und Akademien weltweit. Keine Grenzen für dein Talent.', color: 'from-purple-400 to-indigo-500' },
  { icon: Shield, title: 'Verifizierte Profile', desc: 'Unser Verifizierungssystem sorgt für Vertrauen und Seriosität auf der Plattform.', color: 'from-rose-400 to-red-500' },
  { icon: Zap, title: 'Gamification & XP', desc: 'Sammle Erfahrungen, steige im Level auf und schalte exklusive Badges frei.', color: 'from-yellow-400 to-amber-500' },
];

const steps = [
  { num: '1', title: 'Profil erstellen', desc: 'Registriere dich kostenlos und erstelle dein Athleten-Profil mit allen Details.', icon: null },
  { num: '2', title: 'Highlights hochladen', desc: 'Lade deine besten Video-Highlights hoch und zeige, was du drauf hast.', icon: null },
  { num: '3', title: 'Vernetze dich', desc: 'Finde Spieler, Scouts und Berater weltweit und baue dein Netzwerk auf.', icon: Users },
  { num: '4', title: 'Entdeckt werden', desc: 'Scouts und Vereine sehen dein Profil und kontaktieren dich direkt.', icon: null },
];

/* ─────────────────── Component ─────────────────── */
export const LandingPage = ({ onLogin, onRegister }) => (
  <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-cyan-500/30">

    {/* ─── Ambient Background ─── */}
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-cyan-500/[0.07] rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-amber-500/[0.05] rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-indigo-500/[0.04] rounded-full blur-[100px]" />
    </div>

    {/* ═══════════════════ NAVBAR ═══════════════════ */}
    <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
          <img
            src="/cavio-icon.png"
            alt="Cavio Icon"
            className="h-10 w-10 object-contain mix-blend-screen rounded-lg transition-transform duration-300 group-hover:scale-110"
          />
          <span className="text-xl sm:text-2xl font-black tracking-[0.15em] text-white">CAVIO</span>
        </div>

        {/* Nav Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Login
          </button>
          <button
            onClick={onRegister}
            className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-full shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] transition-all duration-300 active:scale-95"
          >
            Registrieren
          </button>
        </div>
      </div>
    </nav>

    <main className="flex-1">
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
        {/* Grid overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Hero icon with glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [.22, 1, .36, 1] }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 w-28 h-28 sm:w-32 sm:h-32 bg-amber-400/20 rounded-full blur-[40px] landing-glow-pulse" />
          <img
            src="/cavio-icon.png"
            alt="Cavio"
            className="relative w-28 h-28 sm:w-32 sm:h-32 object-contain mix-blend-screen landing-float drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]"
          />
        </motion.div>

        {/* Headlines */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [.22, 1, .36, 1] }}
          className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.08] max-w-4xl z-10"
        >
          <span className="landing-gradient-text">Deine Bühne.</span>
          <br />
          <span className="landing-gradient-text">Deine Karriere.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed z-10"
        >
          Die Plattform für junge Athleten, die <span className="text-cyan-400 font-semibold">gesehen</span> werden wollen.
          Präsentiere dein Talent, werde entdeckt — weltweit.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 z-10"
        >
          <button
            onClick={onRegister}
            className="group relative px-8 py-4 text-base font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all duration-300 active:scale-[0.97] flex items-center gap-2"
          >
            Jetzt starten — kostenlos
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onLogin}
            className="px-8 py-4 text-base font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-2xl backdrop-blur-sm bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 flex items-center gap-2"
          >
            <Play size={16} />
            So funktioniert's
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 z-10"
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════ SOCIAL PROOF ═══════════════════ */}
      <Section className="py-16 sm:py-20" id="stats">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { target: 500, suffix: '+', label: 'Athleten' },
              { target: 50, suffix: '+', label: 'Vereine & Scouts' },
              { target: 1000, suffix: '+', label: 'Video-Highlights' },
              { target: 12, suffix: '', label: 'Länder' },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </div>
                <div className="mt-1 text-sm text-slate-400 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <Section className="py-20 sm:py-28" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
              Alles was du brauchst —{' '}
              <span className="landing-gradient-text">an einem Ort</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                className="group relative p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-500"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <Section className="py-20 sm:py-28" id="how">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
              So geht's
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
              In <span className="text-amber-400">4 Schritten</span> zum Profil
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.num} variants={fadeUp} custom={i} className="relative text-center sm:text-left">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/5 border border-amber-400/20 mb-4">
                  <span className="text-2xl font-black text-amber-400">{s.num}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <Section className="py-20 sm:py-28" id="cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            className="relative p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/10 border border-cyan-500/15 text-center overflow-hidden"
          >
            {/* Ambient blobs */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <Star size={40} className="mx-auto mb-6 text-amber-400" />
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
                Bereit, <span className="landing-gradient-text">entdeckt</span> zu werden?
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">
                Tritt der Community bei und starte deine Reise.<br />100% kostenlos — für immer.
              </p>
              <button
                onClick={onRegister}
                className="group px-10 py-4 text-base font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all duration-300 active:scale-[0.97] inline-flex items-center gap-2"
              >
                Kostenlos registrieren
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </Section>
    </main>

    {/* ═══════════════════ FOOTER ═══════════════════ */}
    <footer className="mt-auto w-full flex flex-col gap-4 p-6 sm:p-10 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo + Copyright */}
          <div className="flex items-center gap-3">
            <img src="/cavio-icon.png" alt="Cavio" className="h-7 w-7 object-contain mix-blend-screen rounded" />
            <span className="text-xs text-slate-500 ml-2">© 2026 Cavio</span>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Datenschutz</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Impressum</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">AGB</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
);
