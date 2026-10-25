import { MotionConfig } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import Background from './components/Background'
import ScrollProgress from './components/ScrollProgress'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Achievements from './components/Achievements'
import Contact from './components/Contact'
import Footer from './components/Footer'
import { useProfile } from './hooks/useProfile'

function Loader() {
  return (
    <div className="state-screen" role="status" aria-live="polite">
      <div className="loader-orb" aria-hidden="true" />
      <p>Warming up…</p>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div className="state-screen" role="alert">
      <p>The page content didn't load. Give it another go?</p>
      <button className="btn btn-ghost" onClick={onRetry}>
        <RefreshCw size={16} aria-hidden="true" /> Try again
      </button>
    </div>
  )
}

export default function App() {
  const { data, error, retry } = useProfile()

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">Skip to content</a>
      <Background />
      <ScrollProgress />
      <Navbar initials={data?.initials ?? 'AT'} />
      <main id="main">
        {error ? (
          <ErrorState onRetry={retry} />
        ) : !data ? (
          <Loader />
        ) : (
          <>
            <Hero profile={data} />
            <About profile={data} />
            <Experience items={data.experience} />
            <Skills skills={data.skills} />
            <Projects projects={data.projects} />
            <Achievements items={data.achievements} />
            <Contact profile={data} />
          </>
        )}
      </main>
      <Footer name={data?.name ?? 'Aakash T C S'} />
    </MotionConfig>
  )
}
