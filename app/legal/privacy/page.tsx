import { cookies } from "next/headers";
import { H2, P, LI, Notice, DocTitle } from "../_components";

export const metadata = { title: "Privacy Policy — Miomika" };

function Table({ rows, head }: { rows: [string, string][]; head: [string, string] }) {
  return (
    <div className="my-3 overflow-hidden rounded-card border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface-2 text-left text-ink">
            <th className="border-b border-line p-3 font-semibold">{head[0]}</th>
            <th className="border-b border-line p-3 font-semibold">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="text-ink-muted">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={"p-3" + (i < rows.length - 1 ? " border-b border-line" : "")}>{r[0]}</td>
              <td className={"p-3" + (i < rows.length - 1 ? " border-b border-line" : "")}>{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrivacyEN() {
  return (
    <article>
      <DocTitle title="Privacy Policy" date="Last updated: 15 June 2026" />
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
      <Table
        head={["Purpose", "Legal basis under the PDPA"]}
        rows={[
          ["Create and run your account; provide lessons and conversations; process payments", "Performance of our contract with you"],
          ["Process your conversation content so Miomi can respond, teach, and remember relevant context", "Your explicit consent"],
          ["Keep the Service secure, prevent fraud and abuse, and fix problems", "Our legitimate interest"],
          ["Send you service-related messages (e.g. billing, important changes)", "Performance of our contract / legitimate interest"],
          ["Comply with legal obligations", "Legal obligation"],
        ]}
      />
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

function PrivacyTH() {
  return (
    <article>
      <DocTitle title="นโยบายความเป็นส่วนตัว" date="ปรับปรุงล่าสุด: 15 มิถุนายน 2569" />
      <Notice>{`หมายเหตุ / Notice — ฉบับภาษาไทยนี้จัดทำขึ้นเพื่อความสะดวกและความเข้าใจของผู้ใช้เท่านั้น หากมีข้อความขัดแย้งกัน ให้ยึดถือฉบับภาษาอังกฤษเป็นสำคัญ. This Thai version is provided for convenience and understanding only; in the event of any inconsistency, the English version shall prevail. ในช่วงเบต้า ฉบับภาษาอังกฤษเป็นฉบับที่มีผลผูกพันทางกฎหมาย / During beta, the English version is the binding version.`}</Notice>
      <P>{`นโยบายความเป็นส่วนตัวนี้อธิบายว่า Mikaro Studio ("Miomika", "เรา") ซึ่งตั้งอยู่ในกรุงเทพมหานคร ประเทศไทย เก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของคุณอย่างไรเมื่อคุณใช้ miomika.com และแอป Miomika ("บริการ") เราปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ("PDPA") โดยเพื่อวัตถุประสงค์ของ PDPA นั้น Mikaro Studio เป็นผู้ควบคุมข้อมูลส่วนบุคคล`}</P>
      <H2>1. ใช้กับใครบ้าง</H2>
      <P>{`บริการนี้มีไว้สำหรับผู้ที่มีอายุ 18 ปีขึ้นไป เราไม่เก็บรวบรวมข้อมูลส่วนบุคคลจากผู้ที่มีอายุต่ำกว่า 18 ปีโดยเจตนา หากเราพบว่าได้เก็บไว้ เราจะลบข้อมูลนั้นและปิดบัญชี`}</P>
      <H2>2. ข้อมูลที่เราเก็บรวบรวม</H2>
      <ul>
        <LI>{`ข้อมูลบัญชี: ชื่อและอีเมลของคุณตามที่ระบบล็อกอินภายนอกให้มา (Facebook, Instagram หรือ LINE) และตัวระบุบัญชีล็อกอินของคุณ`}</LI>
        <LI>{`ข้อมูลการสนทนา: สิ่งที่คุณพูด (เสียง) และพิมพ์ถึง Miomi รวมถึงคำตอบของ Miomi`}</LI>
        <LI>{`ข้อมูลการเรียนรู้: ความก้าวหน้าของคุณ และความทรงจำเกี่ยวกับข้อเท็จจริงและความชอบที่คุณบอก Miomi เพื่อให้สอนคุณได้อย่างต่อเนื่อง`}</LI>
        <LI>{`ข้อมูลการใช้งานและอุปกรณ์: วิธีที่คุณใช้บริการ ข้อมูลแอปและอุปกรณ์ และบันทึกทางเทคนิคพื้นฐาน`}</LI>
        <LI>{`ข้อมูลการชำระเงิน: บันทึกธุรกรรมและข้อมูลประกอบการชำระเงิน การชำระเงินดำเนินการโดย Stripe และ Omise เราไม่เก็บรวบรวมหรือจัดเก็บหมายเลขบัตรเต็มของคุณ`}</LI>
      </ul>
      <H2>3. ข้อมูลส่วนบุคคลที่อ่อนไหว</H2>
      <P>{`เนื่องจาก Miomi เป็นการสนทนา คุณอาจเลือกที่จะแบ่งปันข้อมูลส่วนตัวหรือเรื่องทางอารมณ์ เราถือว่าเนื้อหาการสนทนาของคุณเป็นข้อมูล`}<strong>ที่อ่อนไหว</strong>{` และจัดการด้วยความระมัดระวังเป็นพิเศษ เราจะขอ`}<strong>ความยินยอมโดยชัดแจ้ง</strong>{`จากคุณในการประมวลผลเนื้อหานี้เมื่อคุณเริ่มใช้บริการ และคุณสามารถถอนความยินยอมได้ตลอดเวลา (ดูข้อ 9) โปรดหลีกเลี่ยงการแบ่งปันข้อมูลที่อ่อนไหวเกินกว่าที่จำเป็น`}</P>
      <H2>4. เหตุใดเราจึงใช้ข้อมูลของคุณ และฐานทางกฎหมายของเรา</H2>
      <Table
        head={["วัตถุประสงค์", "ฐานทางกฎหมายภายใต้ PDPA"]}
        rows={[
          ["สร้างและดำเนินการบัญชีของคุณ ให้บทเรียนและการสนทนา ดำเนินการชำระเงิน", "ความจำเป็นเพื่อปฏิบัติตามสัญญากับคุณ"],
          ["ประมวลผลเนื้อหาการสนทนาของคุณเพื่อให้ Miomi ตอบกลับ สอน และจดจำบริบทที่เกี่ยวข้อง", "ความยินยอมโดยชัดแจ้งของคุณ"],
          ["รักษาความปลอดภัยของบริการ ป้องกันการฉ้อโกงและการใช้งานในทางที่ผิด และแก้ไขปัญหา", "ประโยชน์โดยชอบด้วยกฎหมายของเรา"],
          ["ส่งข้อความที่เกี่ยวกับบริการให้คุณ (เช่น การเรียกเก็บเงิน การเปลี่ยนแปลงสำคัญ)", "การปฏิบัติตามสัญญา / ประโยชน์โดยชอบด้วยกฎหมาย"],
          ["ปฏิบัติตามข้อผูกพันทางกฎหมาย", "การปฏิบัติตามกฎหมาย"],
        ]}
      />
      <H2>5. เราไม่นำการสนทนาของคุณไปฝึก AI</H2>
      <P>{`เรา`}<strong>ไม่</strong>{`นำเนื้อหาการสนทนา ข้อมูลการเรียนรู้ หรือข้อมูลส่วนบุคคลอื่น ๆ ของคุณไปฝึกหรือปรับปรุงโมเดล AI หรือการเรียนรู้ของเครื่อง เราไม่ขายข้อมูลส่วนบุคคลของคุณ และไม่นำไปใช้เพื่อการโฆษณาของบุคคลภายนอก`}</P>
      <H2>6. เราแบ่งปันข้อมูลกับใครบ้าง</H2>
      <P>{`เราแบ่งปันข้อมูลเฉพาะกับผู้ให้บริการที่ช่วยเราดำเนินการบริการ ภายใต้สัญญาที่กำหนดให้พวกเขาต้องปกป้องข้อมูลนั้น:`}</P>
      <ul>
        <LI>{`การชำระเงิน: Stripe และ Omise`}</LI>
        <LI>{`โฮสติงและโครงสร้างพื้นฐาน: ผู้ให้บริการคลาวด์โฮสติง`}</LI>
        <LI>{`บริการเสียงและภาษา AI: ผู้ให้บริการที่ขับเคลื่อนเสียงพูดและคำตอบของ Miomi ใช้เพียงเพื่อส่งมอบการสนทนาของคุณแบบเรียลไทม์เท่านั้น`}</LI>
      </ul>
      <P>{`เราอาจเปิดเผยข้อมูลด้วยหากกฎหมายกำหนด เพื่อบังคับใช้ข้อกำหนดของเรา หรือเพื่อปกป้องสิทธิ์และความปลอดภัย`}</P>
      <H2>7. การโอนข้อมูลระหว่างประเทศ</H2>
      <P>{`ผู้ให้บริการบางรายของเราตั้งอยู่นอกประเทศไทย ข้อมูลของคุณจึงอาจถูกประมวลผลในต่างประเทศ เมื่อเกิดกรณีเช่นนี้ เราดำเนินการตามขั้นตอนที่มุ่งให้ข้อมูลของคุณได้รับมาตรฐานการคุ้มครองที่เทียบเคียงกัน ผ่านข้อผูกพันของผู้ให้บริการและมาตรการตามสัญญา และเราอาศัยความยินยอมของคุณในกรณีที่จำเป็น`}</P>
      <H2>8. เราเก็บข้อมูลไว้นานเท่าใด</H2>
      <P>{`เราเก็บข้อมูลส่วนบุคคลของคุณไว้ตราบเท่าที่บัญชีของคุณยังใช้งานอยู่ เมื่อคุณลบบัญชี (หรือถอนความยินยอมที่จำเป็นต่อการให้บริการ) เราจะลบข้อมูลการสนทนาและการเรียนรู้ของคุณภายใน 30 วัน ยกเว้นในกรณีที่เราต้องเก็บบันทึกบางส่วนไว้นานกว่านั้นเพื่อปฏิบัติตามข้อผูกพันทางกฎหมาย ภาษี หรือการป้องกันการฉ้อโกง หลังจากนั้นบันทึกเหล่านั้นจะถูกลบ`}</P>
      <H2>9. สิทธิ์ของคุณภายใต้ PDPA</H2>
      <P>{`คุณมีสิทธิ์ในการ: เข้าถึงสำเนาข้อมูลของคุณ แก้ไขให้ถูกต้อง ลบ ถอนความยินยอม คัดค้านหรือจำกัดการประมวลผลบางอย่าง ขอให้โอนย้ายข้อมูลที่คุณให้ไว้ และยื่นเรื่องร้องเรียน หากต้องการใช้สิทธิ์ใด ๆ โปรดไปที่ การตั้งค่า → ข้อมูลของคุณ ในแอป หรืออีเมลถึง privacy@miomika.com เราจะตอบกลับภายในกรอบเวลาที่ PDPA กำหนด การถอนความยินยอมไม่กระทบต่อการประมวลผลที่ได้ทำไปก่อนการถอน แต่อาจทำให้เราไม่สามารถให้บริการบางส่วนได้อีกต่อไป`}</P>
      <P>{`หากคุณเชื่อว่าเราจัดการข้อมูลของคุณไม่ถูกต้อง คุณสามารถร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส. / PDPC) ในประเทศไทย`}</P>
      <H2>10. ความปลอดภัย</H2>
      <P>{`เราใช้มาตรการทางเทคนิคและองค์กรที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ รวมถึงการควบคุมการเข้าถึงและการเข้ารหัสระหว่างการส่งข้อมูล ไม่มีระบบใดที่ปลอดภัยอย่างสมบูรณ์ แต่เรามุ่งมั่นปกป้องข้อมูลของคุณและจำกัดผู้ที่สามารถเข้าถึงได้`}</P>
      <H2>11. การละเมิดข้อมูล</H2>
      <P>{`หากเกิดการละเมิดข้อมูลที่มีแนวโน้มจะกระทบต่อสิทธิ์ของคุณ เราจะแจ้งต่อ PDPC และแจ้งคุณในกรณีที่กำหนด ตามที่ PDPA ระบุไว้`}</P>
      <H2>12. การเปลี่ยนแปลงนโยบายนี้</H2>
      <P>{`เราอาจปรับปรุงนโยบายนี้เมื่อบริการพัฒนาไป หากเรามีการเปลี่ยนแปลงที่เป็นสาระสำคัญ เราจะแจ้งให้คุณทราบก่อนที่จะมีผล`}</P>
      <H2>13. ติดต่อ</H2>
      <P>{`คำถามหรือคำขอเกี่ยวกับความเป็นส่วนตัว: privacy@miomika.com ผู้ควบคุมข้อมูล: Mikaro Studio กรุงเทพมหานคร ประเทศไทย`}</P>
    </article>
  );
}

export default async function PrivacyPage() {
  const store = await cookies();
  const lang = store.get("ui-language")?.value === "th" ? "th" : "en";
  return lang === "th" ? <PrivacyTH /> : <PrivacyEN />;
}
