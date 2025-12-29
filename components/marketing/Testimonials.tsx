'use client';

import React from 'react';
import { 
  FileText, 
  CheckCircle, 
  Star 
} from 'lucide-react';

// Define the structure for our testimonial data
interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatarInitials: string;
}

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
      {/* 5 Stars */}
      <div className="flex gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-slate-700 italic mb-8 leading-relaxed text-lg flex-grow">
        "{testimonial.quote}"
      </p>

      {/* Author Info */}
      <div className="flex items-center pt-6 border-t border-slate-50">
        {/* Avatar - Uniform Brand Blue */}
        <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-sm mr-4 shrink-0">
          {testimonial.avatarInitials}
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{testimonial.name}</h4>
          <p className="text-sm text-slate-500">{testimonial.role}</p>
        </div>
      </div>
    </div>
  );
};

export function Testimonials() {
  const testimonials: Testimonial[] = [
    {
      name: "Alex Chen",
      role: "Crypto Trader",
      quote: "Fixed my CSV in seconds and exported to Koinly. Worth every penny.",
      avatarInitials: "AC",
    },
    {
      name: "Sarah Martinez",
      role: "Day Trader",
      quote: "Saved me hours of manual work. Exactly what the crypto community needed.",
      avatarInitials: "SM",
    },
    {
      name: "Michael Park",
      role: "DeFi Investor",
      quote: "Simple, fast, and reliable. No more fighting with tax software formats.",
      avatarInitials: "MP",
    },
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden font-sans">
      {/* Subtle Grid Background Pattern */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
         <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
         </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Trusted by Crypto Traders
          </h2>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((t, index) => (
            <TestimonialCard key={index} testimonial={t} />
          ))}
        </div>

        {/* Blue Stats Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2563EB] rounded-2xl shadow-xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-around text-center md:text-left">
            
            {/* Stat 1 */}
            <div className="flex items-center mb-8 md:mb-0">
              <div className="p-3 bg-white/10 rounded-lg mr-5">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="block text-4xl font-bold">10K+</span>
                <span className="block text-blue-100 font-medium text-sm">Files Repaired</span>
              </div>
            </div>

            {/* Vertical Divider (Hidden on mobile) */}
            <div className="hidden md:block w-px h-16 bg-white/20"></div>

            {/* Stat 2 */}
            <div className="flex items-center">
              <div className="p-3 bg-white/10 rounded-lg mr-5">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="block text-4xl font-bold">99.9%</span>
                <span className="block text-blue-100 font-medium text-sm">Success Rate</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}