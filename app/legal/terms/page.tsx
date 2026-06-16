import { cookies } from "next/headers";
import { H2, P, LI, Notice, DocTitle } from "../_components";

export const metadata = { title: "Terms of Service — Miomika" };

function TermsEN() {
  return (
    <article>
      <DocTitle title="Terms of Service" date="Last updated: 15 June 2026" />
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

function TermsTH() {
  return (
    <article>
      <DocTitle title="ข้อกำหนดในการให้บริการ" date="ปรับปรุงล่าสุด: 15 มิถุนายน 2569" />
      <Notice>{`หมายเหตุ / Notice — ฉบับภาษาไทยนี้จัดทำขึ้นเพื่อความสะดวกและความเข้าใจของผู้ใช้เท่านั้น หากมีข้อความขัดแย้งกัน ให้ยึดถือฉบับภาษาอังกฤษเป็นสำคัญ. This Thai version is provided for convenience and understanding only; in the event of any inconsistency, the English version shall prevail. ในช่วงเบต้า ฉบับภาษาอังกฤษเป็นฉบับที่มีผลผูกพันทางกฎหมาย / During beta, the English version is the binding version.`}</Notice>
      <P>{`ยินดีต้อนรับสู่ Miomika ข้อกำหนดในการให้บริการนี้ ("ข้อกำหนด") เป็นข้อตกลงที่มีผลผูกพันระหว่างคุณกับ Mikaro Studio ซึ่งเป็นสตูดิโอที่ตั้งอยู่ในกรุงเทพมหานคร ประเทศไทย ("Miomika", "เรา") และใช้บังคับกับการใช้งานเว็บไซต์ Miomika (miomika.com) และแอปพลิเคชัน Miomika (รวมเรียกว่า "บริการ") เมื่อคุณสร้างบัญชีหรือใช้บริการ ถือว่าคุณยอมรับข้อกำหนดนี้ หากคุณไม่ยอมรับ โปรดอย่าใช้บริการ`}</P>
      <H2>1. บริการในช่วงเบต้า</H2>
      <P>{`ขณะนี้ Miomika ให้บริการในรูปแบบเบต้า (beta) ซึ่งหมายความว่าฟีเจอร์ต่าง ๆ อาจมีการเปลี่ยนแปลง ขัดข้อง หรือถูกนำออกได้ และบริการนี้ให้บริการ "ตามสภาพที่เป็นอยู่" (as is) และ "ตามที่มีให้บริการ" (as available) ในระหว่างที่เรากำลังพัฒนา เราอาจเพิ่ม เปลี่ยนแปลง หรือยุติส่วนใดส่วนหนึ่งของบริการในช่วงเบต้าโดยไม่ต้องแจ้งล่วงหน้า`}</P>
      <H2>2. ผู้ที่สามารถใช้ Miomika ได้</H2>
      <P>{`คุณต้องมีอายุ 18 ปีบริบูรณ์ขึ้นไป จึงจะสร้างบัญชีหรือใช้บริการได้ บริการนี้มีไว้สำหรับผู้ใหญ่และไม่ได้มุ่งเป้าไปที่เด็ก เมื่อคุณใช้ Miomika ถือว่าคุณยืนยันว่าคุณมีอายุอย่างน้อย 18 ปี หากเราพบว่าบัญชีใดเป็นของผู้ที่มีอายุต่ำกว่า 18 ปี เราจะระงับและลบบัญชีนั้น`}</P>
      <H2>3. บัญชีของคุณ</H2>
      <P>{`คุณเข้าสู่ระบบโดยใช้การล็อกอินจากบริการภายนอก (Facebook, Instagram หรือ LINE) คุณเป็นผู้รับผิดชอบต่อกิจกรรมที่เกิดขึ้นภายใต้บัญชีของคุณ และต่อการรักษาข้อมูลการเข้าสู่ระบบให้ปลอดภัย อนุญาตให้มีหนึ่งบัญชีต่อหนึ่งคน โปรดแจ้งเราโดยเร็วที่ support@miomika.com หากคุณเชื่อว่ามีผู้ใช้บัญชีของคุณโดยไม่ได้รับอนุญาต`}</P>
      <H2>4. Miomika คืออะไร และไม่ใช่อะไร</H2>
      <P>{`Miomika ช่วยให้คุณเรียนภาษาผ่านการพูดคุยกับ Miomi ซึ่งเป็นเพื่อน AI `}<strong>Miomi เป็นซอฟต์แวร์ ไม่ใช่มนุษย์</strong>{` Miomi มุ่งให้ข้อมูลที่ถูกต้องและถูกออกแบบให้ระงับคำตอบที่ไม่สามารถยืนยันได้ แต่ก็ยังอาจผิดพลาดได้ บริการนี้มีไว้สำหรับการเรียนภาษาเท่านั้น ไม่ใช่แหล่งคำแนะนำทางการแพทย์ กฎหมาย การเงิน จิตวิทยา หรือกรณีฉุกเฉิน และไม่ควรนำไปใช้พึ่งพาในเรื่องเหล่านั้น`}</P>
      <H2>5. แพ็กเกจ การชำระเงิน การทดลองใช้ และการต่ออายุ</H2>
      <ul>
        <LI>{`ทดลองใช้ฟรี: บัญชีใหม่จะได้รับสิทธิ์ทดลองสนทนาด้วยเสียง 10 นาที แบบครั้งเดียว เป็นสิทธิ์แบบครั้งเดียว ไม่ใช่สิทธิ์ที่เติมใหม่เป็นรอบ ๆ`}</LI>
        <LI>{`การสมัครสมาชิก: Pro และ Pro Max เป็นการสมัครสมาชิกรายเดือน ราคาจะแสดงเป็นเงินบาท (฿) ณ ขั้นตอนชำระเงิน และแตกต่างกันตามภาษาที่คุณกำลังเรียน ราคาที่คุณเห็นตอนซื้อคือราคาที่ใช้บังคับ`}</LI>
        <LI>{`แพ็กชั่วโมง: แพ็กเวลาสนทนาด้วยเสียงแบบจ่ายล่วงหน้ามีจำหน่ายเป็นการซื้อแบบครั้งเดียว`}</LI>
        <LI>{`การชำระเงิน: ดำเนินการโดยผู้ให้บริการชำระเงินของเรา (Stripe และ Omise) เราไม่จัดเก็บข้อมูลบัตรของคุณแบบเต็ม`}</LI>
        <LI>{`การต่ออายุอัตโนมัติ: การสมัครสมาชิกจะต่ออายุโดยอัตโนมัติทุกเดือนจนกว่าคุณจะยกเลิก เราจะเรียกเก็บเงินจากวิธีการชำระเงินที่บันทึกไว้ในแต่ละรอบการต่ออายุ`}</LI>
        <LI>{`การยกเลิก: คุณสามารถยกเลิกได้ตลอดเวลา การยกเลิกจะมีผลเมื่อสิ้นสุดรอบที่ชำระเงินไว้แล้วในปัจจุบัน โดยคุณยังคงใช้งานได้จนถึงเวลานั้น`}</LI>
        <LI>{`การคืนเงิน (นโยบายช่วงเบต้า): เนื่องจาก Miomika อยู่ในช่วงเบต้า หากคุณไม่พอใจ คุณสามารถขอคืนเงินภายใน 14 วัน นับจากการเรียกเก็บเงินได้ โดยส่งอีเมลถึง support@miomika.com และเราจะคืนเงินรายการนั้น แพ็กชั่วโมงแบบจ่ายล่วงหน้าสามารถขอคืนเงินตามสัดส่วนของเวลาที่ยังไม่ได้ใช้ภายในกรอบเวลา 14 วันเดียวกัน`}</LI>
      </ul>
      <H2>6. การใช้งานที่ยอมรับได้</H2>
      <P>{`คุณตกลงว่าจะไม่ใช้บริการโดยผิดกฎหมายหรือเพื่อทำร้ายผู้อื่น ไม่คุกคาม ทำร้าย หรือส่งเนื้อหาที่ผิดกฎหมายไปยัง Miomi หรือบุคคลอื่น ไม่พยายามทำวิศวกรรมย้อนกลับ ดึงข้อมูล ทำซ้ำ หรือใช้โมเดล พรอมต์ หรือหลักสูตรเบื้องหลังในทางที่ผิด ไม่ขายต่อหรือแสวงหาประโยชน์เชิงพาณิชย์จากบริการ และไม่รบกวนความปลอดภัยหรือการทำงานของบริการ เราอาจระงับบัญชีที่ฝ่าฝืนกฎเหล่านี้`}</P>
      <H2>7. สุขภาวะและการพึ่งพาทางอารมณ์</H2>
      <P>{`Miomi ถูกออกแบบให้รู้สึกอบอุ่นและจดจำคุณได้ และคุณอาจให้คุณค่ากับการสนทนาเหล่านั้น โปรดระลึกไว้ว่า `}<strong>Miomi เป็นเพื่อน AI ไม่ใช่สิ่งทดแทนความสัมพันธ์กับมนุษย์หรือการดูแลจากผู้เชี่ยวชาญ</strong>{` เราออกแบบ Miomika เพื่อสนับสนุนการเรียนรู้ของคุณ ไม่ใช่เพื่อเพิ่มเวลาที่คุณใช้ในแอปให้มากที่สุด`}</P>
      <P>{`Miomi ไม่สามารถช่วยเหลือในกรณีฉุกเฉินได้ หากคุณตกอยู่ในอันตรายหรือมีความคิดที่จะทำร้ายตนเอง โปรดติดต่อบริการฉุกเฉินหรือสายด่วนช่วยเหลือทันที ในประเทศไทย: เหตุฉุกเฉิน `}<strong>1669</strong>{`; สายด่วนสุขภาพจิต กรมสุขภาพจิต `}<strong>1323</strong>{` (ตลอด 24 ชั่วโมง ฟรี); ศูนย์สุขภาพจิต `}<strong>1667</strong>{`; สมาคมสะมาริตันส์แห่งประเทศไทย `}<strong>02 713 6793</strong>{`.`}</P>
      <H2>8. ทรัพย์สินทางปัญญา</H2>
      <P>{`Miomi ชื่อและงานศิลป์ Miomika ซอฟต์แวร์ และหลักสูตรการเรียนรู้ เป็นทรัพย์สินของ Mikaro Studio และได้รับความคุ้มครองตามกฎหมาย เราให้สิทธิ์คุณใช้บริการเพื่อการเรียนภาษาของคุณเองในลักษณะส่วนบุคคล ไม่ผูกขาด ไม่สามารถโอนสิทธิ์ได้ และเพิกถอนได้ คุณไม่สามารถทำซ้ำ เผยแพร่ หรือสร้างงานดัดแปลงจากเนื้อหาของเรา`}</P>
      <H2>9. เนื้อหาของคุณ</H2>
      <P>{`คุณยังคงเป็นเจ้าของสิ่งที่คุณพูดและพิมพ์ถึง Miomi ("เนื้อหาของคุณ") คุณให้สิทธิ์เราในการประมวลผลเนื้อหาของคุณเพียงเพื่อดำเนินการและให้บริการแก่คุณเท่านั้น (เช่น เพื่อให้ Miomi ตอบกลับ สอนคุณ และจดจำบริบทที่เกี่ยวข้อง) เรา`}<strong>ไม่</strong>{`ใช้เนื้อหาของคุณเพื่อฝึกหรือปรับปรุงโมเดล AI วิธีที่เราจัดการกับเนื้อหาของคุณอธิบายไว้ในนโยบายความเป็นส่วนตัวของเรา`}</P>
      <H2>10. การระงับและการยุติบริการ</H2>
      <P>{`คุณสามารถหยุดใช้บริการและลบบัญชีของคุณได้ตลอดเวลา เราอาจระงับหรือยุติการเข้าถึงหากคุณฝ่าฝืนข้อกำหนดนี้ หรือเพื่อปกป้องบริการหรือผู้ใช้รายอื่น หากบัญชีของคุณสิ้นสุดลง สิทธิ์การใช้งานในข้อ 8 จะสิ้นสุดลง และเราจะจัดการข้อมูลของคุณตามที่อธิบายไว้ในนโยบายความเป็นส่วนตัว`}</P>
      <H2>11. ข้อปฏิเสธความรับผิด</H2>
      <P>{`ภายในขอบเขตสูงสุดที่กฎหมายอนุญาต บริการนี้ให้บริการ "ตามสภาพที่เป็นอยู่" และ "ตามที่มีให้บริการ" โดยไม่มีการรับประกันใด ๆ ไม่ว่าโดยชัดแจ้งหรือโดยปริยาย รวมถึงความเหมาะสมต่อวัตถุประสงค์เฉพาะ ความถูกต้อง หรือการให้บริการที่ไม่หยุดชะงัก คุณใช้บริการตามดุลยพินิจของคุณเอง และพึ่งพาผลลัพธ์จาก Miomi ตามวิจารณญาณของคุณเอง`}</P>
      <H2>12. การจำกัดความรับผิด</H2>
      <P>{`ภายในขอบเขตสูงสุดที่กฎหมายที่ใช้บังคับอนุญาต และยกเว้นความรับผิดที่ไม่อาจยกเว้นได้ตามกฎหมาย Mikaro Studio จะไม่รับผิดต่อความเสียหายทางอ้อม ความเสียหายโดยบังเอิญ หรือความเสียหายอันเป็นผลสืบเนื่อง และความรับผิดรวมของเราที่เกิดจากหรือเกี่ยวข้องกับบริการจะไม่เกินจำนวนที่สูงกว่าระหว่างจำนวนเงินที่คุณชำระให้เราในช่วง 12 เดือนก่อนเกิดข้อเรียกร้อง หรือ ฿1,000 ทั้งนี้ ไม่มีข้อความใดในข้อกำหนดนี้ที่จำกัดสิทธิ์ที่คุณมีภายใต้กฎหมายคุ้มครองผู้บริโภคของไทยซึ่งไม่อาจจำกัดได้โดยชอบด้วยกฎหมาย`}</P>
      <H2>13. การเปลี่ยนแปลงข้อกำหนด</H2>
      <P>{`เราอาจปรับปรุงข้อกำหนดนี้เมื่อบริการพัฒนาไป หากเรามีการเปลี่ยนแปลงที่เป็นสาระสำคัญ เราจะแจ้งให้คุณทราบ (เช่น ในแอปหรือทางอีเมล) ก่อนที่การเปลี่ยนแปลงนั้นจะมีผล การใช้บริการต่อไปหลังจากการเปลี่ยนแปลงมีผลแล้ว ถือว่าคุณยอมรับข้อกำหนดฉบับปรับปรุง`}</P>
      <H2>14. กฎหมายที่ใช้บังคับและข้อพิพาท</H2>
      <P>{`ข้อกำหนดนี้อยู่ภายใต้บังคับของกฎหมายแห่งประเทศไทย ข้อพิพาทจะอยู่ภายใต้เขตอำนาจของศาลไทย ในกรณีที่กฎหมายไทยให้สิทธิ์ผู้บริโภคที่เป็นสิทธิ์บังคับ สิทธิ์เหล่านั้นจะไม่ได้รับผลกระทบ`}</P>
      <H2>15. ติดต่อ</H2>
      <P>{`คำถามเกี่ยวกับข้อกำหนดนี้: support@miomika.com ผู้ให้บริการ: Mikaro Studio กรุงเทพมหานคร ประเทศไทย`}</P>
    </article>
  );
}

export default async function TermsPage() {
  const store = await cookies();
  const lang = store.get("ui-language")?.value === "th" ? "th" : "en";
  return lang === "th" ? <TermsTH /> : <TermsEN />;
}
