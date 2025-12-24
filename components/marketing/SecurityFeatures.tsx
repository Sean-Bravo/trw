'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import {
  Shield,
  Lock,
  CheckCircle,
  CloudSlash
} from '@phosphor-icons/react';

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'TLS 1.3 encryption for all data in transit. Database encryption at rest.',
    status: 'active',
  },
  {
    icon: CloudSlash,
    title: 'Zero Data Retention',
    description: 'Files automatically deleted after processing. We never store your data permanently.',
    status: 'active',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    description: 'DDoS protection, WAF, rate limiting, and comprehensive audit logging.',
    status: 'active',
  },
  {
    icon: CheckCircle,
    title: 'Privacy Compliant',
    description: 'Built with GDPR and CCPA compliance. Your data, your rights.',
    status: 'active',
  },
];

export function SecurityFeatures() {
  return (
    <section className="bg-[#0c1929] py-24 sm:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3b82f6] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#2563eb] rounded-full opacity-10 blur-3xl"></div>
      </div>

      <Container>
        <div className="text-center mb-16 relative z-10">
          {/* Logo Icon */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-[#3b82f6] rounded-xl flex items-center justify-center shadow-2xl">
              <Shield size={32} weight="fill" className="text-white" />
            </div>
          </div>

          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Bank-Level Security, Built In
          </h2>
          <p className="text-lg text-[#d1d5db] max-w-2xl mx-auto mb-8">
            Your financial data deserves the highest level of protection. We've built security into every layer of our platform.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <Lock size={16} weight="fill" className="text-[#3b82f6]" />
              <span className="text-sm font-semibold text-white">TLS 1.3 Encryption</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <Shield size={16} weight="fill" className="text-[#3b82f6]" />
              <span className="text-sm font-semibold text-white">DDoS Protected</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <CheckCircle size={16} weight="fill" className="text-[#059669]" />
              <span className="text-sm font-semibold text-white">Privacy Compliant</span>
            </div>
          </div>
        </div>

        {/* Security Features Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 relative z-10">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon size={24} weight="fill" className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-poppins text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[#d1d5db] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Promise */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] border-none text-white p-8 md:p-12">
            <div className="text-center">
              <h3 className="font-poppins text-2xl sm:text-3xl font-bold mb-4">
                Our Security Commitment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">$0</div>
                  <div className="text-sm text-white/80">Data Breaches</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">24hrs</div>
                  <div className="text-sm text-white/80">Max Data Retention</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">100%</div>
                  <div className="text-sm text-white/80">Encrypted Traffic</div>
                </div>
              </div>
              <p className="text-white/90 mt-8 leading-relaxed">
                Built with the same security tools trusted by Fortune 500 companies.
                Rate limiting, DDoS protection, encrypted storage, and automatic file deletion keep your data safe.
              </p>
              <div className="mt-8">
                <a
                  href="#security"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#3b82f6] rounded-full font-semibold hover:bg-white/90 transition-colors duration-300"
                >
                  Read Our Security White Paper
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}
