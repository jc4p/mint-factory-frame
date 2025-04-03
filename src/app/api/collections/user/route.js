import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'edge';

/**
 * API route to fetch collections for a user by FID
 * @param {Request} request - The incoming request
 * @returns {Response} - JSON response with user collections data
 */
export async function GET(request) {
  try {
    // Get FID from query parameters
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    // Validate FID
    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }
    
    // Convert FID to numeric
    const numericFid = Number(fid);
    if (isNaN(numericFid)) {
      return NextResponse.json(
        { error: 'FID must be a valid number' },
        { status: 400 }
      );
    }
    
    // Query collections for the user, sorted by created_at in descending order
    const result = await sql`
      SELECT * FROM collections 
      WHERE fid = ${numericFid}
      ORDER BY created_at DESC
    `;
    
    // Return the collections
    return NextResponse.json({
      success: true,
      collections: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching user collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user collections' },
      { status: 500 }
    );
  }
}