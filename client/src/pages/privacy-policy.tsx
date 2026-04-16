import { useState, useEffect, useRef, FC, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TocItem {
  id: string;
  label: string;
}

interface QuickFact {
  label: string;
  value: string;
  positive: boolean;
}

interface InShortProps {
  children: ReactNode;
}

interface SectionHeaderProps {
  num: number;
  title: string;
}

interface CleanListProps {
  items: string[];
}

interface SectionPProps {
  children: ReactNode;
  className?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const tocItems: TocItem[] = [
  { id: "s1", label: "What Information We Collect" },
  { id: "s2", label: "How We Process It" },
  { id: "s3", label: "When We Share It" },
  { id: "s4", label: "Social Logins" },
  { id: "s5", label: "How Long We Keep It" },
  { id: "s6", label: "How We Keep It Safe" },
  { id: "s7", label: "Your Privacy Rights" },
  { id: "s8", label: "Do-Not-Track" },
  { id: "s9", label: "Policy Updates" },
  { id: "s10", label: "Contact Us" },
  { id: "s11", label: "Review or Delete Your Data" },
];

const quickFacts: QuickFact[] = [
  { label: "Sensitive Data", value: "Not collected", positive: true },
  { label: "Third-Party Data", value: "Not collected", positive: true },
  { label: "Data Retention", value: "Duration of your account", positive: false },
  { label: "Your Rights", value: "Review, update, or delete anytime", positive: false },
];

const processingPurposes: [string, string][] = [
  ["Account creation and authentication", "So you can create and log in to your account, and keep it in working order."],
  ["Service delivery", "To provide, improve, and administer the Services you use."],
  ["Security and fraud prevention", "To monitor for and prevent fraudulent or harmful activity."],
  ["Legal compliance", "To comply with applicable laws and regulations."],
  ["With your consent", "For any other purposes you explicitly agree to."],
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const InShort: FC<InShortProps> = ({ children }) => (
  <div className="bg-[#f7f8fb] rounded-md px-4 py-3 mb-[18px] text-[13.5px] text-[#5a6272] italic">
    <span className="font-semibold not-italic text-[#2255cc]">In short: </span>
    {children}
  </div>
);

const SectionHeader: FC<SectionHeaderProps> = ({ num, title }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#e2e6ef]">
    <span className="flex items-center justify-center w-7 h-7 bg-[#e8edf8] rounded-[6px] text-xs font-bold text-[#2255cc] shrink-0">
      {num}
    </span>
    <h2
      className="text-[22px] text-[#0f1117] tracking-tight"
    >
      {title}
    </h2>
  </div>
);

const CleanList: FC<CleanListProps> = ({ items }) => (
  <ul className="my-3 mb-4 p-0 list-none">
    {items.map((item, i) => (
      <li
        key={i}
        className={`flex items-baseline gap-2.5 text-[14px] text-[#5a6272] py-[7px] leading-relaxed ${
          i < items.length - 1 ? "border-b border-[#e2e6ef]" : ""
        }`}
      >
        <span className="text-[#2255cc] font-semibold shrink-0">–</span>
        <span dangerouslySetInnerHTML={{ __html: item }} />
      </li>
    ))}
  </ul>
);

const SectionP: FC<SectionPProps> = ({ children, className = "" }) => (
  <p className={`text-[14.5px] text-[#5a6272] leading-[1.8] mb-[14px] last:mb-0 ${className}`}>
    {children}
  </p>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const GrooviaPrivacyPolicy: FC = () => {
  const [activeSection, setActiveSection] = useState<string>("s1");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="min-h-screen bg-[#f7f8fb] text-[#0f1117]"
    >

      {/* Header */}
      <header className="bg-white border-b border-[#e2e6ef] py-5 sticky top-0 z-50">
        <div className="max-w-[860px] mx-auto px-8 flex items-center gap-4">
          <span
            className="text-[22px] text-black tracking-[-0.3px]"
          >
            Groovia
          </span>
          <span className="text-xs font-medium uppercase tracking-[1.2px] text-[#5a6272] border-l border-[#e2e6ef] pl-4">
            Privacy Policy
          </span>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-[860px] mx-auto px-8 py-12 pb-20">

        {/* Main Content */}
        <main>
          <h1
            className="text-[40px] leading-[1.1] text-[#0f1117] tracking-[-0.5px] mb-2.5 max-[720px]:text-[30px]"
          >
            Privacy Policy
          </h1>
          <p className="text-[13px] text-[#5a6272] mb-8">
            Last updated: April 16, 2026 &nbsp;·&nbsp; Groovia
          </p>

          {/* Summary Box */}
          <div className="bg-[#eef2fc] border border-[#c8d6f5] border-l-[3px] border-l-[#2255cc] rounded-lg px-6 py-5 mb-10">
            <p className="text-[14px] text-[#0f1117] leading-[1.7] mb-4">
              This Privacy Notice describes how{" "}
              <strong className="font-semibold">Groovia</strong> collects, stores, uses, and
              shares your personal information when you use our services — including our website
              at{" "}
              <a href="https://grooviamusic.com" className="text-[#2255cc] no-underline hover:underline">
                grooviamusic.com
              </a>{" "}
              or when you engage with us through marketing or events.
            </p>
            <p className="text-[14px] text-[#0f1117] leading-[1.7] mb-0">
              Questions? Contact us at{" "}
              <a href="mailto:kaushangsurya29@gmail.com" className="text-[#2255cc] no-underline hover:underline">
                kaushangsurya29@gmail.com
              </a>
              . If you do not agree with our policies, please do not use our Services.
            </p>
          </div>

          {/* Quick Facts */}
          <div className="grid grid-cols-2 gap-3 mb-12 max-[720px]:grid-cols-1">
            {quickFacts.map(({ label, value, positive }) => (
              <div key={label} className="bg-white border border-[#e2e6ef] rounded-lg px-[18px] py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[#5a6272] mb-1">
                  {label}
                </div>
                <div
                  className={`text-[13.5px] font-medium leading-[1.5] ${
                    positive ? "text-[#1a7a3a]" : "text-[#0f1117]"
                  }`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Section 1 */}
          <section id="s1" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={1} title="What Information Do We Collect?" />
            <InShort>We collect personal information that you voluntarily provide to us.</InShort>
            <SectionP>
              We collect personal information when you register on the Services, express interest
              in our products, participate in activities on the Services, or contact us. The
              information we collect may include:
            </SectionP>
            <CleanList items={["Names", "Email addresses", "Usernames", "Profile pictures (if provided by your login provider)"]} />
            <SectionP>
              <strong className="text-[#0f1117] font-semibold">Sensitive information:</strong>{" "}
              We do not process sensitive information of any kind.
            </SectionP>
            <SectionP>
              <strong className="text-[#0f1117] font-semibold">Social media login data:</strong>{" "}
              If you choose to register using a social media account (Google, Facebook, X, or similar),
              we will collect certain profile information from that provider. 
              When you sign in using Google OAuth, we collect your name, email, and profile picture.             
            </SectionP>
            <SectionP>See Section 4 for full details.</SectionP>
            <SectionP>
              <strong className="text-[#0f1117] font-semibold">Google API:</strong> Our use of
              information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[#2255cc] no-underline hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </SectionP>
            <SectionP>
              All personal information you provide must be true, complete, and accurate. Please
              notify us of any changes.
            </SectionP>
          </section>

          {/* Section 2 */}
          <section id="s2" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={2} title="How Do We Process Your Information?" />
            <InShort>
              We process your information to provide and improve our Services, communicate with
              you, and stay compliant with the law.
            </InShort>
            <SectionP>We process your personal information for the following reasons:</SectionP>
            <table className="w-full border-collapse my-4 text-[13.5px]">
              <thead>
                <tr>
                  <th className="bg-[#f7f8fb] text-left px-[14px] py-[10px] font-semibold text-xs uppercase tracking-[0.8px] text-[#5a6272] border-b-2 border-[#e2e6ef]">
                    Purpose
                  </th>
                  <th className="bg-[#f7f8fb] text-left px-[14px] py-[10px] font-semibold text-xs uppercase tracking-[0.8px] text-[#5a6272] border-b-2 border-[#e2e6ef]">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {processingPurposes.map(([purpose, detail], i) => (
                  <tr key={purpose}>
                    <td
                      className={`px-[14px] py-[10px] font-medium text-[#0f1117] leading-[1.6] ${
                        i < processingPurposes.length - 1 ? "border-b border-[#e2e6ef]" : ""
                      }`}
                    >
                      {purpose}
                    </td>
                    <td
                      className={`px-[14px] py-[10px] text-[#5a6272] leading-[1.6] ${
                        i < processingPurposes.length - 1 ? "border-b border-[#e2e6ef]" : ""
                      }`}
                    >
                      {detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Section 3 */}
          <section id="s3" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={3} title="When and With Whom Do We Share Your Information?" />
            <InShort>We may share information in specific situations with specific third parties.</InShort>
            <SectionP>We do not sell, rent, or trade your personal information.</SectionP>
            <SectionP>We may need to share your personal information in the following situations:</SectionP>
            <CleanList
              items={[
                "<strong class='text-[#0f1117] font-semibold'>Business transfers:</strong> We may share or transfer your information in connection with any merger, sale of company assets, financing, or acquisition of all or part of our business to another company.",
              ]}
            />
          </section>

          {/* Section 4 */}
          <section id="s4" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={4} title="How Do We Handle Your Social Logins?" />
            <InShort>
              If you register or log in using a social media account, we may receive certain
              information about you from that provider.
            </InShort>
            <SectionP>
              Our Services allow you to register and log in using third-party social media
              accounts (such as Facebook or X). When you do, we receive certain profile
              information from your social media provider. This may include your name, email
              address, friends list, and profile picture, as well as other information you have
              made public on that platform.
            </SectionP>
            <SectionP>
              We use this information only for the purposes described in this Privacy Notice. We
              do not control how your social media provider uses your information. We recommend
              reviewing their privacy policies to understand their data practices and your
              privacy settings.
            </SectionP>
          </section>

          {/* Section 5 */}
          <section id="s5" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={5} title="How Long Do We Keep Your Information?" />
            <InShort>
              We keep your information for as long as necessary to fulfill the purposes outlined
              in this notice.
            </InShort>
            <SectionP>
              We retain your personal information only for as long as necessary for the purposes
              set out in this Privacy Notice, unless a longer retention period is required or
              permitted by law (such as tax, accounting, or other legal requirements).
            </SectionP>
            <SectionP>
              No purpose in this notice will require us to keep your personal information for
              longer than the period during which you have an active account with us.
            </SectionP>
            <SectionP>
              When we have no ongoing legitimate business need to process your personal
              information, we will delete or anonymize it. If deletion is not immediately
              possible (for example, because data is stored in backup archives), we will
              securely isolate it from further processing until deletion is possible.
            </SectionP>
          </section>

          {/* Section 6 */}
          <section id="s6" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={6} title="How Do We Keep Your Information Safe?" />
            <InShort>We use organizational and technical security measures to protect your data.</InShort>
            <SectionP>
              We have implemented appropriate technical and organizational security measures
              designed to protect the security of your personal information. However, no
              electronic transmission over the internet or information storage technology can be
              guaranteed to be 100% secure.
            </SectionP>
            <SectionP>
              We cannot promise or guarantee that hackers, cybercriminals, or other unauthorized
              third parties will not be able to defeat our security measures. Transmission of
              personal information to and from our Services is at your own risk. You should only
              access the Services within a secure environment.
            </SectionP>
          </section>

          {/* Section 7 */}
          <section id="s7" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={7} title="What Are Your Privacy Rights?" />
            <InShort>You may review, change, or terminate your account at any time.</InShort>
            <SectionP>
              Depending on where you are located, applicable privacy law may give you certain
              rights regarding your personal information.
            </SectionP>
            <SectionP>
              <strong className="text-[#0f1117] font-semibold">Withdrawing consent:</strong> If
              we are relying on your consent to process your personal information, you have the
              right to withdraw that consent at any time by contacting us using the details in
              Section 10. Note that withdrawing consent does not affect the lawfulness of any
              processing carried out before the withdrawal.
            </SectionP>
            <SectionP>
              <strong className="text-[#0f1117] font-semibold">Managing your account:</strong>{" "}
              You can review or change your account information at any time by logging in to
              your account settings. To terminate your account, contact us or use your account
              settings.
            </SectionP>
            <SectionP>
              Upon a request to terminate your account, we will deactivate or delete your
              account and information from our active databases. We may retain some information
              in our files to prevent fraud, troubleshoot problems, assist with investigations,
              or comply with legal requirements.
            </SectionP>
            <SectionP>
              For questions about your privacy rights, email us at{" "}
              <a
                href="mailto:kaushangsurya29@gmail.com"
                className="text-[#2255cc] no-underline hover:underline"
              >
                kaushangsurya29@gmail.com
              </a>
              .
            </SectionP>
          </section>

          {/* Section 8 */}
          <section id="s8" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={8} title="Controls for Do-Not-Track Features" />
            <SectionP>
              Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT")
              feature or setting you can activate to signal your privacy preference not to have
              data about your online browsing activities monitored and collected.
            </SectionP>
            <SectionP>
              At this stage, no uniform technology standard for recognizing and implementing DNT
              signals has been finalized. As such, we do not currently respond to DNT browser
              signals or any other mechanism that automatically communicates your choice not to
              be tracked online. If a standard for online tracking is adopted that we must follow
              in the future, we will inform you in a revised version of this Privacy Notice.
            </SectionP>
          </section>

          {/* Section 9 */}
          <section id="s9" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={9} title="Do We Make Updates to This Notice?" />
            <InShort>
              Yes, we will update this notice as necessary to stay compliant with relevant laws.
            </InShort>
            <SectionP>
              We may update this Privacy Notice from time to time. The updated version will be
              indicated by an updated "Revised" date at the top of this document. If we make
              material changes, we may notify you by prominently posting a notice or by sending
              you a direct notification. We encourage you to review this Privacy Notice
              regularly.
            </SectionP>
          </section>

          {/* Section 10 */}
          <section id="s10" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={10} title="How Can You Contact Us?" />
            <SectionP>
              If you have questions or comments about this notice, you can reach us by email or
              post:
            </SectionP>
            <div className="bg-white border border-[#e2e6ef] rounded-[10px] px-7 py-6 mt-4">
              <div className="font-semibold text-[15px] text-[#0f1117] mb-1.5">Groovia</div>
              <div className="text-[13.5px] text-[#5a6272] mb-1">India</div>
              <div className="text-[13.5px] text-[#5a6272]">
                <a
                  href="mailto:kaushangsurya29@gmail.com"
                  className="text-[#2255cc] no-underline hover:underline"
                >
                  kaushangsurya29@gmail.com
                </a>
              </div>
            </div>
          </section>

          {/* Section 11 */}
          <section id="s11" className="mb-[52px] scroll-mt-[90px]">
            <SectionHeader num={11} title="How Can You Review, Update, or Delete Your Data?" />
            <SectionP>
              Based on the applicable laws of your country, you may have the right to request
              access to the personal information we collect from you, review details about how
              we have processed it, correct any inaccuracies, or delete your personal
              information entirely. You may also have the right to withdraw your consent to our
              processing of your personal information.
            </SectionP>
            <SectionP>
              These rights may be limited in some circumstances by applicable law. To exercise
              any of these rights, please visit:{" "}
              <a
                href="https://grooviamusic.com/profile"
                target="_blank"
                rel="noreferrer"
                className="text-[#2255cc] no-underline hover:underline"
              >
                grooviamusic.com/profile
              </a>
            </SectionP>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="max-w-[860px] mx-auto px-8 pb-12 pt-6 border-t border-[#e2e6ef] text-[12.5px] text-[#5a6272]">
        This Privacy Policy was last updated April 16, 2026 and applies to Groovia's website
        and related services.
      </footer>
    </div>
  );
};

export default GrooviaPrivacyPolicy;
