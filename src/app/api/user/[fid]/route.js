import { getUserByFid } from '@/lib/neynar';

/**
 * API route to fetch user data from Neynar API
 * @param {Request} request - The incoming request
 * @param {Object} params - URL parameters, including FID
 * @returns {Response} - JSON response with user data
 */
export async function GET(request, { params }) {
  try {
    const { fid } = params;
    
    if (!fid) {
      return new Response(JSON.stringify({ error: 'FID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const userData = await getUserByFid(fid);
    
    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API route error:', error);
    
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch user data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}