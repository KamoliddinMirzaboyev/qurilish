import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { FlaskConical, ClipboardList, Handshake, ArrowRight } from "lucide-react";
import { CATEGORY_LABELS_UZ, type Category } from "@buildscience/shared";
import { useAuth } from "@/features/auth/AuthContext";
import { usePublicStats } from "@/features/public/hooks";
import { useProblems } from "@/features/problems/hooks";
import { Button } from "@/components/ui/Button";
import { StatCard, CardGridSkeleton, EmptyState } from "@/components/ui/Card";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { formatNumber } from "@/lib/format";

const categories = Object.keys(CATEGORY_LABELS_UZ) as Category[];

export default function LandingPage() {
  const { user } = useAuth();
  const { data: stats } = usePublicStats();
  const { data: latestProblems, isLoading } = useProblems({ sort: "newest", page: 1, pageSize: 6 });
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    target?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);

  const primaryHref = user?.role === "ADMIN" ? "/app/admin/problems/new" : user?.role === "USER" ? "/problems" : "/register";

  return (
    <div>
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-content gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Qurilish muammolariga ilmiy yechim toping
            </h1>
            <p className="mt-5 max-w-xl text-slate-300">
              BuildScience qurilish korxonalari va olimlarni bir platformada bog'laydi. Muammo e'lon qiling, ilmiy
              takliflarni oling va eng mos mutaxassis bilan bog'laning.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asLink to={primaryHref}>
                Muammo joylashtirish
              </Button>
              <Button size="lg" variant="outlineOnDark" asLink to="/problems">
                Muammolarni ko'rish
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
              <Link to="/mines" className="underline-offset-4 hover:underline">
                Konlar katalogi →
              </Link>
              <Link to="/waste" className="underline-offset-4 hover:underline">
                Chiqindi e'lonlari →
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-card border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-white/10 p-3">
                <span className="text-sm">Beton mustahkamligini oshirish</span>
                <span className="rounded-full bg-brand-teal/30 px-2 py-0.5 text-xs">Ochiq</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/10 p-3">
                <span className="text-sm">Energiya samaradorligi yuqori g'isht</span>
                <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-xs">Olim tanlangan</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 p-3 text-sm">
                <Handshake size={18} /> Taklif qabul qilindi — kontaktlar ochildi
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Ochiq muammolar" value={stats ? formatNumber(stats.openProblems) : "—"} />
          <StatCard label="Tanlangan takliflar" value={stats ? formatNumber(stats.matchedProblems) : "—"} />
          <StatCard label="Firmalar" value={stats ? formatNumber(stats.totalAdmins) : "—"} />
          <StatCard label="Foydalanuvchilar" value={stats ? formatNumber(stats.totalUsers) : "—"} />
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-16">
        <div className="mx-auto max-w-content px-4">
          <h2 className="text-center text-2xl font-semibold text-brand-dark">Qanday ishlaydi</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                title: "Muammoni joylashtiring",
                desc: "Korxona muammoning sarlavhasi, tavsifi, yo'nalishi va budjetini kiritadi.",
              },
              {
                icon: FlaskConical,
                title: "Takliflarni oling",
                desc: "Olimlar o'z yechimi, narxi va bajarish muddatini yuboradi.",
              },
              {
                icon: Handshake,
                title: "Eng mos olimni tanlang",
                desc: "Taklif qabul qilingandan so'ng tomonlarning kontaktlari ochiladi.",
              },
            ].map((step, i) => (
              <div key={step.title} className="rounded-card border border-surface-border p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <step.icon size={22} />
                </div>
                <p className="text-sm font-medium text-brand-primary">{i + 1}-qadam</p>
                <h3 className="mt-1 text-lg font-semibold text-brand-dark">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-content px-4">
          <h2 className="text-center text-2xl font-semibold text-brand-dark">Yo'nalishlar</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/problems?category=${category}`}
                className="rounded-full border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink hover:border-brand-primary hover:text-brand-primary"
              >
                {CATEGORY_LABELS_UZ[category]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-content px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-brand-dark">So'nggi muammolar</h2>
            <Link to="/problems" className="flex items-center gap-1 text-sm font-medium text-brand-primary">
              Barchasi <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8">
            {isLoading ? (
              <CardGridSkeleton />
            ) : latestProblems && latestProblems.items.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {latestProblems.items.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} />
                ))}
              </div>
            ) : (
              <EmptyState title="Hozircha ochiq muammolar mavjud emas." />
            )}
          </div>
        </div>
      </section>

      <section id="boundaries" className="py-16">
        <div className="mx-auto max-w-content px-4">
          <div className="rounded-card border border-surface-border bg-white p-8">
            <h2 className="text-xl font-semibold text-brand-dark">Platforma nimani amalga oshiradi?</h2>
            <ul className="mt-4 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
              <li>• Muammolarni e'lon qilish</li>
              <li>• Olimlardan taklif olish</li>
              <li>• Taklifni tanlash</li>
              <li>• Kontaktlarni ochish</li>
            </ul>
            <p className="mt-5 text-sm font-medium text-brand-dark">
              Shartnoma, to'lov va loyiha ijrosi tomonlar o'rtasida platformadan tashqarida amalga oshiriladi.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-brand-dark py-16 text-white">
        <div className="mx-auto max-w-content px-4 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">Muammoingizga ilmiy yechim topishga tayyormisiz?</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button size="lg" asLink to="/register">
              Ro'yxatdan o'tish
            </Button>
            <Button size="lg" variant="outlineOnDark" asLink to="/problems">
              Muammolarni ko'rish
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
