import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { generateNftMetadata } from '@/lib/metadata';

// Configure caching - metadata is static once created
export const dynamic = 'force-static'; // Force static rendering
export const revalidate = 3600; // Revalidate every hour in case of updates

export async function GET(request, { params }) {
  try {
    const { hash, tokenId } = params;
    
    // Validate hash and tokenId
    if (!hash || !tokenId) {
      return NextResponse.json({ error: 'Missing hash or token ID' }, { status: 400 });
    }
    
    // Parse tokenId to ensure it's a number
    const tokenNumber = parseInt(tokenId);
    if (isNaN(tokenNumber) || tokenNumber < 1) {
      return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
    }
    
    // Get collection from the database
    const result = await sql`
      SELECT * FROM collections
      WHERE hash = ${hash}
    `;
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    
    const collection = result.rows[0];
    
    // Check if the requested token is within the maximum mints
    if (collection.max_mints !== null && tokenNumber > collection.max_mints) {
      return NextResponse.json({ error: 'Token ID exceeds maximum mints' }, { status: 404 });
    }
    
    // Generate the metadata
    const metadata = generateNftMetadata(collection, tokenId);
    
    // Return the metadata as JSON with caching headers
    return NextResponse.json(
      metadata, 
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'CDN-Cache-Control': 'max-age=86400',
          'Vercel-CDN-Cache-Control': 'max-age=86400',
        },
      }
    );
    
  } catch (error) {
    console.error('Error getting token metadata:', error);
    return NextResponse.json({ error: 'Failed to get token metadata' }, { status: 500 });
  }
}