import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy – SellBodr',
  description: 'How SellBodr collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#020817] px-4 py-16">
      <div className="max-w-2xl mx-auto">

        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-6 h-6"
            style={{ filter: 'drop-shadow(0 0 5px rgba(124,58,237,0.6))' }} />
          SellBodr
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-white/40 mb-2">Effective date: 1 August 2026 · Last updated: 16 August 2026</p>
        <p className="text-sm text-white/50 mb-10 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
          <strong className="text-white/70">Plain-English summary:</strong> Guest users browse anonymously — we collect no personal data from you. Registered users provide an email and name. We never sell your data. You can delete your account and all associated data at any time.
        </p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">

          <Section title="1. Who We Are">
            SellBodr (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is operated by Digiaim Group. We operate the SellBodr cross-border eCommerce intelligence platform (&quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use the Service, whether as a guest or a registered user. We act as the data controller under applicable data protection law including the EU General Data Protection Regulation (GDPR), the UK GDPR, India&apos;s Digital Personal Data Protection Act 2023 (DPDPA), and the California Consumer Privacy Act (CCPA).
          </Section>

          <Section title="2. Data We Collect — Guests vs. Registered Users">
            <p className="mb-3 font-semibold text-white/80">Guest users (no account):</p>
            <ul className="space-y-1.5 list-disc pl-5 text-white/60 mb-5">
              <li><Pill>Technical data only:</Pill> server-side access logs (anonymised IP, browser type, timestamp). Logs are rotated every 7 days and never linked to a personal identity.</li>
              <li><Pill>Session storage:</Pill> your filter preferences and wishlist are stored exclusively in your browser&apos;s localStorage. We never read or transmit this data.</li>
              <li>No cookies are set for guest users beyond a strictly necessary session identifier.</li>
            </ul>
            <p className="mb-3 font-semibold text-white/80">Registered users (Pro / Organisation):</p>
            <ul className="space-y-2 list-none pl-0 text-white/60">
              <li><Pill>Account data</Pill> — name, email address, argon2-hashed password, plan tier, account creation timestamp, and passkey credentials (stored as public keys only — your biometric data never leaves your device).</li>
              <li><Pill>Usage data</Pill> — opportunity searches, filters applied, marketplace and category selections, and features used — collected to personalise your dashboard and improve our AI models.</li>
              <li><Pill>AI search inputs</Pill> — the product keywords and marketplace preferences you submit. We log query context (not free-form text) for model quality assurance. Query logs are anonymised after 30 days.</li>
              <li><Pill>Optional API keys</Pill> — if you supply third-party API keys (Groq, Anthropic, OpenAI, etc.) they are stored AES-256 encrypted. They are never transmitted in plain text and are never accessible to our staff.</li>
              <li><Pill>Payment data</Pill> — billing is handled by our payment processor. We store only the last 4 digits of a card and billing country. We never handle raw card numbers.</li>
              <li><Pill>Communication data</Pill> — emails you send to our support address.</li>
            </ul>
          </Section>

          <Section title="3. Lawful Basis for Processing (GDPR / UK GDPR)">
            <ul className="space-y-1.5 list-disc pl-5 text-white/60">
              <li><strong className="text-white/70">Contract performance</strong> — processing your account data and search inputs to provide the Service you subscribed to.</li>
              <li><strong className="text-white/70">Legitimate interests</strong> — anonymised analytics to improve our AI models, fraud prevention, and service security. We have conducted a Legitimate Interests Assessment (LIA) and concluded our interests are not overridden by your rights.</li>
              <li><strong className="text-white/70">Legal obligation</strong> — retaining financial records as required by Indian and applicable international tax law.</li>
              <li><strong className="text-white/70">Consent</strong> — marketing emails (opt-in only). You may withdraw consent at any time by clicking &quot;unsubscribe&quot;.</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Information">
            <ul className="space-y-1.5 list-disc pl-5 text-white/60">
              <li>Operate and maintain the Service, including running AI opportunity scouts.</li>
              <li>Personalise your dashboard — surfacing relevant marketplaces, products, and sourcing leads.</li>
              <li>Improve our AI scoring models using aggregated, anonymised patterns (never individual identifiers).</li>
              <li>Send transactional emails (account confirmation, password reset, payment receipts). We do not send marketing email without explicit opt-in.</li>
              <li>Detect, investigate, and prevent fraud, abuse, or violations of our Terms.</li>
              <li>Comply with applicable law, court orders, or lawful requests from public authorities.</li>
              <li>We do not sell, rent, or trade your personal data to any third party for their own marketing purposes.</li>
            </ul>
          </Section>

          <Section title="5. Cookies &amp; Local Storage">
            <p className="mb-3">We use a minimal cookie footprint:</p>
            <ul className="space-y-2 list-none pl-0 text-white/60">
              <li><Pill>Strictly necessary:</Pill> <code className="text-violet-300 text-xs">bs_access_token</code> (JWT stored in localStorage) — required for authenticated sessions. Expires after 24 hours. No equivalent cookie is set for guests.</li>
              <li><Pill>Analytics:</Pill> Vercel Edge Network collects anonymised access logs (no cookie). We do not use Google Analytics or third-party tracking pixels.</li>
              <li><Pill>Wishlist / preferences:</Pill> Stored in your browser&apos;s localStorage only. Never transmitted to our servers.</li>
            </ul>
            <p className="mt-3">Because we do not place non-essential cookies, no cookie consent banner is required under the EU ePrivacy Directive or UK PECR. If our cookie use changes, we will update this policy and add a consent mechanism before deploying any non-essential cookies.</p>
          </Section>

          <Section title="6. Third-Party Service Providers">
            <p className="mb-3">We share data only with processors that operate under Data Processing Agreements (DPAs) and whose privacy practices we have assessed:</p>
            <ul className="space-y-2 list-disc pl-5 text-white/60">
              <li><strong className="text-white/80">Anthropic / Groq / Mistral / OpenAI</strong> — AI inference. Anonymous query context (marketplace, category keywords) is transmitted. No personal account data is sent. These providers&apos; zero-data-retention options are used where available.</li>
              <li><strong className="text-white/80">Turso (libsql)</strong> — database. All application data is stored in an AWS-region (eu-central-1 for EU users) SQLite-compatible database.</li>
              <li><strong className="text-white/80">Vercel</strong> — application hosting and edge network. Vercel processes request metadata per their privacy policy and DPA. EU/UK traffic is served from EU edge nodes.</li>
              <li><strong className="text-white/80">Marketplaces (Amazon, eBay, Etsy, etc.)</strong> — only publicly available catalogue data is fetched server-side. Your personal data is never sent to marketplace APIs.</li>
            </ul>
          </Section>

          <Section title="7. International Data Transfers">
            Our servers are primarily hosted in the US (Vercel) and EU (Turso eu-central-1). Transfers from the EEA or UK to the US rely on Standard Contractual Clauses (SCCs) and, where applicable, the EU-US Data Privacy Framework. Users in India: processing occurs under the DPDPA 2023. If you have questions about safeguards for cross-border transfers, contact <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a>.
          </Section>

          <Section title="8. Data Retention">
            <ul className="space-y-1.5 list-disc pl-5 text-white/60">
              <li><strong className="text-white/70">Guest sessions:</strong> Server access logs are rotated after 7 days. No personal data is retained beyond the browser session.</li>
              <li><strong className="text-white/70">Registered accounts:</strong> Retained for as long as the account is active.</li>
              <li><strong className="text-white/70">After account deletion:</strong> Personal data is permanently deleted within 30 days. Financial/tax records are retained for 7 years as required by Indian tax law.</li>
              <li><strong className="text-white/70">AI query logs:</strong> Anonymised after 30 days; fully deleted after 12 months.</li>
            </ul>
          </Section>

          <Section title="9. Your Rights">
            <p className="mb-3">Depending on your jurisdiction, you have the following rights over your personal data:</p>
            <ul className="space-y-1.5 list-disc pl-5 text-white/60 mb-3">
              <li><strong className="text-white/70">Access</strong> — request a copy of the data we hold about you.</li>
              <li><strong className="text-white/70">Rectification</strong> — correct inaccurate or incomplete data.</li>
              <li><strong className="text-white/70">Erasure (&quot;right to be forgotten&quot;)</strong> — request deletion of your personal data.</li>
              <li><strong className="text-white/70">Portability</strong> — receive your data in a structured, machine-readable format (GDPR/UK GDPR).</li>
              <li><strong className="text-white/70">Restriction / Objection</strong> — object to processing based on legitimate interests or restrict how we use your data.</li>
              <li><strong className="text-white/70">Withdraw consent</strong> — for any processing based on consent (e.g. marketing emails) at any time.</li>
              <li><strong className="text-white/70">CCPA (California):</strong> Right to know, right to delete, right to opt-out of sale (we do not sell data), and right to non-discrimination.</li>
              <li><strong className="text-white/70">India DPDPA:</strong> Right to access, correct, and erase personal data; right to grievance redressal.</li>
            </ul>
            <p>To exercise any right, email <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a>. We will acknowledge within 72 hours and respond within 30 days (or 45 days where permitted). We do not charge a fee for reasonable requests.</p>
          </Section>

          <Section title="10. Security">
            We implement layered security controls: TLS 1.3 in transit, AES-256 for sensitive data at rest (API keys, secrets), argon2id for passwords, short-lived JWTs (24-hour expiry), passkey (FIDO2/WebAuthn) support, and rate limiting on all authentication endpoints. Access to production data is restricted to named engineers with MFA. We conduct periodic security reviews. No method of transmission or storage is 100% secure; we cannot guarantee absolute security and recommend you use a strong, unique password or passkey.
          </Section>

          <Section title="11. Children&apos;s Privacy">
            The Service is not directed to children under 16. We do not knowingly collect personal data from minors. If you believe a child has provided us with personal data, contact <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a> and we will delete it within 30 days.
          </Section>

          <Section title="12. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify registered users of material changes by email at least 14 days before they take effect and display a prominent notice in the Service. The &quot;Last updated&quot; date at the top reflects the most recent revision. For Guest users, a notice will appear on the platform. Continued use after the effective date constitutes acceptance.
          </Section>

          <Section title="13. Data Protection Officer &amp; Contact">
            <p className="mb-2">
              SellBodr · Digiaim Group<br />
              Privacy enquiries: <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a><br />
              Legal enquiries: <a href="mailto:legal@sellbodr.com" className="text-violet-400 hover:text-violet-300">legal@sellbodr.com</a>
            </p>
            <p className="text-white/50">EU/UK users have the right to lodge a complaint with their local supervisory authority (e.g. the ICO in the UK, or your national DPA in the EU). We encourage you to contact us first so we can resolve concerns directly.</p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/30">
          <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/opportunities" className="hover:text-white/60 transition-colors">Browse Free</Link>
          <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">← Back to SellBodr</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-white mb-3">{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <strong className="text-white/90 font-semibold">{children}</strong>;
}
