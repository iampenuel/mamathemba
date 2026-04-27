import Link from "next/link";

type BrandHomeLinkProps = {
  showSubtitle?: boolean;
  className?: string;
};

export default function BrandHomeLink({
  showSubtitle = true,
  className = "",
}: BrandHomeLinkProps) {
  return (
    <Link href="/" className={`block ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c7368] transition hover:text-[#342d26]">
        Mamathemba v1
      </p>

      {showSubtitle && (
        <p className="mt-1 text-sm text-[#5f564c] transition hover:text-[#342d26]">
          Maternal referral-readiness and handoff support
        </p>
      )}
    </Link>
  );
}