import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { uploadToR2, generateHash } from '@/lib/r2';

export const runtime = 'edge';
export const maxDuration = 300;

export async function POST(request) {
  try {
    console.log('API Route: Starting collection creation');
    // Parse multipart form data
    const formData = await request.formData();
    console.log('API Route: Form data received');
    
    const image = formData.get('image');
    const fid = formData.get('fid');
    const creatorAddress = formData.get('creatorAddress');
    const collectionName = formData.get('collectionName');
    const price = formData.get('price');
    const maxMints = formData.get('maxMints');
    const username = formData.get('username');
    const paymentTxHash = formData.get('paymentTxHash');
    
    console.log('API Route: Form data parsed:', {
      hasImage: !!image,
      fid,
      creatorAddress,
      collectionName,
      price,
      maxMints,
      username,
      hasPaymentTxHash: !!paymentTxHash
    });
    
    // Validate required fields
    if (!image || !fid || !creatorAddress || !collectionName || !username) {
      console.log('API Route: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Log payment transaction hash if provided (not required yet)
    if (paymentTxHash) {
      console.log(`Payment transaction hash: ${paymentTxHash}`);
    }
    
    // Convert FID to numeric
    const numericFid = Number(fid);
    if (isNaN(numericFid)) {
      return NextResponse.json(
        { error: 'FID must be a valid number' },
        { status: 400 }
      );
    }

    // Process the image
    let imageBuffer;
    let imageMimeType;
    
    if (image instanceof File) {
      const arrayBuffer = await image.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      imageMimeType = image.type;
    } else {
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      );
    }

    // Generate a unique hash for this collection
    const collectionHash = generateHash(10); // nanoid produces more entropy per character, so 10 is plenty
    
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = imageMimeType.split('/')[1];
    const fileName = `collection.${fileExtension}`;
    
    // Upload to R2 in a folder structure: fid/collectionHash/collection.jpg
    const imageUrl = await uploadToR2(imageBuffer, `${numericFid}/${collectionHash}`, fileName, imageMimeType);

    // Process image with Cloudflare Images API
    let optimizedImageUrl = imageUrl;
    let frameImageUrl = null;
    const cloudflareImagesUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
    
    try {
      const formDataCF = new FormData();
      formDataCF.append('url', imageUrl);
      formDataCF.append('metadata', JSON.stringify({
        source: 'nft-factory',
        fid: numericFid,
        collectionHash: collectionHash
      }));
      
      const cfResponse = await fetch(cloudflareImagesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
        },
        body: formDataCF
      });
      
      if (!cfResponse.ok) {
        console.error('Cloudflare Images API error:', await cfResponse.text());
        // Continue with the unoptimized image if Cloudflare Images fails
      } else {
        const cfData = await cfResponse.json();
        if (cfData.success && cfData.result) {          
          // Get the direct delivery URL from the response if available
          if (cfData.result.variants && cfData.result.variants.length > 0) {
            optimizedImageUrl = cfData.result.variants[0];

            frameImageUrl = optimizedImageUrl.replace('/public', '/fcimage');
          }
        }
      }
    } catch (error) {
      console.error('Error with Cloudflare Images:', error);
      // Continue with the original R2 URL if Cloudflare Images fails
    }
    
    // If we couldn't create a frame image, use the optimized image as fallback
    if (!frameImageUrl) {
      frameImageUrl = optimizedImageUrl;
    }
    
    // Generate a max 5-letter symbol from the collection name
    const generateSymbol = (name) => {
      // Remove special characters and split into words
      const words = name.replace(/[^\w\s]/gi, '').split(/\s+/);
      
      if (words.length === 1) {
        // For a single word, take up to 5 characters
        return words[0].substring(0, 5).toUpperCase();
      } else {
        // For multiple words, use the first letter of each word (up to 5)
        let acronym = words.map(word => word.charAt(0)).join('').toUpperCase();
        
        // If we have fewer than 5 letters and the first word is longer, add more letters from the first word
        if (acronym.length < 5 && words[0].length > 1) {
          acronym += words[0].substring(1, 5 - acronym.length + 1).toUpperCase();
        }
        
        return acronym.substring(0, 5);
      }
    };
    
    const symbol = generateSymbol(collectionName);
    
    // Call the middleware to create the collection contract
    let contractAddress = null;
    try {
      console.log('API Route: Starting middleware call for contract creation');
      const middlewareUrl = `${process.env.MIDDLEWARE_URL}/create-collection`;
      console.log('API Route: Middleware URL:', middlewareUrl);
      
      // Construct the base URI for the collection tokens
      const baseURI = `${process.env.NEXT_PUBLIC_BASE_URL}/tokens/${collectionHash}/`;
      console.log('API Route: Base URI:', baseURI);
      
      const middlewarePayload = {
        hash: collectionHash,
        fid: numericFid,
        creatorAddress: creatorAddress,
        collectionName: collectionName,
        baseURI: baseURI,
        imageUrl: optimizedImageUrl,
        price: price || '0.00005 ether',
        maxMints: maxMints || 0,
        symbol: symbol
      };
      console.log('API Route: Middleware payload:', middlewarePayload);
      
      const middlewareResponse = await fetch(middlewareUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.MIDDLEWARE_API_KEY
        },
        body: JSON.stringify(middlewarePayload)
      });
      
      console.log('API Route: Middleware response status:', middlewareResponse.status);
      
      if (!middlewareResponse.ok) {
        const errorText = await middlewareResponse.text();
        console.error('API Route: Middleware API error:', errorText);
        return NextResponse.json(
          { error: 'Contract creation failed. Please try again.' },
          { status: 500 }
        );
      } 
      
      const middlewareData = await middlewareResponse.json();
      console.log('API Route: Middleware response data:', middlewareData);
      
      if (!middlewareData.contractAddress) {
        console.error('API Route: Middleware did not return a contract address');
        return NextResponse.json(
          { error: 'Contract creation failed. No contract address returned.' },
          { status: 500 }
        );
      }
      
      contractAddress = middlewareData.contractAddress;
      console.log('API Route: Collection contract deployed at:', contractAddress);
    } catch (error) {
      console.error('API Route: Error calling middleware:', error);
      return NextResponse.json(
        { error: 'Contract creation failed due to an unexpected error.' },
        { status: 500 }
      );
    }
    
    // Save to database
    const result = await sql`
      INSERT INTO collections (
        hash,
        fid, 
        creator_address,
        username,
        collection_name, 
        price, 
        max_mints, 
        image_url,
        frame_image_url,
        contract_address
      ) 
      VALUES (
        ${collectionHash},
        ${numericFid}, 
        ${creatorAddress},
        ${username},
        ${collectionName}, 
        ${price || '0'}, 
        ${maxMints || null}, 
        ${optimizedImageUrl},
        ${frameImageUrl},
        ${contractAddress}
      )
      RETURNING id, hash, username, contract_address, created_at;
    `;
    
    const collectionId = result.rows[0]?.id;
    const returnedHash = result.rows[0]?.hash;
    const returnedContractAddress = result.rows[0]?.contract_address;
    const createdAt = result.rows[0]?.created_at;
    
    return NextResponse.json({
      success: true,
      collection: {
        id: collectionId,
        hash: returnedHash,
        fid: numericFid,
        creatorAddress,
        username,
        collectionName,
        price: price || '0',
        maxMints: maxMints || null,
        imageUrl: optimizedImageUrl,
        frameImageUrl: frameImageUrl,
        contractAddress: returnedContractAddress,
        createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}