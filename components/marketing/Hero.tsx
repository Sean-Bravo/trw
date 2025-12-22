import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { Shield, CheckCircle2, Users, TrendingUp, Clock } from 'lucide-react';
// IMPORT THE NEW DEMO
import { InteractiveDemo } from './InteractiveDemo';

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-[#f9fafb] py-24 sm:py-32 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-[#3b82f6] rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-[#1a365d] rounded-full opacity-5 blur-3xl"></div>
      </div>

      <Container>
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-gradient-to-r from-[#3b82f6]/10 to-[#1a365d]/10 backdrop-blur-sm border border-[#3b82f6]/20 text-[#1a365d] rounded-full text-xs font-semibold uppercase tracking-wider">
              <div className="w-4 h-4 bg-[#3b82f6] rounded flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M14 7l5 5-5 5M9 7l5 5-5 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              AI-Powered CSV Repair
            </div>

            <h1 className="font-poppins text-5xl sm:text-6xl md:text-7xl font-bold text-[#1a365d] leading-tight tracking-tight mb-6">
              Fix Your Crypto Taxes
              <br />
              <span className="bg-gradient-to-r from-[#3b82f6] to-[#1a365d] bg-clip-text text-transparent">
                in 30 Seconds
              </span>
            </h1>

            <p className="text-xl text-[#4b5563] max-w-2xl mx-auto mb-10 leading-relaxed">
              Broken CSV from your exchange? We clean it, format it, and make it ready for any tax platform. No manual editing required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button variant="primary" href="#start" showArrow className="text-base px-8 py-4 h-14">
                Start Free Audit
              </Button>
              <Button variant="secondary" href="#pricing" className="text-base px-8 py-4 h-14">
                View Pricing
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[#6b7280] mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#3b82f6]" />
                <span className="font-semibold">256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#3b82f6]" />
                <span className="font-semibold">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#3b82f6]" />
                <span className="font-semibold">10,000+ users</span>
              </div>
            </div>
          </div>

          {/* Bento Grid with INTERACTIVE DEMO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16">
            {/* Main dashboard demo - takes 2 columns */}
            <div className="lg:col-span-2 group min-h-[400px]">
               {/* Replaced the static image/div with the Interactive Component */}
               <InteractiveDemo />
            </div>

            {/* Side feature cards */}
            <div className="flex flex-col gap-6">
              {/* Stat card 1 */}
              <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-[#e5e7eb] shadow-[0_8px_32px_rgba(26,54,93,0.12)] hover:shadow-[0_12px_48px_rgba(26,54,93,0.18)] hover:border-[#3b82f6]/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-full">+15% this week</span>
                </div>
                <h3 className="font-poppins text-3xl font-bold text-[#1a365d] mb-1">99.9%</h3>
                <p className="text-sm text-[#6b7280] font-medium">Success Rate</p>
                <p className="text-xs text-[#9ca3af] mt-2">Based on 10,000+ repairs</p>
              </div>

              {/* Stat card 2 */}
              <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-[#e5e7eb] shadow-[0_8px_32px_rgba(26,54,93,0.12)] hover:shadow-[0_12px_48px_rgba(26,54,93,0.18)] hover:border-[#3b82f6]/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-gradient-to-br from-[#1a365d] to-[#0c1929] rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-1 rounded-full">Lightning fast</span>
                </div>
                <h3 className="font-poppins text-3xl font-bold text-[#1a365d] mb-1">8.5 hrs</h3>
                <p className="text-sm text-[#6b7280] font-medium">Average Time Saved</p>
                <p className="text-xs text-[#9ca3af] mt-2">vs manual editing</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}