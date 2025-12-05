import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API_BASE = 'https://bridge.polymarket.com';

/**
 * Proxy API route for Polymarket Bridge API
 * This handles CORS issues when calling Bridge API from browser
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const targetUrl = `${BRIDGE_API_BASE}/${targetPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bridge API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Bridge API' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const targetUrl = `${BRIDGE_API_BASE}/${targetPath}`;

  try {
    const body = await request.json().catch(() => ({}));
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bridge API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Bridge API' },
      { status: 500 }
    );
  }
}
