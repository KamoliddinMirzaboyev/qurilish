import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { FlaskConical, ClipboardList, Handshake, ArrowRight, Mountain, Recycle } from "lucide-react";
import { CATEGORY_LABELS_UZ, type Category } from "@buildscience/shared";
import { useAuth } from "@/features/auth/AuthContext";
import { usePublicStats } from "@/features/public/hooks";
import { useProblems } from "@/features/problems/hooks";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton, EmptyState } from "@/components/ui/Card";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { formatNumber } from "@/lib/format";

const categories = Object.keys(CATEGORY_LABELS_UZ) as Category[];

const catalogs = [
  { title: "Muammolar", desc: "E'lonlar va ilmiy takliflar", to: "/problems", icon: ClipboardList },
  { title: "Konlar", desc: "Xomashyo konlari katalogi", to: "/mines", icon: Mountain },
  { title: "Chiqindi", desc: "Ishlab chiqarish qoldiqlari", to: "/waste", icon: Recycle },
];

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

  const counters = [
    { label: "Ochiq muammolar", value: stats ? formatNumber(stats.openProblems) : "—" },
    { label: "Tanlangan takliflar", value: stats ? formatNumber(stats.matchedProblems) : "—" },
    { label: "Ishtirokchi firmalar", value: stats ? formatNumber(stats.totalAdmins) : "—" },
    { label: "Foydalanuvchilar", value: stats ? formatNumber(stats.totalUsers) : "—" },
  ];

  return (
    <div>
      <section className="relative isolate text-white">
        <img src="/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071A33] via-[#071A33]/90 to-[#071A33]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071A33] via-transparent to-[#071A33]/50" />

        <div className="relative mx-auto max-w-content px-4 pb-20 pt-14 lg:pb-24 lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-2xl">
            <p className="text-sm text-white/55">Qurilish va ilm-fan platformasi</p>
            <h1 className="font-serif mt-3 text-[1.75rem] font-semibold leading-[1.2] sm:text-4xl lg:text-5xl">
              Qurilish muammolariga
              <br />
              ilmiy yechim
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75">
              Korxonalar muammo joylashtiradi, mutaxassislar taklif yuboradi. Bitta taklif qabul qilingandan so‘ng
              kontaktlar ochiladi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asLink to={primaryHref}>
                Muammo joylashtirish
              </Button>
              <Button size="lg" variant="outlineOnDark" asLink to="/problems">
                Muammolarni ko‘rish
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-12 grid gap-3 sm:grid-cols-3"
          >
            {catalogs.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-start gap-3 border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/[0.12]"
              >
                <item.icon size={20} className="mt-0.5 shrink-0 text-white/70" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <ArrowRight size={14} className="text-white/40 group-hover:text-white" />
                  </span>
                  <span className="mt-1 block text-sm text-white/55">{item.desc}</span>
                </span>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-b border-surface-border bg-white">
        <div className="mx-auto grid max-w-content grid-cols-2 sm:grid-cols-4">
          {counters.map((item, i) => (
            <div
              key={item.label}
              className={`px-4 py-6 ${i % 2 === 1 ? "border-l border-surface-border" : ""} ${i >= 2 ? "border-t border-surface-border sm:border-t-0" : ""} ${i > 0 ? "sm:border-l sm:border-surface-border" : ""}`}
            >
              <p className="text-2xl font-semibold text-ink sm:text-3xl">{item.value}</p>
              <p className="mt-1 text-sm text-ink-muted">{item.label}</p>
            </div>
          ))}
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
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
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

      <section className="bg-[#071A33] py-16 text-white">
        <div className="mx-auto max-w-content px-4 text-center">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Muammoingizga ilmiy yechim topishga tayyormisiz?
          </h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button size="lg" asLink to="/register">
              Ro‘yxatdan o‘tish
            </Button>
            <Button size="lg" variant="outlineOnDark" asLink to="/problems">
              Muammolarni ko‘rish
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
