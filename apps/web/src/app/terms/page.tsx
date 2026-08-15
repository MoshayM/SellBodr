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

        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <img src="/icons/icon.svg" alt="SellBodr" className="w-6 h-6"
            style={{ filter: 'drop-shadow(0 0 5px rgba(124,58,237,0.6))' }} />
          SellBodr
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-white/40 mb-10">Effective date: 1 August 2026</p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">

          <Section title="1. Acceptance of Terms">
            By registering for or using the SellBodr platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not access or use the Service. These Terms apply to all users, including visitors, registered users, and subscribers.
          </Section>

          <Section title="2. Description of Service">
            SellBodr is an AI-powered cross-border eCommerce intelligence platform. It discovers and scores products sourced in India for sale on international marketplaces (Amazon, eBay, Etsy, Walmart, TikTok Shop, and others). The Service provides opportunity scores, profitability models, sourcing leads, and AI-generated listing assets. All outputs are informational and advisory in nature.
          </Section>

          <Section title="3. Accounts">
            <ul className="space-y-2 list-disc pl-5 text-white/60">
              <li>You must provide accurate, current information when registering.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
              <li>You must be at least 16 years old to create an account.</li>
              <li>One person or legal entity may not maintain more than one free account.</li>
            </ul>
          </Section>

          <Section title="4. Subscriptions and Billing">
            <ul className="space-y-2 list-disc pl-5 text-white/60">
              <li>The Starter plan is free with a limit of 5 AI searches per month. Paid plans (Pro, Enterprise) are billed in advance on a monthly or annual basis.</li>
              <li>All fees are non-refundable except where required by applicable law.</li>
              <li>We reserve the right to change pricing with 30 days' notice.</li>
              <li>Failure to pay will result in downgrade to the Starter tier or account suspension.</li>
            </ul>
          </Section>

          <Section title="5. Acceptable Use">
            You agree not to:
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-white/60">
              <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
              <li>Resell, sublicense, or redistribute Service outputs without our written consent.</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
              <li>Scrape or programmatically harvest data from the Service beyond what official APIs allow.</li>
              <li>Upload or transmit viruses or other malicious code.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
            </ul>
          </Section>

          <Section title="6. AI-Generated Content Disclaimer">
            The Service uses large language models (including Groq / Llama, Anthropic Claude, and OpenAI GPT) to generate product recommendations, opportunity scores, sourcing leads, and listing copy. These outputs are AI-generated estimates and are provided for informational purposes only. They do not constitute financial, legal, or commercial advice. Scores and recommendations may be inaccurate; always conduct your own due diligence before making sourcing or listing decisions. We expressly disclaim liability for any business decisions made based on AI-generated outputs.
          </Section>

          <Section title="7. Intellectual Property">
            All intellectual property rights in the Service — including software, design, trademarks, and original content — belong to SellBodr / Digiaim Group. You retain ownership of any data you upload. You grant us a limited, non-exclusive licence to use that data solely to provide and improve the Service.
          </Section>

          <Section title="8. Limitation of Liability">
            To the maximum extent permitted by applicable law, SellBodr and its affiliates, officers, employees, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, or data, arising out of or in connection with your use of the Service, even if we have been advised of the possibility of such damages. Our total liability to you for any claim arising from these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.
          </Section>

          <Section title="9. Disclaimer of Warranties">
            The Service is provided "as is" and "as available" without warranty of any kind. We do not warrant that the Service will be uninterrupted, error-free, or that market data or AI outputs will be accurate or complete.
          </Section>

          <Section title="10. Termination">
            We may suspend or terminate your access to the Service at any time for violation of these Terms or for any reason with 30 days' notice. You may cancel your account at any time via the Settings page. Upon termination, your right to use the Service ceases immediately.
          </Section>

          <Section title="11. Governing Law">
            These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Kolkata, West Bengal, India.
          </Section>

          <Section title="12. Changes to Terms">
            We may revise these Terms at any time. We will notify you of material changes by email or by a prominent notice in the Service. Continued use after changes become effective constitutes acceptance of the revised Terms.
          </Section>

          <Section title="13. Contact">
            <p>SellBodr · Digiaim Group<br />
            Email: <a href="mailto:legal@sellbodr.com" className="text-violet-400 hover:text-violet-300">legal@sellbodr.com</a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/30">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
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
