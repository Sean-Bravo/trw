import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'TaxFormatter - Crypto Tax CSV Repair';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  // Brand colors: Navy #1a365d, Blue #3b82f6
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a365d', // Brand Navy
          backgroundImage: 'radial-gradient(circle at 25px 25px, #3b82f6 2%, transparent 0%), radial-gradient(circle at 75px 75px, #3b82f6 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(26, 54, 93, 0.9)',
            padding: '40px 80px',
            borderRadius: '20px',
            border: '2px solid rgba(59, 130, 246, 0.3)', // Brand Blue border
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          {/* Logo Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              backgroundColor: '#3b82f6',
              borderRadius: '20px',
              marginBottom: '20px',
              fontSize: '40px',
              color: 'white',
              fontWeight: 800,
            }}
          >
            T
          </div>

          <div
            style={{
              fontSize: 60,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              color: 'white',
              marginTop: 10,
              padding: '0 120px',
              lineHeight: 1.2,
              whiteSpace: 'pre-wrap',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            TaxFormatter
          </div>

          <div
            style={{
              fontSize: 30,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              color: '#93c5fd', // Light Blue
              marginTop: 20,
              padding: '0 120px',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
            }}
          >
            Fix Your Crypto Taxes in 30 Seconds
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}