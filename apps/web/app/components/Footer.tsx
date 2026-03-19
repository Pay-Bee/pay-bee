import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ background: "rgba(5,5,12,0.97)", boxShadow: "0 -1px 0 rgba(251,191,36,0.12)" }}>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src="/logo/pay-bee-logo.png" alt="Pay-Bee" className="h-9 w-auto mb-2" />
            <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.35)", maxWidth: "200px" }}>
              Sri Lanka&apos;s gaming marketplace. Buy PC games in LKR, instantly.
            </p>
            <span
              className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border font-medium"
              style={{ borderColor: "rgba(251,191,36,0.2)", color: "rgba(251,191,36,0.7)", background: "rgba(251,191,36,0.06)" }}
            >
              🇱🇰 Made for Sri Lankan Gamers
            </span>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.25em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              Explore
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {[["Store", "/catalog"], ["New Releases", "/catalog"], ["Best Sellers", "/catalog"]].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-yellow-400 transition-colors duration-150">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.25em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              Account
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {[["Sign In", "/login"], ["Create Account", "/register"], ["My Orders", "/orders"]].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-yellow-400 transition-colors duration-150">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.25em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              Support
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <li>Payments in LKR</li>
              <li>Instant Key Delivery</li>
              <li>Secure Checkout</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} Pay-Bee. All rights reserved.
          </span>
          <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              Secure
            </span>
            <span>·</span>
            <span>Fast</span>
            <span>·</span>
            <span>Local</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
