// app/page.tsx
"use client";
import { signIn, signOut, useSession } from "next-auth/react";

// src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-dvh bg-base-100 bg-hillfinder-gradient">
      {/* Navbar */}
      <nav className="bg-navbar-gradient shadow-md">
        <div className="navbar max-w-6xl mx-auto px-4">
          <div className="flex-1">
            <a className="text-2xl font-bold">Hillfinder</a>
          </div>
          <div className="flex-none space-x-2">
            <a className="btn btn-ghost">Login</a>
            <a className="btn btn-primary">Sign Up</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 items-start gap-10">
          {/* Left: headline/CTA */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Find the perfect hill,
              <br className="hidden sm:block" /> every single time.
            </h1>
            <p className="text-base-content/70 text-lg">
              Hillfinder helps you discover and track your favorite climbs with
              smart filters, saved routes, and community tips.
            </p>
            <div className="flex flex-wrap gap-3">
              <a className="btn btn-primary" href="/auth/signup">
                Create account
              </a>
              <a className="btn btn-outline" href="/auth/signin">
                I already have an account
              </a>
            </div>
          </div>

          {/* Right: PASTE YOUR EXISTING CONTENT HERE */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              {/* ⬇️ Replace everything in this block with your current page content */}
              {/* Example: if your existing page has a form, paste it here */}
              {/* --- BEGIN: YOUR EXISTING JSX --- */}
              <h2 className="card-title">Welcome back</h2>
              <p className="text-base-content/70">
                Replace this block with your existing page JSX (form, hero,
                etc.).
              </p>
              {/* --- END: YOUR EXISTING JSX --- */}
              {/* Keep actions if you like */}
              <div className="card-actions justify-end">
                <a className="btn btn-primary btn-sm">Explore climbs</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container mx-auto px-4 py-16">
        <h3 className="text-2xl md:text-3xl font-semibold mb-8">
          How it works
        </h3>
        <ol className="steps steps-vertical md:steps-horizontal">
          <li className="step step-primary">Create an account</li>
          <li className="step step-primary">Filter & discover hills</li>
          <li className="step">Save routes</li>
          <li className="step">Track attempts</li>
        </ol>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="hero bg-base-200 rounded-box">
          <div className="hero-content text-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to climb smarter?
              </h2>
              <p className="py-4 text-base-content/70">
                Join Hillfinder and start building your list today.
              </p>
              <a className="btn btn-primary" href="/auth/signup">
                Get started free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer p-10 bg-base-200">
        <aside>
          <a className="btn btn-ghost text-xl">Hillfinder</a>
          <p className="text-base-content/70">
            © {new Date().getFullYear()} Hillfinder, Inc.
          </p>
        </aside>
        <nav>
          <h6 className="footer-title">Product</h6>
          <a className="link link-hover" href="#features">
            Features
          </a>
          <a className="link link-hover">Pricing</a>
          <a className="link link-hover">Changelog</a>
        </nav>
        <nav>
          <h6 className="footer-title">Company</h6>
          <a className="link link-hover">About</a>
          <a className="link link-hover">Blog</a>
          <a className="link link-hover">Contact</a>
        </nav>
      </footer>
    </main>
  );
}
