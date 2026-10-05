import React from 'react';
import { ArrowLeft, ArrowUpRight, LockKeyhole, Scale, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type Section = { title: string; body: string };

const privacySections: Section[] = [
  { title: 'Overview & Ownership', body: 'Applicord helps you track and organize your job search at https://applicord.vercel.app. We collect only what is strictly necessary to provide the workspace, and we never sell your personal information.' },
  { title: 'Information You Share', body: 'This includes account details (name, email, password hash, timezone), application records, recruiter contacts, documents you upload (resumes, cover letters), and user preferences.' },
  { title: 'Google User Data (Gmail Integration)', body: 'When you link your Google account, Applicord requests read-only access (https://www.googleapis.com/auth/gmail.readonly) solely to detect job applications, interview invitations, assessments, and status updates. We access email metadata and relevant snippets. We do not compose, send, alter, or delete emails.' },
  { title: 'Google Limited Use Policy Compliance', body: "Applicord's use and transfer to any other app of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements. We do not use Google user data for advertising, do not sell data to third parties or brokers, and do not use user emails to train generalized AI or ML models." },
  { title: 'Human Access & Security', body: 'No human reads your emails unless you give explicit written permission for technical support, for security investigations, or as required by law. All tokens are encrypted at rest with AES-256-GCM, and communications use encrypted TLS.' },
  { title: 'Retention & Account Deletion', body: 'You can disconnect Gmail at any time from Settings to immediately erase stored OAuth tokens, or revoke access via Google Security Settings. You can request permanent account and data deletion anytime by emailing ssworkstech@gmail.com.' },
];

const termsSections: Section[] = [
  { title: 'Using Applicord', body: 'You may use Applicord only in compliance with applicable law and these terms. Keep your account credentials secure and provide accurate information when creating an account.' },
  { title: 'Your content', body: 'You retain ownership of the application information, notes, documents, and other content you add. You give us permission to process that content solely to provide and improve the service for you.' },
  { title: 'Connected services', body: 'Connecting a third-party service such as Gmail is optional and subject to that service’s own terms. You can disconnect an integration at any time from your Applicord settings.' },
  { title: 'Respectful use', body: 'Do not misuse the service, attempt unauthorized access, interfere with other users, upload unlawful material, or use Applicord to send unsolicited or deceptive communications.' },
  { title: 'Service availability', body: 'We aim to keep Applicord available and reliable, but features may change and uninterrupted access cannot be guaranteed. We may maintain, modify, or retire features to improve the product.' },
  { title: 'Contact and updates', body: 'We may revise these terms when needed. Continuing to use Applicord after an update means you accept the revised terms. For questions, contact the Applicord team through the support channel provided in the app.' },
];

const PublicShell: React.FC<{ kicker: string; title: React.ReactNode; intro: string; icon: React.ReactNode; children: React.ReactNode }> = ({ kicker, title, intro, icon, children }) => (
  <main className="public-info-page">
    <div className="public-info-grain" />
    <header className="public-info-nav">
      <Link to="/landing" className="public-info-brand"><Sparkles size={15} /> APPLICORD</Link>
      <Link to="/landing" className="public-info-back"><ArrowLeft size={15} /> Back to home</Link>
    </header>
    <section className="public-info-hero">
      <div className="public-info-orb public-info-orb-one" /><div className="public-info-orb public-info-orb-two" />
      <div className="public-info-symbol">{icon}</div><p>{kicker}</p><h1>{title}</h1><div className="public-info-intro">{intro}</div>
    </section>
    {children}
    <footer className="public-info-footer"><span>APPLICORD © {new Date().getFullYear()}</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/landing">Home</Link></div></footer>
  </main>
);

const LegalPage: React.FC<{ kind: 'privacy' | 'terms' }> = ({ kind }) => {
  const privacy = kind === 'privacy';
  const sections = privacy ? privacySections : termsSections;
  return <PublicShell kicker={privacy ? 'PRIVACY, IN PLAIN LANGUAGE' : 'THE GROUND RULES'} title={privacy ? <>Your search.<br /><i>Your data.</i></> : <>Clear terms.<br /><i>Better focus.</i></>} intro={privacy ? 'A straightforward overview of how Applicord handles the information that helps keep your career search in rhythm.' : 'The simple agreement behind a calmer, more organized way to manage your applications.'} icon={privacy ? <LockKeyhole /> : <Scale />}>
    <section className="legal-content"><div className="legal-meta"><span>Effective September 29, 2026</span><span>Last updated September 29, 2026</span></div><div className="legal-grid">{sections.map((section, index) => <article key={section.title} className="legal-section"><span>0{index + 1}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></article>)}</div></section>
  </PublicShell>;
};

export const PrivacyPage: React.FC = () => <LegalPage kind="privacy" />;
export const TermsPage: React.FC = () => <LegalPage kind="terms" />;
export const NotFoundPage: React.FC = () => <PublicShell kicker="404 / SIGNAL LOST" title={<>This path went<br /><i>off-script.</i></>} intro="The page you were looking for is no longer here—or it may never have existed. Let’s get your search back in sync." icon={<span>404</span>}><section className="not-found-actions"><Link to="/landing" className="not-found-primary">RETURN HOME <ArrowUpRight size={17} /></Link><Link to="/login" className="not-found-secondary">GO TO MY WORKSPACE</Link></section></PublicShell>;
