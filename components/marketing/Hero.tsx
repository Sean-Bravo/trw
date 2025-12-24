'use client'; // Required for scroll detection

import React from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { Shield, CheckCircle2, Users, TrendingUp, Clock } from 'lucide-react';
import { InteractiveDemo } from './InteractiveDemo';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function Hero() {
  // We track two separate elements for scroll triggering
  const { ref: gaugeRef, isVisible: gaugeVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: barRef, isVisible: barVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="bg-gradient-to-b from-white to-[#f9fafb] py-24 sm:py-32 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Main gradient orbs */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-[#3b82f6] rounded-full opacity-8 blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-[#1a365d] rounded-full opacity-8 blur-3xl animate-float animation-delay-300"></div>

        {/* Accent orbs for visual interest */}
        <div className="absolute top-40 left-1/4 w-72 h-72 bg-[#059669] rounded-full opacity-5 blur-3xl animate-float animation-delay-500"></div>
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-[#3b82f6] rounded-full opacity-6 blur-2xl animate-float animation-delay-200"></div>

        {/* Decorative grid pattern */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url('data:image/svg+xml;utf8,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(59,130,246,0.03)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>')`
          }}
        ></div>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent opacity-20"></div>
      </div>

      <Container>
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="text-center mb-12">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3b82f6]/10 to-[#1a365d]/10 backdrop-blur-sm border border-[#3b82f6]/20 text-[#1a365d] rounded-full text-xs font-semibold uppercase tracking-wider hover:border-[#3b82f6]/40 hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)] transition-all duration-300 animate-slide-up">
                <div className="w-4 h-4 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] rounded flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white animate-pulse-subtle">
                    <path d="M14 7l5 5-5 5M9 7l5 5-5 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                AI-Powered CSV Repair
              </div>
            </div>

            <h1 className="font-poppins text-5xl sm:text-6xl md:text-7xl font-bold text-[#1a365d] leading-tight tracking-tight mb-6 animate-slide-up animation-delay-100">
              Fix Your Crypto Taxes
              <br />
              <span className="bg-gradient-to-r from-[#3b82f6] via-[#2563eb] to-[#1a365d] bg-clip-text text-transparent animate-pulse-subtle">
                in 30 Seconds
              </span>
            </h1>

            <p className="text-xl text-[#4b5563] max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up animation-delay-200">
              Broken CSV from your exchange? We clean it, format it, and make it ready for any tax platform. No manual editing required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up animation-delay-300">
              <Button variant="primary" href="#start" showArrow className="text-base px-8 py-4 h-14 hover:shadow-[0_12px_32px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-300">
                Start Free Audit
              </Button>
              <Button variant="secondary" href="#pricing" className="text-base px-8 py-4 h-14 hover:shadow-[0_12px_32px_rgba(26,54,93,0.2)] hover:-translate-y-0.5 transition-all duration-300">
                View Pricing
              </Button>
            </div>

            {/* Trust indicators with gradient backgrounds */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[#6b7280] mb-4 animate-slide-up animation-delay-500">
              {/* <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/10 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10 transition-all duration-300">
                <Shield className="h-5 w-5 text-[#3b82f6]" />
                <span className="font-semibold text-[#1a365d]">256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669]/5 border border-[#059669]/10 hover:border-[#059669]/30 hover:bg-[#059669]/10 transition-all duration-300">
                <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                <span className="font-semibold text-[#1a365d]">SOC 2 Compliant</span>
              </div> */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/10 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10 transition-all duration-300">
                <Users className="h-5 w-5 text-[#3b82f6]" />
                <span className="font-semibold text-[#1a365d]">10,000+ users</span>
              </div>
            </div>
          </div>

          {/* Bento Grid with INTERACTIVE DEMO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16">
            {/* Main dashboard demo - takes 2 columns */}
            <div className="lg:col-span-2 group min-h-[400px]">
               <InteractiveDemo />
            </div>

            {/* Side feature cards */}
            <div className="flex flex-col gap-6 h-full">
              
              {/* CARD 1: Success Rate (With Live Gauge Asset) */}
              <div ref={gaugeRef} className="group flex-1 bg-gradient-to-br from-[#3b82f6]/5 via-white to-[#dbeafe]/20 backdrop-blur-xl rounded-2xl p-6 border border-[#3b82f6]/20 shadow-[0_8px_32px_rgba(59,130,246,0.08)] hover:shadow-[0_12px_48px_rgba(59,130,246,0.15)] hover:border-[#3b82f6]/40 transition-all duration-300 flex flex-col justify-center relative overflow-hidden">
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  {/* ASSET: Animated Gauge */}
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
                      {/* Background Circle */}
                      <circle cx="28" cy="28" r="24" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                      {/* Progress Circle (99.9%) - Only animates when visible */}
                      <circle 
                        cx="28" cy="28" r="24" 
                        stroke="#3b82f6" 
                        strokeWidth="4" 
                        fill="none" 
                        strokeDasharray="150.796" 
                        strokeDashoffset={gaugeVisible ? "0" : "150.796"}
                        strokeLinecap="round"
                        className="transition-all duration-1500 ease-out"
                        style={{
                          transitionProperty: 'stroke-dashoffset'
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-[#3b82f6]" />
                    </div>
                  </div>
                  
                  <span className="text-xs font-semibold text-[#059669] bg-gradient-to-r from-[#059669]/20 to-[#059669]/10 px-3 py-1.5 rounded-full flex items-center gap-1 border border-[#059669]/30">
                    <TrendingUp className="h-3 w-3" />
                    +15%
                  </span>
                </div>
                
                <div className="relative z-10">
                  <h3 className="font-poppins text-3xl font-bold text-[#1a365d] mb-1">99.9%</h3>
                  <p className="text-sm text-[#6b7280] font-medium">Success Rate</p>
                  <p className="text-xs text-[#9ca3af] mt-1">10k+ files processed</p>
                </div>
              </div>

              {/* CARD 2: Time Saved (With Comparison Bars Asset) */}
              <div ref={barRef} className="group flex-1 bg-gradient-to-br from-[#059669]/5 via-white to-[#d1fae5]/20 backdrop-blur-xl rounded-2xl p-6 border border-[#059669]/20 shadow-[0_8px_32px_rgba(5,150,105,0.08)] hover:shadow-[0_12px_48px_rgba(5,150,105,0.15)] hover:border-[#059669]/40 transition-all duration-300 flex flex-col justify-center relative overflow-hidden">
                {/* Decorative accent */}
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#059669]/10 rounded-full blur-2xl -ml-12 -mb-12 group-hover:scale-125 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#059669]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                
                <div className="mb-4 relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6b7280]">Manual</span>
                    <span className="text-xs font-bold text-[#ef4444] bg-[#ef4444]/10 px-2 py-1 rounded-full">8hrs</span>
                  </div>
                  {/* ASSET: Slow Bar */}
                  <div className="w-full h-2.5 bg-gray-100 rounded-full mb-3 overflow-hidden border border-gray-200">
                    <div className="h-full bg-gradient-to-r from-[#ef4444] to-[#dc2626] w-[85%] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#1a365d]">AI Engine</span>
                    <span className="text-xs font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-1 rounded-full">30s</span>
                  </div>
                  {/* ASSET: Fast Bar - Only animates when visible */}
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div 
                      className="h-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      style={{
                        width: barVisible ? '5%' : '0%',
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <h3 className="font-poppins text-3xl font-bold text-[#1a365d] mb-1">8.5h</h3>
                    <p className="text-sm text-[#6b7280] font-medium">Time Saved</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-[#059669]/20 to-[#059669]/10 rounded-full flex items-center justify-center text-[#059669] border border-[#059669]/20">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}