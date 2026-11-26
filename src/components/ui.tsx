import { CheckCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const palette = [
  "#7fa9e8",
  "#dca16a",
  "#8abc9b",
  "#b39cdb",
  "#db91aa",
  "#d4bf77",
  "#75bfc4",
  "#bbaca0",
];

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Instinct dashboard">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      INSTINCT
      <span className="brand-divider" />
      <span className="brand-sub">YOUR SECOND BRAIN</span>
    </Link>
  );
}

export function Dot({ category }: { category?: string }) {
  let index = 0;
  for (const character of category ?? "") {
    index = (index * 31 + character.charCodeAt(0)) % palette.length;
  }
  return (
    <span
      className="category-dot"
      style={{ backgroundColor: category ? palette[index] : "#93948f" }}
      aria-hidden="true"
    />
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CheckCheck size={22} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
