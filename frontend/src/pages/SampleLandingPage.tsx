import React from 'react';
import { motion } from 'framer-motion';
import { Code, Sparkles, Layers, Github } from 'lucide-react';
import DarkGlowButton from '../components/DarkGlowButton';

interface NavLinkProps {
  children: React.ReactNode;
  href?: string;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

interface FooterLinkProps {
  children: React.ReactNode;
}

function SampleLandingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">React Vite Template</h1>
          </div>
          <div className="hidden md:flex gap-8">
            <NavLink>Features</NavLink>
            <NavLink>Docs</NavLink>
            <NavLink>GitHub</NavLink>
            <NavLink href="/test-tts">Test TTS</NavLink>
          </div>
          <DarkGlowButton 
            to="#get-started" 
            text="Get Started" 
            width="auto"
          />
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="mb-4 flex gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-medium">React 19</span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">Vite 7</span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">Tailwind 4</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
              Modern Frontend Development Template
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-md">
              A lightning-fast React + Vite + Tailwind CSS starter template with Framer Motion animations and ready-to-use components.
            </p>
            <div className="flex gap-4">
              <DarkGlowButton 
                to="#download" 
                text="Use This Template" 
                width="200px"
              />
              <DarkGlowButton 
                to="https://github.com/Provedentia/KatyYouthHacks" 
                text="View on GitHub" 
                icon={<Github size={18} />}
                width="200px"
              />
            </div>
          </motion.div>
          <motion.div 
            className="md:w-1/2 relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div className="w-full h-[400px] rounded-xl overflow-hidden relative border border-slate-800 shadow-2xl shadow-indigo-500/10">
              <div className="absolute top-0 left-0 right-0 h-8 bg-slate-900 flex items-center px-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="bg-slate-950 pt-8 h-full overflow-hidden">
                <pre className="text-sm text-left p-6 font-mono overflow-auto h-full">
                  <code className="text-slate-300">
{`import { motion } from 'framer-motion';
import DarkGlowButton from './components/DarkGlowButton';

function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="container mx-auto py-6">
        <h1 className="text-3xl font-bold text-white">
          React + Vite + Tailwind
        </h1>
      </header>
      
      <main className="container mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DarkGlowButton 
            to="#" 
            text="Get Started" 
          />
        </motion.div>
      </main>
    </div>
  );
}`}
                  </code>
                </pre>
              </div>
            </div>
            {/* Decorative elements */}
            <motion.div 
              className="absolute -bottom-6 -left-6 w-20 h-20 bg-indigo-500/20 rounded-xl"
              animate={{ 
                rotate: [0, 10, 0, -10, 0],
                y: [0, -5, 0, 5, 0]
              }}
              transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute -top-4 -right-4 w-14 h-14 bg-purple-500/20 rounded-full"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">Powerful Features Built-In</h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Everything you need to build modern, beautiful React applications. Batteries included.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard 
            icon={<Code className="w-6 h-6" />}
            title="Developer Experience"
            description="Hot Module Replacement, ESLint integration, and TypeScript support for a seamless development workflow."
            delay={0.1}
          />
          <FeatureCard 
            icon={<Sparkles className="w-6 h-6" />}
            title="Animations Ready"
            description="Framer Motion animations and transitions with custom components like DarkGlowButton pre-built for you."
            delay={0.3}
          />
          <FeatureCard 
            icon={<Layers className="w-6 h-6" />}
            title="Modern Stack"
            description="React 19, Vite 7, Tailwind CSS 4, and other cutting-edge technologies power this template."
            delay={0.5}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 md:py-24" id="get-started">
        <motion.div 
          className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 md:p-16 relative overflow-hidden border border-slate-800"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <motion.div 
              className="absolute top-10 right-10 w-40 h-40 rounded-full bg-indigo-500"
              animate={{ 
                scale: [1, 1.2, 1],
                x: [0, 20, 0],
                y: [0, -20, 0]
              }}
              transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-20 left-20 w-60 h-60 rounded-full bg-purple-500"
              animate={{ 
                scale: [1, 1.1, 1],
                x: [0, -10, 0],
                y: [0, 10, 0]
              }}
              transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
            />
          </div>
          
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-pink-300">
              Start Building Amazing Apps Today
            </h2>
            <p className="text-lg mb-8 text-slate-300">
              Clone the repository, install dependencies, and start developing your next great project with this modern, optimized template.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg text-left mb-8 font-mono text-sm overflow-auto">
              <pre className="text-slate-300">
{`# Clone the repository
git clone https://github.com/xxx/xxx.git my-project

# Navigate to the project directory
cd my-project

# Install dependencies
npm install

# Start the development server
npm run dev`}
              </pre>
            </div>
            <DarkGlowButton 
              to="https://github.com/Provedentia/KatyYouthHacks" 
              text="Get Started Now" 
              width="200px"
            />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                <h3 className="text-xl font-bold">React Vite Template</h3>
              </div>
              <p className="max-w-xs text-slate-400">
                A modern, optimized template for building React applications with Vite and Tailwind CSS.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold mb-4 text-white">Features</h4>
                <ul className="space-y-2">
                  <FooterLink>React 19</FooterLink>
                  <FooterLink>Vite 7</FooterLink>
                  <FooterLink>Tailwind CSS 4</FooterLink>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-white">Resources</h4>
                <ul className="space-y-2">
                  <FooterLink>Documentation</FooterLink>
                  <FooterLink>Components</FooterLink>
                  <FooterLink>Examples</FooterLink>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-white">Links</h4>
                <ul className="space-y-2">
                  <FooterLink>GitHub</FooterLink>
                  <FooterLink>React Docs</FooterLink>
                  <FooterLink>Vite Docs</FooterLink>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-6 text-center text-slate-500">
            <p>© {new Date().getFullYear()} React Vite Template. Made with ❤️ by developers for developers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Utility Components
const NavLink: React.FC<NavLinkProps> = ({ children, href = "#" }) => (
  <motion.a 
    href={href} 
    className="text-slate-300 hover:text-white font-medium"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    {children}
  </motion.a>
);

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => (
  <motion.div 
    className="bg-slate-800 rounded-xl p-8 border border-slate-700 hover:border-indigo-500/50 transition-colors"
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <motion.div 
      className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-lg inline-block mb-4"
      whileHover={{ 
        scale: 1.1, 
        rotate: 5,
      }}
    >
      {icon}
    </motion.div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-slate-300">{description}</p>
  </motion.div>
);

const FooterLink: React.FC<FooterLinkProps> = ({ children }) => (
  <li>
    <motion.a 
      href="#" 
      className="text-slate-400 hover:text-white transition-colors"
      whileHover={{ x: 3 }}
    >
      {children}
    </motion.a>
  </li>
);

export default SampleLandingPage;
