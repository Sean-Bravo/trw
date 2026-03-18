import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'TaxFormatter Blog'
  const description = searchParams.get('description') || ''
  const category = searchParams.get('category') || 'guides'
  const readingTime = searchParams.get('readingTime') || '5'

  const categoryColors: Record<string, { bg: string; text: string; accent: string }> = {
    'guides': { bg: '#EFF6FF', text: '#1E40AF', accent: '#3B82F6' },
    'crypto-tax': { bg: '#EEF2FF', text: '#3730A3', accent: '#6366F1' },
    'tax-tips': { bg: '#ECFDF5', text: '#065F46', accent: '#10B981' },
    'updates': { bg: '#F8FAFC', text: '#334155', accent: '#64748B' },
    'bookkeeping': { bg: '#FFFBEB', text: '#92400E', accent: '#F59E0B' },
  }

  const colors = categoryColors[category] || categoryColors['guides']
  const shortDesc = description.length > 130 ? description.slice(0, 130) + '...' : description

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: 6,
            width: '100%',
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}88)`,
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '56px 72px 40px',
            flex: 1,
          }}
        >
          {/* Category + reading time */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            <div
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                fontSize: 15,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 100,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                display: 'flex',
              }}
            >
              {category}
            </div>
            <div style={{ color: '#94A3B8', fontSize: 15, fontWeight: 600, marginLeft: 16, display: 'flex' }}>
              {readingTime} min read
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 60 ? 42 : 50,
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.2,
              letterSpacing: -1,
              display: 'flex',
              maxWidth: 1000,
              marginBottom: 24,
            }}
          >
            {title}
          </div>

          {/* Description */}
          {shortDesc && (
            <div
              style={{
                fontSize: 20,
                color: '#64748B',
                lineHeight: 1.5,
                display: 'flex',
                maxWidth: 900,
              }}
            >
              {shortDesc}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 72px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${colors.accent}, #1E293B)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              T
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginLeft: 12, display: 'flex' }}>
              TaxFormatter
            </div>
          </div>

          <div style={{ fontSize: 17, color: '#94A3B8', display: 'flex' }}>
            taxformatter.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
