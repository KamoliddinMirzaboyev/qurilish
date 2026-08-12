import { Link } from "react-router-dom";
import { Phone, Mail, Copy, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { notify } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";

const linkButtonClasses =
  "inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 h-9 text-sm font-medium text-ink hover:bg-slate-50";

export function ConnectionCard({
  problemId,
  problemTitle,
  contactName,
  contactSubtitle,
  email,
  phone,
  acceptedAt,
}: {
  problemId: string;
  problemTitle: string;
  contactName: string;
  contactSubtitle?: string;
  email: string;
  phone: string;
  acceptedAt: string;
}) {
  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value);
    notify.success(`${label} nusxalandi`);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-ink-muted">{problemTitle}</p>
        <h3 className="text-lg font-semibold text-brand-dark">{contactName}</h3>
        {contactSubtitle && <p className="text-sm text-ink-muted">{contactSubtitle}</p>}
        <p className="mt-1 text-xs text-ink-muted">Qabul qilingan sana: {formatDate(acceptedAt)}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-ink">
            <Phone size={16} className="text-brand-primary" /> {phone}
          </span>
          <button onClick={() => copy(phone, "Telefon raqami")} className="text-ink-muted hover:text-brand-primary" aria-label="Telefonni nusxalash">
            <Copy size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-ink">
            <Mail size={16} className="text-brand-primary" /> {email}
          </span>
          <button onClick={() => copy(email, "Email")} className="text-ink-muted hover:text-brand-primary" aria-label="Emailni nusxalash">
            <Copy size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a href={`tel:${phone}`} className={linkButtonClasses}>
          <Phone size={15} /> Telefon qilish
        </a>
        <a href={`mailto:${email}`} className={linkButtonClasses}>
          <Mail size={15} /> Email yozish
        </a>
        <Link to={`/problems/${problemId}`} className="ml-auto flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primaryHover">
          Muammoni ko'rish <ExternalLink size={14} />
        </Link>
      </div>
    </Card>
  );
}
