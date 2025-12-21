# TaxReadyWallet

A modern, professional Next.js application for TaxReadyWallet - a crypto CSV repair tool.

## Features

- **Complete Design System**: Fully implemented design system with custom colors, typography, and components
- **11 Marketing Sections**: All sections from the design specification implemented
- **Responsive Design**: Mobile-first responsive design with breakpoints for tablet and desktop
- **Accessible**: WCAG AA compliant with proper focus states and semantic HTML
- **Type-Safe**: Built with TypeScript for type safety
- **Modern Stack**: Next.js 16, React 19, Tailwind CSS v4

## Tech Stack

- **Framework**: Next.js 16.1.0 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Fonts**: Inter, Poppins, Sohne

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Project Structure

```
trw/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main landing page
│   └── globals.css         # Global styles and Tailwind config
├── components/
│   ├── ui/                 # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Accordion.tsx
│   ├── marketing/          # Marketing section components
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── CostOfClarity.tsx
│   │   ├── Testimonials.tsx
│   │   ├── SupportedExchanges.tsx
│   │   ├── ExportFormats.tsx
│   │   ├── FAQ.tsx
│   │   ├── Pricing.tsx
│   │   ├── FinalCTA.tsx
│   │   └── Footer.tsx
│   └── layout/
│       └── Container.tsx   # Layout container component
```

## Design System

### Colors

- **Primary**: Navy (#1a365d)
- **Accent**: Emerald (#059669)
- **Neutrals**: Gray scale from 50-900
- **Semantic**: Success, Warning, Error, Info states

### Typography

- **Body**: Inter (400, 500, 600)
- **Headlines**: Poppins (600, 700)
- **Accent**: Sohne (400)

### Components

All components follow the design specification with:
- Proper spacing (8px base unit)
- Subtle shadows and hover effects
- 300ms transitions
- WCAG AA compliant colors
- Responsive breakpoints

## License

Private - Quantum Transfer Group
