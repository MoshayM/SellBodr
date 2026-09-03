import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service – SellBodr',
  description: 'Terms and conditions for using the SellBodr platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#020817] px-4 py-16">
      <div className="max-w-2xl mx-auto">

        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-6 h-6"
            style={{ filter: 'drop-shadow(0 0 5px rgba(124,58,237,0.6))' }} />
          SellBodr
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-white/40 mb-2">Effective date: 1 August 2026 · Last updated: 3 September 2026</p>
        <p className="text-sm text-white/50 mb-10 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
          <strong className="text-white/70">Plain-English summary:</strong> SellBodr is free to start — create a free account and get up to 5 AI product scans and full opportunity scores. Upgrade to Pro ($9/mo) for unlimited scans. AI content generation (reports, ads, brand kits, listing copy) uses credits — buy 10 for $5, spend them as you need. By accessing the Service in any capacity you accept these Terms.
        </p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">

          <Section title="1. Acceptance of Terms">
            By accessing or using the SellBodr platform ("Service") — whether as a guest, registered user, or subscriber — you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. If you do not agree, do not access or use the Service. These Terms form a legally binding agreement between you and SellBodr / Digiaim Group ("we", "us", "our").
          </Section>

          <Section title="2. Description of Service">
            SellBodr is an AI-powered cross-border eCommerce intelligence platform that discovers and scores products sourced in India for sale on international marketplaces (Amazon, eBay, Etsy, Walmart, TikTok Shop, Shopee, and others). The Service provides opportunity scores, profitability models, sourcing leads, market research, trend data, and AI-generated listing assets. All outputs are informational and advisory in nature and do not constitute financial, legal, or investment advice.
          </Section>

          <Section title="3. Access Tiers &amp; Accounts">
            <p className="mb-3">The Service operates three access tiers:</p>
            <ul className="space-y-2 list-disc pl-5 text-white/60 mb-4">
              <li><strong className="text-white/80">Starter (Free, registered account):</strong> Up to 5 AI product scans, top 10 results per scan, full 7-dimension Opportunity Score, supplier list, and profit calculator. No credit card required.</li>
              <li><strong className="text-white/80">Pro ($9/month):</strong> Requires a registered account. Unlocks unlimited AI product scans, all results with no caps, the complete India supplier map, profitability waterfall model, and advanced research tools.</li>
              <li><strong className="text-white/80">Organisation (Enterprise):</strong> Multi-seat Pro with API access, white-label reports, dedicated support, and SLA guarantee. Custom pricing — contact us.</li>
            </ul>
            <p className="text-white/60">When creating a registered account you must provide accurate, current information; maintain the confidentiality of your credentials; and be at least 16 years of age. One person or legal entity may not maintain more than one free registered account.</p>
          </Section>

          <Section title="4. Subscriptions, Credits &amp; Billing">
            <ul className="space-y-2 list-disc pl-5 text-white/60">
              <li><strong className="text-white/70">Subscription plans</strong> (Starter, Pro) are billed in advance on a monthly basis via Stripe. Starter is permanently free. Pro is $9/month and may be cancelled at any time.</li>
              <li><strong className="text-white/70">AI Generation Credits</strong> are a separate pay-per-use system. Generating AI content — Full Reports, Ad Campaign Drafts, Brand Identity packs, Listing Copy, Growth Playbooks, or Bundle Strategies — consumes 1 credit per generation. Credits are purchased in bundles: 10 credits for USD $5. Credits are non-subscription and never expire. Administrator accounts are exempt from credit charges.</li>
              <li>All fees are non-refundable except where required by applicable consumer protection law (including the EU Consumer Rights Directive, UK Consumer Rights Act 2015, and applicable Indian consumer protection statutes). EU/UK residents have a 14-day statutory cancellation right for digital subscriptions not yet consumed.</li>
              <li>We reserve the right to change pricing with 30 days' notice. You may cancel before the change takes effect to avoid the new rate.</li>
              <li>Failure to pay will result in automatic downgrade to Starter tier. Your data is retained for 90 days after downgrade to allow reactivation. Unused credits are retained and remain usable after reactivation.</li>
              <li>All prices are exclusive of taxes (GST, VAT, sales tax) where applicable. Applicable taxes will be shown at checkout.</li>
            </ul>
          </Section>

          <Section title="5. Acceptable Use">
            You agree not to:
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-white/60">
              <li>Use the Service for any unlawful purpose or in violation of any applicable local, national, or international regulation.</li>
              <li>Resell, sublicense, or redistribute Service outputs or AI-generated content without our prior written consent.</li>
              <li>Reverse engineer, decompile, disassemble, or attempt to extract the source code of the Service.</li>
              <li>Scrape or programmatically harvest data from the Service beyond what official APIs permit.</li>
              <li>Upload or transmit malware, viruses, or any code designed to disrupt, damage, or gain unauthorised access to systems.</li>
              <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
              <li>Use the Service to facilitate, encourage, or assist in activities that violate export control laws, sanctions (including OFAC, EU, UN, and UK sanctions), or customs regulations in any applicable jurisdiction.</li>
              <li>Use AI-generated supplier contacts or listing copy for deceptive, misleading, or fraudulent commercial communications.</li>
            </ul>
          </Section>

          <Section title="6. AI-Generated Content Disclaimer">
            The Service uses large language models (including Anthropic Claude, Groq / Meta Llama, Mistral, and OpenAI GPT) and marketplace data APIs to generate product recommendations, opportunity scores, sourcing leads, and listing copy. These outputs are:
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-white/60">
              <li>AI-generated estimates provided for informational purposes only.</li>
              <li>Not financial, legal, commercial, or investment advice.</li>
              <li>Potentially inaccurate or outdated — market conditions change and AI models may hallucinate or misrepresent data.</li>
              <li>Not a guarantee of product availability, supplier reliability, or profitability.</li>
            </ul>
            <p className="mt-3">Always conduct your own due diligence — including independent price verification, supplier vetting, and customs/import compliance checks — before making any sourcing or listing decision. We expressly disclaim all liability for business decisions made in reliance on AI-generated outputs.</p>
          </Section>

          <Section title="7. Intellectual Property">
            All intellectual property rights in the Service — including software, design, trademarks, training data, and original editorial content — belong to SellBodr / Digiaim Group or our licensors. You retain full ownership of any content or data you upload to the Service. You grant us a limited, non-exclusive, royalty-free licence to use that data solely to operate, maintain, and improve the Service during the period your account is active. We do not sell or license your data to third parties.
          </Section>

          <Section title="8. Third-Party Marketplace Rules">
            Opportunity scores and listing assets generated by the Service are intended to help you comply with marketplace policies. You are solely responsible for ensuring that any listings you publish comply with the rules of Amazon, eBay, Etsy, Walmart, TikTok Shop, and any other marketplace you use. We make no representation that AI-generated listings meet current marketplace content policies. Marketplace operator decisions (listing removal, account suspension) are outside our control and not grounds for a refund.
          </Section>

          <Section title="9. Export Controls &amp; Sanctions Compliance">
            The Service must not be used to facilitate trade with entities, individuals, or countries subject to sanctions or trade embargoes imposed by India, the United States (OFAC), the European Union, the United Kingdom, or the United Nations. You represent that you are not located in, or acting on behalf of, any sanctioned jurisdiction. Violation of this clause will result in immediate account termination.
          </Section>

          <Section title="10. Limitation of Liability">
            To the maximum extent permitted by applicable law (including the Indian IT Act 2000, EU Directive 2011/83/EU, and UK Consumer Rights Act 2015), SellBodr and its affiliates, officers, employees, agents, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, revenue, data, or business opportunity — arising out of or in connection with your use of the Service. Our total aggregate liability to you for any claim under these Terms shall not exceed the greater of (a) the total fees you paid us in the 12 months immediately preceding the claim, or (b) USD 50.
          </Section>

          <Section title="11. Disclaimer of Warranties">
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranty of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, secure, or that market data, AI scores, or supplier information will be accurate, complete, or current. To the extent that implied warranties cannot be excluded under applicable consumer protection law, their scope is limited to the minimum permitted by law.
          </Section>

          <Section title="12. Termination">
            <p className="mb-2">We may suspend or terminate your access at any time for:</p>
            <ul className="space-y-1 list-disc pl-5 text-white/60 mb-3">
              <li>Violation of these Terms.</li>
              <li>Non-payment after a 7-day grace period.</li>
              <li>Activity that endangers the security or integrity of the Service.</li>
              <li>Any other reason, with 30 days' written notice (except for security or legal reasons, where immediate termination applies).</li>
            </ul>
            <p>You may cancel your account at any time via Settings → Account. Upon cancellation, your data is retained for 90 days and then permanently deleted unless you request earlier deletion. Guest sessions expire automatically; no persistent data is stored beyond the browser session.</p>
          </Section>

          <Section title="13. Governing Law &amp; Dispute Resolution">
            <p className="mb-2">These Terms are governed by the laws of India. For users in the European Union or United Kingdom, mandatory consumer protection rights under applicable EU/UK law are not affected by this clause.</p>
            <ul className="space-y-1.5 list-disc pl-5 text-white/60">
              <li><strong className="text-white/70">India:</strong> Exclusive jurisdiction of the courts of Kolkata, West Bengal.</li>
              <li><strong className="text-white/70">EU users:</strong> May also bring claims before the courts of their EU member state of residence and access EU Online Dispute Resolution (ec.europa.eu/consumers/odr).</li>
              <li><strong className="text-white/70">UK users:</strong> May bring claims in England and Wales or their local jurisdiction.</li>
              <li><strong className="text-white/70">All users:</strong> We encourage good-faith resolution before litigation — email <a href="mailto:legal@sellbodr.com" className="text-violet-400 hover:text-violet-300">legal@sellbodr.com</a> first.</li>
            </ul>
          </Section>

          <Section title="14. Changes to Terms">
            We may revise these Terms at any time. We will notify registered users of material changes by email (at least 14 days before the change takes effect) and by a prominent notice in the Service. For Guest users, a notice will appear on the platform. Continued use after the effective date constitutes acceptance of the revised Terms.
          </Section>

          <Section title="15. Contact">
            <p>
              SellBodr · Digiaim Group<br />
              Email: <a href="mailto:legal@sellbodr.com" className="text-violet-400 hover:text-violet-300">legal@sellbodr.com</a><br />
              Privacy enquiries: <a href="mailto:privacy@sellbodr.com" className="text-violet-400 hover:text-violet-300">privacy@sellbodr.com</a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/30">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
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
