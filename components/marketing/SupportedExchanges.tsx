'use client';

import React from 'react';
import { Container } from '../layout/Container';
import {
  CurrencyBtc,
  TrendUp,
  ChartLine,
  Coin,
  Database,
  Wallet,
  ChartLineUp,
  ArrowsLeftRight
} from '@phosphor-icons/react';

const exchanges = [
  { name: 'Coinbase', icon: CurrencyBtc, color: '#0052FF' },
  { name: 'Binance', icon: Coin, color: '#F0B90B' },
  { name: 'Kraken', icon: TrendUp, color: '#5741D9' },
  { name: 'Crypto.com', icon: ChartLine, color: '#003D7A' },
  { name: 'Gemini', icon: ArrowsLeftRight, color: '#00DCFA' },
  { name: 'Kucoin', icon: ChartLineUp, color: '#24AE8F' },
  { name: 'Bybit', icon: Wallet, color: '#F7A600' },
  { name: 'OKX', icon: Database, color: '#000000' },
  { name: 'Bitfinex', icon: TrendUp, color: '#2ECC71' },
  { name: 'Huobi', icon: ChartLine, color: '#2E7BD1' },
  { name: 'Gate.io', icon: Coin, color: '#2354E6' },
  { name: 'Upbit', icon: CurrencyBtc, color: '#003C93' },
  { name: 'Bittrex', icon: Wallet, color: '#1F8AC0' },
  { name: 'Poloniex', icon: ArrowsLeftRight, color: '#3D4853' },
  { name: 'Bitstamp', icon: ChartLineUp, color: '#198754' },
];

export function SupportedExchanges() {
  return (
    <section className="bg-white py-24 sm:py-32 overflow-hidden">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins text-3xl sm:text-4xl font-bold text-[#1a365d] mb-4 leading-tight">
            Works with 15+ Exchanges
          </h2>
          <p className="text-lg text-[#4b5563] max-w-2xl mx-auto">
            Import from anywhere, export to any tax platform
          </p>
        </div>

        {/* Logo Cloud - Icon Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-8">
            {exchanges.map((exchange) => {
              const Icon = exchange.icon;
              return (
                <div
                  key={exchange.name}
                  className="group flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-110"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300"
                    style={{
                      backgroundColor: `${exchange.color}15`,
                      border: `2px solid ${exchange.color}30`
                    }}
                  >
                    <Icon
                      size={32}
                      weight="fill"
                      style={{ color: exchange.color }}
                      className="group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-poppins text-sm font-semibold text-[#6b7280] group-hover:text-[#1a365d] transition-colors duration-300">
                    {exchange.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-16">
          <p className="text-[#4b5563] text-lg">
            Don't see your exchange?{' '}
            <a href="#contact" className="text-[#3b82f6] hover:text-[#2563eb] underline font-semibold">
              We'll add it
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}

