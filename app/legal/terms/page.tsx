import type { ReactNode } from "react";

export const metadata = { title: "Terms of Service — Miomika" };

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-8 text-[17px] font-semibold text-ink">{children}</h2>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[14px] leading-relaxed text-ink-muted">{children}</p>;
}
function LI({ children }: { children: ReactNode }) {
  return <li className="mb-1.5 ml-4 list-disc text-[14px] leading-relaxed text-ink-muted">{children}</li>;
}

export default function TermsPage() {
  return (
    <article>
      <h1 className="text-[26px] font-semibold text-ink">Terms of Service</h1>
      <p className="mt-1 text-[13px] text-ink-subtle">Last updated: 15 June 2026</p>
      <P>{`Welcome to Miomika. These Terms of Service ("Terms") are a binding agreement between you and Mikaro Studio, a studio based in Bangkok, Thailand ("Miomika", "we", "us"), and govern your use of the Miomika website (miomika.com) and the Miomika application (together, the "Service"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.`}</P>

      <H2>1. Beta service</H2>
      <P>{`Miomika is currently offered as a `}<strong>beta</strong>{`. This means features may change, break, or be removed, and the Service is provided on an "as is" and "as available" basis while we develop it. We may add, change, or discontinue parts of the Service during beta without notice.`}</P>

      <H2>2. Who can use Miomika</H2>
      <P>{`You must be `}<strong>18 years of age or older</strong>{` to create an account or use the Service. The Service is intended for adults and is not directed to children. By using Miomika you confirm that you are at least 18. If we learn that an account belongs to someone under 18, we will suspend and delete it.`}</P>

      <H2>3. Your account</H2>
      <P>{`You sign in using a third-party login (Facebook, Instagram, or LINE). You are responsible for activity under your account and for keeping your login secure. One account per person. Tell us promptly at support@miomika.com if you believe your account has been used without your permission.`}</P>

      <H2>4. What Miomika is — and is not</H2>
      <P>{`Miomika helps you learn a language by talking with Miomi, an AI companion. `}<strong>Miomi is software, not a human.</strong>{` Miomi aims to be accurate and is designed to withhold answers it cannot verify, but it can still make mistakes. The Service is for language learning only. It is `}<strong>not</strong>{` a source of medical, legal, financial, psychological, or emergency advice, and must not be relied on as such.`}</P>

      <H2>5. Plans, payments, trials, and renewals</H2>
      <ul>
        <LI>{`Free trial. New accounts receive a one-time 10-minute voice trial. It is one-time, not a recurring allowance.`}</LI>
        <LI>{`Subscriptions. Pro and Pro Max are monthly subscriptions. Prices are shown in Thai baht (฿) at checkout and vary by the language you are learning. The price you see at purchase is the price that applies.`}</LI>
        <LI>{`Hour packs. Prepaid voice-time packs are available as one-time purchases.`}</LI>
        <LI>{`Payment. Payments are processed by our payment providers (Stripe and Omise). We do not store your full card details.`}</LI>
        <LI>{`Auto-renewal. Subscriptions renew automatically each month until you cancel. We will charge the payment method on file at each renewal.`}</LI>
        <LI>{`Cancellation. You can cancel anytime. Cancellation takes effect at the end of your current paid period; you keep access until then.`}</LI>
        <LI>{`Refunds (beta policy). Because Miomika is in beta, if you are unhappy you may request a refund within 14 days of a charge by emailing support@miomika.com, and we will refund that charge. Prepaid hour packs are refundable in proportion to unused time within the same 14-day window.`}</LI>
      </ul>

      <H2>6. Acceptable use</H2>
      <P>{`You agree not to: use the Service unlawfully or to harm others; harass, abuse, or send unlawful content to Miomi or other people; attempt to reverse-engineer, extract, copy, or misuse the underlying models, prompts, or curriculum; resell or commercially exploit the Service; or interfere with its security or operation. We may suspend accounts that break these rules.`}</P>

      <H2>7. Wellbeing and emotional reliance</H2>
      <P>{`Miomi is designed to feel warm and to remember you, and you may come to value those conversations. Please keep in mind that `}<strong>Miomi is an AI companion and is not a substitute for human relationships or professional care.</strong>{` We design Miomika to support your learning, not to maximise the time you spend in the app.`}</P>
      <P>{`Miomi cannot help in a crisis. If you are in danger or thinking about harming yourself, contact local emergency services or a crisis line immediately. In Thailand: emergency `}<strong>1669</strong>{`; Department of Mental Health hotline `}<strong>1323</strong>{` (24 hours, free); Mental Wellness Centre `}<strong>1667</strong>{`; Samaritans Thailand `}<strong>02 713 6793</strong>{`.`}</P>

      <H2>8. Intellectual property</H2>
      <P>{`Miomi, the Miomika name and artwork, the software, and the learning curriculum are owned by Mikaro Studio and protected by law. We grant you a personal, non-exclusive, non-transferable, revocable licence to use the Service for your own language learning. You may not copy, distribute, or create derivative works from our content.`}</P>

      <H2>9. Your content</H2>
      <P>{`You keep ownership of what you say and type to Miomi ("Your Content"). You grant us a limited licence to process Your Content solely to operate and provide the Service to you (for example, so Miomi can respond, teach you, and remember relevant context). We do `}<strong>not</strong>{` use Your Content to train or improve AI models. How we handle Your Content is described in our Privacy Policy.`}</P>

      <H2>10. Suspension and termination</H2>
      <P>{`You may stop using the Service and delete your account at any time. We may suspend or terminate access if you breach these Terms or to protect the Service or other users. If your account ends, the licences in Section 8 stop and we will handle your data as described in the Privacy Policy.`}</P>

      <H2>11. Disclaimers</H2>
      <P>{`To the fullest extent permitted by law, the Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, or uninterrupted availability. You use the Service at your own discretion and rely on Miomi's output at your own judgement.`}</P>

      <H2>12. Limitation of liability</H2>
      <P>{`To the fullest extent permitted by applicable law, and except for liability that cannot be excluded by law, Mikaro Studio will not be liable for indirect, incidental, or consequential damages, and our total liability arising out of or relating to the Service will not exceed the greater of the amount you paid us in the 12 months before the claim, or ฿1,000. Nothing in these Terms limits any rights you have under Thai consumer-protection law that cannot lawfully be limited.`}</P>

      <H2>13. Changes to these Terms</H2>
      <P>{`We may update these Terms as the Service develops. If we make material changes, we will notify you (for example, in the app or by email) before they take effect. Continuing to use the Service after changes take effect means you accept the updated Terms.`}</P>

      <H2>14. Governing law and disputes</H2>
      <P>{`These Terms are governed by the laws of Thailand. Disputes will be subject to the jurisdiction of the courts of Thailand. Where Thai law gives you mandatory consumer rights, those rights are not affected.`}</P>

      <H2>15. Contact</H2>
      <P>{`Questions about these Terms: support@miomika.com. Operator: Mikaro Studio, Bangkok, Thailand.`}</P>
    </article>
  );
}
