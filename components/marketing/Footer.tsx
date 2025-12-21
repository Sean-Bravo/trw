import React from 'react';
import { Container } from '../layout/Container';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0c1929] text-white py-16 border-t border-[#1f2937]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Branding */}
          <div>
            <h3 className="font-poppins text-lg font-semibold mb-4">
              TaxReadyWallet
            </h3>
            <p className="text-sm text-[#d1d5db] leading-relaxed">
              Crypto taxes, refined. Repair your CSV files and export to any tax platform.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-poppins text-base font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#docs" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-poppins text-base font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#about" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#blog" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-poppins text-base font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#privacy" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#terms" className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1f2937] pt-8 text-center">
          <p className="text-xs text-[#6b7280]">
            © 2025 Quantum Transfer Group. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}

