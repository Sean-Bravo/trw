import { NextRequest, NextResponse } from 'next/server';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

/**
 * GET /api/bank/banks
 * List supported banks and export formats
 */
export async function GET(request: NextRequest) {
  try {
    // Call Lambda
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/bank/banks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await lambdaResponse.json();

    if (!lambdaResponse.ok) {
      // Return fallback data if Lambda fails
      return NextResponse.json({
        banks: [
          { id: 'chase', name: 'Chase' },
          { id: 'bank_of_america', name: 'Bank of America' },
          { id: 'wells_fargo', name: 'Wells Fargo' },
          { id: 'citi', name: 'Citi' },
        ],
        formats: [
          { id: 'qbo', name: 'QuickBooks Online' },
          { id: 'xero', name: 'Xero' },
          { id: 'excel', name: 'Excel/Generic' },
        ],
      });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Bank List] Error:', error);
    // Return fallback on error
    return NextResponse.json({
      banks: [
        { id: 'chase', name: 'Chase' },
        { id: 'bank_of_america', name: 'Bank of America' },
        { id: 'wells_fargo', name: 'Wells Fargo' },
        { id: 'citi', name: 'Citi' },
      ],
      formats: [
        { id: 'qbo', name: 'QuickBooks Online' },
        { id: 'xero', name: 'Xero' },
        { id: 'excel', name: 'Excel/Generic' },
      ],
    });
  }
}
