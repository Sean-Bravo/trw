import React from 'react';
import { Button } from '../ui/Button';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-poppins text-xl font-bold text-[#1a365d]">
          TaxReadyWallet
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-[#1a365d] hover:text-[#059669] transition-colors text-sm font-medium">
            Features
          </Link>
          <Link href="#pricing" className="text-[#1a365d] hover:text-[#059669] transition-colors text-sm font-medium">
            Pricing
          </Link>
          <Link href="#docs" className="text-[#1a365d] hover:text-[#059669] transition-colors text-sm font-medium">
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="#signin" className="hidden md:block text-[#1a365d] hover:text-[#059669] transition-colors text-sm font-medium">
            Sign In
          </Link>
          <Button variant="primary" href="#start" showArrow>
            Start Free
          </Button>
        </div>
      </div>
    </header>
  );
}

