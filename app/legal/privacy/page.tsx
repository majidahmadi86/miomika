import type { ReactNode } from "react";

export const metadata = { title: "Privacy Policy — Miomika" };

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-8 text-[17px] font-semibold text-ink">{children}</h2>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[14px] leading-relaxed text-ink-muted">{children}</p>;
}
function LI({ children }: { children: ReactNode }) {
  return <li className="mb-1.5 ml-4 list-disc text-[14px] leading-relaxed text-ink-muted">{children}</li>;
}

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-[26px] font-semibold text-ink">Privacy Policy</h1>
      <p className="mt-1 text-[13px] text-ink-subtle">Last updated: 15 June 2026</p>
      <P>{`This Privacy Policy explains how Mikaro Studio ("Miomika", "we", "us"), based in Bangkok, Thailand, collects and uses your personal data when you use miomika.com and the Miomika app (the "Service"). We follow Thailand's Personal Data Protection Act B.E. 2562 (the "PDPA"). For the purposes of the PDPA, Mikaro Studio is the data controller.`}</P>

      <H2>1. Who this applies to</H2>
      <P>{`The Service is for adults aged 18 and over. We do not knowingly collect personal data from anyone under 18. If we learn we have, we will delete it and close the account.`}</P>

      <H2>2. What we collect</H2>
      <ul>
        <LI>{`Account data: your name and email as provided by your social login (Facebook, Instagram, or LINE), and your social-login identifier.`}</LI>
        <LI>{`Conversation data: what you say (voice) and type to Miomi, and Miomi's responses.`}</LI>
        <LI>{`Learning data: your progress, and a memory of facts and preferences you share with Miomi so it can teach you over time.`}</LI>
        <LI>{`Usage and device data: how you use the Service, app and device information, and basic technical logs.`}</LI>
        <LI>{`Payment data: transaction records and payment metadata. Payments are handled by Stripe and Omise; we do not collect or store your full card number.`}</LI>
      </ul>

      <H2>3. Sensitive personal data</H2>
      <P>{`Because Miomi is conversational, you may choose to share personal or emotional information. We treat your conversation content as sensitive and handle it with extra care. We ask for your explicit consent to process this content when you start using the Service, and you can withdraw that consent at any time (see Section 9). Please avoid sharing more sensitive information than you need to.`}</P>

      <H2>4. Why we use your data and our legal basis</H2>
      <div className="my-3 overflow-hidden rounded-card border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-2 text-left text-ink">
              <th className="border-b border-line p-3 font-semibold">Purpose</th>
              <th className="border-b border-line p-3 font-semibold">Legal basis under the PDPA</th>
            </tr>
          </thead>
          <tbody className="text-ink-muted">
            <tr><td className="border-b border-line p-3">{`Create and run your account; provide lessons and conversations; process payments`}</td><td className="border-b border-line p-3">{`Performance of our contract with you`}</td></tr>
            <tr><td className="border-b border-line p-3">{`Process your conversation content so Miomi can respond, teach, and remember relevant context`}</td><td className="border-b border-line p-3">{`Your explicit consent`}</td></tr>
            <tr><td className="border-b border-line p-3">{`Keep the Service secure, prevent fraud and abuse, and fix problems`}</td><td className="border-b border-line p-3">{`Our legitimate interest`}</td></tr>
            <tr><td className="border-b border-line p-3">{`Send you service-related messages (e.g. billing, important changes)`}</td><td className="border-b border-line p-3">{`Performance of our contract / legitimate interest`}</td></tr>
            <tr><td className="p-3">{`Comply with legal obligations`}</td><td className="p-3">{`Legal obligation`}</td></tr>
          </tbody>
        </table>
      </div>

      <H2>5. We do not train AI on your conversations</H2>
      <P>{`We do not use your conversation content, learning data, or other personal data to train or improve AI or machine-learning models. We do not sell your personal data, and we do not use it for third-party advertising.`}</P>

      <H2>6. Who we share data with</H2>
      <P>{`We share data only with service providers who help us run the Service, under contracts that require them to protect it:`}</P>
      <ul>
        <LI>{`Payments: Stripe and Omise.`}</LI>
        <LI>{`Hosting and infrastructure: cloud hosting providers.`}</LI>
        <LI>{`AI voice and language services: providers that power Miomi's speech and responses, used only to deliver your conversation to you in real time.`}</LI>
      </ul>
      <P>{`We may also disclose data if required by law, to enforce our Terms, or to protect rights and safety.`}</P>

      <H2>7. International transfers</H2>
      <P>{`Some of our service providers are located outside Thailand, so your data may be processed abroad. When this happens, we take steps intended to ensure your data receives a comparable standard of protection, through provider commitments and contractual safeguards, and we rely on your consent where required.`}</P>

      <H2>8. How long we keep data</H2>
      <P>{`We keep your personal data while your account is active. When you delete your account (or withdraw the consent needed to provide the Service), we delete your conversation and learning data within 30 days, except where we must keep limited records longer to meet legal, tax, or fraud-prevention obligations, after which those records are deleted.`}</P>

      <H2>9. Your rights under the PDPA</H2>
      <P>{`You have the right to: access a copy of your data; correct it; delete it; withdraw consent; object to or restrict certain processing; request portability of data you provided; and lodge a complaint. To exercise any of these, use Settings → Your data in the app, or email privacy@miomika.com. We will respond within the timeframes required by the PDPA. Withdrawing consent does not affect processing done before withdrawal, but may mean we can no longer provide parts of the Service.`}</P>
      <P>{`If you believe we have mishandled your data, you may complain to the Office of the Personal Data Protection Committee (PDPC) in Thailand.`}</P>

      <H2>10. Security</H2>
      <P>{`We use reasonable technical and organisational measures to protect your data, including access controls and encryption in transit. No system is perfectly secure, but we work to protect your information and to limit who can access it.`}</P>

      <H2>11. Data breaches</H2>
      <P>{`If a data breach occurs that is likely to affect your rights, we will notify the PDPC and, where required, you, in line with the PDPA.`}</P>

      <H2>12. Changes to this policy</H2>
      <P>{`We may update this policy as the Service develops. If we make material changes, we will notify you before they take effect.`}</P>

      <H2>13. Contact</H2>
      <P>{`Privacy questions or requests: privacy@miomika.com. Controller: Mikaro Studio, Bangkok, Thailand.`}</P>
    </article>
  );
}
