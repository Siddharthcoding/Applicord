import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Circle, Command, Mail, MoveRight, Sparkles } from 'lucide-react';

const stories = [
  { eyebrow: '01 / INBOX INTELLIGENCE', title: 'Signals, not noise.', body: 'Connect Gmail and let Applicord surface application confirmations, interviews, assessments, and offers for your review.', type: 'inbox' },
  { eyebrow: '02 / YOUR PIPELINE', title: 'Every move, visible.', body: 'Track roles from saved to offer in one clear timeline—then see exactly what deserves your attention next.', type: 'focus' },
  { eyebrow: '03 / FOLLOW-THROUGH', title: 'Never lose the thread.', body: 'Set thoughtful reminders, keep recruiter context close, and follow up before a promising opportunity goes cold.', type: 'momentum' },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const railRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 35 });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onMove = (event: MouseEvent) => setPointer({ x: event.clientX / window.innerWidth * 100, y: event.clientY / window.innerHeight * 100 });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const slide = (direction: number) => railRef.current?.scrollBy({ left: direction * 440, behavior: 'smooth' });
  const cta = () => navigate(user ? '/dashboard' : '/register');

  return (
    <main className="kinetic-landing" style={{ '--pointer-x': `${pointer.x}%`, '--pointer-y': `${pointer.y}%` } as React.CSSProperties}>
      <div className="kinetic-grain" />
      <header className="kinetic-nav">
        <Link to="/" className="brand-mark"><span>✦</span> APPLICORD</Link>
        <div className="kinetic-nav-links"><a href="#experience">Experience</a><a href="#manifesto">Manifesto</a></div>
        <button onClick={cta} className="nav-cta">{user ? 'Enter workspace' : 'Begin your story'} <ArrowUpRight size={15} /></button>
      </header>

      <section className="kinetic-hero">
        <div className="hero-star hero-star-one">✦</div><div className="hero-star hero-star-two">✳</div>
        <p className="hero-kicker"><span className="live-dot" /> THE CAREER OPERATING SYSTEM FOR PEOPLE GOING PLACES</p>
        <h1>
          <span className="hero-line">Make your</span>
          <span className="hero-line hero-line-indent">next move</span>
          <span className="hero-line hero-line-accent">matter.</span>
        </h1>
        <div className="hero-bottom"><p>One calm workspace for applications, email signals, recruiter context, follow-ups, and the decisions that move your career forward.</p><button onClick={cta} className="orbit-cta"><span>START<br />MOVING</span><ArrowDownRight size={25} /></button></div>
        <div className="hero-orbit"><span className="orbit-ring orbit-ring-a" /><span className="orbit-ring orbit-ring-b" /><div className="orbit-note">A CLEARER WAY<br />FORWARD <MoveRight size={14} /></div></div>
        <div className="hero-scroll">SCROLL TO EXPLORE <span /></div>
      </section>

      <section id="manifesto" className="manifesto-section">
        <p className="section-index">( 01 — THE FEELING )</p>
        <div className="manifesto-copy"><p>Job searching can feel like <em>shouting</em> into the void.</p><p>Applicord turns it into a conversation—with your future self.</p></div>
        <div className="manifesto-caption"><span>ALL THE THREADS</span><span>ONE BEAUTIFUL RHYTHM</span></div>
      </section>

      <section id="experience" className="experience-section">
        <div className="experience-heading"><div><p className="section-index">( 02 — THE EXPERIENCE )</p><h2>Meet your<br /><i>momentum.</i></h2></div><p className="experience-intro">A living system that moves at the speed of your ambition. Swipe through what it feels like.</p></div>
        <div className="rail-controls"><button onClick={() => slide(-1)} aria-label="Previous story"><ChevronLeft /></button><span>0{active + 1} / 0{stories.length}</span><button onClick={() => slide(1)} aria-label="Next story"><ChevronRight /></button></div>
        <div ref={railRef} className="story-rail" onScroll={(e) => setActive(Math.min(stories.length - 1, Math.round(e.currentTarget.scrollLeft / 440)))}>
          {stories.map((story, index) => <article className={`story-panel story-${story.type}`} key={story.title}><p className="story-eyebrow">{story.eyebrow}</p><div className="story-visual"><StoryVisual type={story.type} /></div><div className="story-text"><h3>{story.title}</h3><p>{story.body}</p><span className="story-number">0{index + 1}</span></div></article>)}
        </div>
      </section>

      <section className="signal-section"><div className="signal-poster"><p>YOU DON'T NEED<br />TO HUSTLE <i>HARDER.</i></p><span>YOU NEED A BETTER SIGNAL.</span><div className="poster-stamp">APPLICORD<br />EST. NOW</div></div><div className="signal-detail"><p className="section-index">( 03 — IN YOUR CORNER )</p><h2>Beautifully<br />on top of it.</h2><p className="signal-body">Applications, interviews, people, dates, and the tiny details that shape the big picture—held together in one quiet, powerful space.</p><div className="signal-list"><span><Check size={15} /> Your inbox, understood</span><span><Check size={15} /> Your time, protected</span><span><Check size={15} /> Your momentum, visible</span></div></div></section>

      <section className="ticker" aria-label="Applicord values"><div className="ticker-track"><span>NO MORE SPREADSHEETS <b>✦</b> MORE YES MOMENTS <b>✦</b> NO MORE SPREADSHEETS <b>✦</b> MORE YES MOMENTS <b>✦</b></span><span aria-hidden="true">NO MORE SPREADSHEETS <b>✦</b> MORE YES MOMENTS <b>✦</b></span></div></section>

      <section className="finale"><div className="finale-sun" /><p className="section-index">( 04 — YOUR TURN )</p><h2>Your next chapter<br /><i>is calling.</i></h2><p>Bring order to the pursuit. Make space for the possibility.</p><button onClick={cta} className="finale-button">{user ? 'GO TO MY WORKSPACE' : 'CREATE MY APPLICORD'} <ArrowRight size={17} /></button><span className="finale-note"><Mail size={13} /> Read-only inbox connection. Always in your control.</span></section>

      <footer className="kinetic-footer"><Link to="/" className="brand-mark"><span>✦</span> APPLICORD</Link><span>MOVE WITH INTENTION © {new Date().getFullYear()}</span><div><Link to="/login">LOG IN</Link><Link to="/register">GET STARTED</Link></div></footer>
    </main>
  );
};

const StoryVisual: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'inbox') return <div className="visual-mail"><div className="mail-header"><span><Mail size={15} /> inbox / today</span><Circle size={10} fill="currentColor" /></div><div className="mail-item hot"><b>Figma Recruiting</b><span>We'd love to meet you</span><i>NOW</i></div><div className="mail-item"><b>Newsletter</b><span>Things worth reading</span></div><div className="mail-item"><b>Calendar</b><span>Your week ahead</span></div><div className="mail-match"><Sparkles size={15} /> MATCHED TO<br /><strong>PRODUCT DESIGNER</strong></div></div>;
  if (type === 'focus') return <div className="visual-focus"><p>THIS WEEK</p><strong>03</strong><span>conversations<br />worth having</span><div className="focus-bars"><i /><i /><i /><i /></div><div className="focus-label">YOUR ENERGY IS GOING<br />IN THE RIGHT DIRECTION ↗</div></div>;
  return <div className="visual-momentum"><div className="momentum-path"><i /><i /><i /><i /></div><div className="momentum-card"><span>FRIDAY · 10:00</span><b>Follow up with<br />the team at Linear</b><em>ONE SMALL MOVE →</em></div><div className="momentum-dot" /></div>;
};
