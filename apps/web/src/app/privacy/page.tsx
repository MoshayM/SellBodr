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

        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-6 h-6 rounded-md" />
          SellBodr
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-white/40 mb-10">Effective date: 1 August 2026</p>

        <div className="prose-dark space-y-8 text-white/70 text-sm leading-relaxed">

          <Section title="1. Introduction">
            SellBodr ("we", "our", or "us") operates the SellBodr cross-border eCommerce intelligence platform accessible at sellbodr.vercel.app ("Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Service. By accessing the Service you agree to the practices described here.
          </Section>

          <Section title="2. Information We Collect">
            <ul className="space-y-2 list-none pl-0">
              <li><Pill>Account data</Pill> — name, email address, hashed password, plan tier, and account timestamps when you register.</li>
              <li><Pill>Usage data</Pill> — pages visited, features used, opportunity searches run, filters applied, and marketplace selections — collected to personalise your dashboard and improve our AI models.</li>
              <li><Pill>AI search inputs</Pill> — the marketplace and category preferences you submit trigger AI product-discovery calls. We log the query context for quality assurance and model improvement.</li>
              <li><Pill>AI provider keys</Pill> — if you supply optional API keys (Groq, Anthropic, OpenAI, etc.) they are stored encrypted in our database and never transmitted in plain text.</li>
              <li><Pill>Technical data</Pill> — IP address, browser type, device type, and referrer URL, collected automatically via server logs.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            We use collected data to:
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-white/60">
              <li>Provide and maintain the Service, including running AI opportunity scouts on your behalf.</li>
              <li>Personalise your experience — surfacing relevant marketplaces, products, and sourcing leads.</li>
              <li>Improve our AI scoring models using aggregated, anonymised search patterns.</li>
              <li>Send transactional emails (account confirmation, password reset). We do not send marketing email without explicit opt-in.</li>
              <li>Detect, prevent, and respond to fraud or abuse.</li>
              <li>Comply with applicable law.</li>
            </ul>
          </Section>

          <Section title="4. Third-Party Services">
            The Service integrates with the following third-party providers. Each has its own privacy policy:
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-white/60">
              <li><strong className="text-white/80">Groq / Anthropic / OpenAI</strong> — AI inference providers. Search query context (marketplace, category) is transmitted to generate product recommendations. No personal account data is sent.</li>
              <li><strong className="text-white/80">Turso (libsql)</strong> — our database provider stores all application data in an AWS-hosted SQLite-compatible database.</li>
              <li><strong className="text-white/80">Vercel</strong> — application hosting and edge network. Vercel may collect request logs per their privacy policy.</li>
              <li><strong className="text-white/80">Amazon, eBay, Etsy, and other marketplaces</strong> — publicly available catalogue and pricing data is fetched server-side; we do not send your personal data to these platforms.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            We retain your account data for as long as your account is active. If you delete your account, we permanently delete your personal data within 30 days, except where we are legally required to retain it longer.
          </Section>

          <Section title="6. Your Rights">
            Depending on your jurisdiction you may have the right to access, correct, or delete your personal data, object to or restrict processing, and port your data to another service. To exercise any of these rights, email us at <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a>. We will respond within 30 days.
          </Section>

          <Section title="7. Security">
            We implement industry-standard safeguards: TLS in transit, encrypted API keys at rest, and JWT-based session management with short-lived access tokens. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </Section>

          <Section title="8. Children's Privacy">
            The Service is not directed to children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete it promptly.
          </Section>

          <Section title="9. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of material changes by updating the effective date above and, where appropriate, by email. Continued use of the Service after changes constitutes acceptance of the revised policy.
          </Section>

          <Section title="10. Contact Us">
            <p>SellBodr · Digiaim Group<br />
            Email: <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex gap-6 text-xs text-white/30">
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-white/50 transition-colors">Back to Login</Link>
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
