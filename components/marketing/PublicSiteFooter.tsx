import Link from "next/link";

/**
 * Site-wide footer for public marketing routes only (landing, /help, /legal/*).
 * Do not mount inside the logged-in app shell.
 */
export function PublicSiteFooter() {
  return (
    <footer className="mt-auto border-t border-line py-8">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <p className="text-sm text-ink-muted">
          Miomika · a Mikaro Studio product · Bangkok, Thailand
        </p>
        <nav
          aria-label="Site"
          className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-ink-muted"
        >
          <Link href="/legal/terms" className="hover:text-ink">
            Terms
          </Link>
          <span aria-hidden className="text-ink-subtle">
            ·
          </span>
          <Link href="/legal/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <span aria-hidden className="text-ink-subtle">
            ·
          </span>
          <a href="mailto:support@miomika.com" className="hover:text-ink">
            Support
          </a>
          <span aria-hidden className="text-ink-subtle">
            ·
          </span>
          <a
            href="https://www.linkedin.com/in/majid-ahmadi86/"
            target="_blank"
            rel="me noopener"
            className="hover:text-ink"
          >
            Founder LinkedIn
          </a>
          <span aria-hidden className="text-ink-subtle">
            ·
          </span>
          <a
            href="https://mikaro.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            mikaro.studio
          </a>
        </nav>
        <p className="mt-4 text-xs text-ink-subtle">© 2026 Mikaro Studio</p>
      </div>
    </footer>
  );
}
