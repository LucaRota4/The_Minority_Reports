import { NextResponse } from 'next/server';
import { saveSpaceDescription, getSpaceDescription, getAllSpaceDescriptions, updateSpaceDescription } from '@/lib/spaceDescriptions';

/**
 * POST /api/space-description
 * Save a new space description
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { spaceId, ensName, description, logo, createdBy, txHash } = body;

    if (!spaceId || !ensName || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: spaceId, ensName, description' },
        { status: 400 }
      );
    }

    const result = await saveSpaceDescription(spaceId, {
      ensName,
      description,
      logo: logo || '', // Save empty string if no logo
      createdBy,
      txHash
    });

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/space-description:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/space-description?spaceId=xyz
 * Get a space description by spaceId
 * GET /api/space-description (no params)
 * Get all space descriptions
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');

    if (spaceId) {
      const data = await getSpaceDescription(spaceId);
      if (data) {
        return NextResponse.json({ success: true, data });
      } else {
        return NextResponse.json(
          { error: 'Space description not found' },
          { status: 404 }
        );
      }
    } else {
      const data = await getAllSpaceDescriptions();
      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error in GET /api/space-description:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/space-description
 * Update a space description
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { spaceId, ...updates } = body;

    if (!spaceId) {
      return NextResponse.json(
        { error: 'Missing required field: spaceId' },
        { status: 400 }
      );
    }

    const result = await updateSpaceDescription(spaceId, updates);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Space not found' ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error('Error in PATCH /api/space-description:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
