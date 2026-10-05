import React from 'react';
import { ArrowLeft, ArrowUpRight, LockKeyhole, Scale, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type Section = { title: string; body: string };

const privacySections: Section[] = [
  { title: 'The short version', body: 'Applicord helps you organize your job search. We collect only what is needed to provide that workspace, and we do not sell your personal information.' },
  { title: 'Information you share', body: 'This includes account details, application records, recruiter contact details, documents you choose to upload, and preferences you save.' },
  { title: 'Connected inboxes', body: 'If you connect Gmail, Applicord uses the permissions you approve to identify relevant application signals. Your connection is read-only. We do not send messages from your inbox or alter its contents.' },
  { title: 'How we use information', body: 'We use your information to operate your account, organize your applications and reminders, secure the service, respond to support requests, and improve Applicord.' },
  { title: 'Your choices', body: 'You can update your profile, remove connected accounts, export selected data, or ask us to delete your account. Some information may be retained where required for security, legal, or operational reasons.' },
  { title: 'Security and changes', body: 'We use reasonable safeguards, but no online service is completely risk-free. We may update this policy as Applicord evolves; the effective date will reflect the latest version.' },
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
