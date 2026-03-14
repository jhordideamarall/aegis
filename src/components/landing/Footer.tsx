'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950 text-white relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="relative w-12 h-12 rounded-full bg-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-lg">
                <Image
                  src="/img/logo.svg"
                  alt="AEGIS POS"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold">AEGIS POS</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-sm leading-relaxed">
              AEGIS POS is a modern cloud POS platform that helps businesses manage sales, inventory, and customers in one powerful system. Free for Indonesian businesses.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4 mb-6">
              <a 
                href="https://socialbrand1980.com" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Visit SocialBrand1980"
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-all hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="mailto:hello@aegispos.com" 
                aria-label="Email us"
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-all hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            </div>

            <p className="text-gray-500 text-sm">
              Powered by{' '}
              <a 
                href="https://socialbrand1980.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                socialbrand1980
              </a>
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/features" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/features#pos-flow" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  POS System
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/setup" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Features Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Features</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/pos" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Point of Sale
                </Link>
              </li>
              <li>
                <Link href="/features#inventory" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Inventory
                </Link>
              </li>
              <li>
                <Link href="/features#reporting" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Orders
                </Link>
              </li>
              <li>
                <Link href="/features#loyalty" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Loyalty Program
                </Link>
              </li>
              <li>
                <Link href="/features#reporting" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  About
                </Link>
              </li>
              <li>
                <Link href="/updates" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Update Fitur
                </Link>
              </li>
              <li>
                <a href="mailto:hello@aegispos.com" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Contact
                </a>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Documentation
                </Link>
              </li>
              <li>
                <a href="https://socialbrand1980.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Partner
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/docs" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/pos-untuk-cafe" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  POS untuk Cafe
                </Link>
              </li>
              <li>
                <Link href="/pos-untuk-retail" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  POS untuk Retail
                </Link>
              </li>
              <li>
                <Link href="/pos-untuk-restoran" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  POS untuk Restoran
                </Link>
              </li>
              <li>
                <Link href="/cloud-pos-system" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white transition-colors"></span>
                  Cloud POS System
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="relative border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm text-center md:text-left">
              © {currentYear} AEGIS POS. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
