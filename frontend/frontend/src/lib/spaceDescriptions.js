/**
 * MongoDB storage for space descriptions
 * Replaces the previous JSON file storage
 */

import connectDB from './mongodb';
import SpaceMetadata from './models/SpaceMetadata';

/**
 * Save a space description
 * @param {string} spaceId - The space identifier (e.g., "myspace")
 * @param {Object} data - The data to save
 * @param {string} data.ensName - Full ENS name (e.g., "myspace.agora")
 * @param {string} data.description - Space description
 * @param {string} data.logo - Logo base64 data URI
 * @param {string} data.createdBy - Creator's address
 * @param {string} data.txHash - Transaction hash
 */
export async function saveSpaceDescription(spaceId, data) {
  try {
    await connectDB();
    
    const metadata = await SpaceMetadata.create({
      spaceId,
      ...data
    });
    
    return { 
      success: true, 
      data: {
        ensName: metadata.ensName,
        description: metadata.description,
        logo: metadata.logo,
        createdBy: metadata.createdBy,
        txHash: metadata.txHash,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt
      }
    };
  } catch (error) {
    console.error('Error saving space description:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a space description by spaceId
 * @param {string} spaceId - The space identifier
 */
export async function getSpaceDescription(spaceId) {
  try {
    await connectDB();
    
    const metadata = await SpaceMetadata.findOne({ spaceId }).lean();
    
    if (!metadata) {
      return null;
    }
    
    return {
      ensName: metadata.ensName,
      description: metadata.description,
      logo: metadata.logo,
      createdBy: metadata.createdBy,
      txHash: metadata.txHash,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    };
  } catch (error) {
    console.error('Error getting space description:', error);
    return null;
  }
}

/**
 * Get all space descriptions
 */
export async function getAllSpaceDescriptions() {
  try {
    await connectDB();
    
    const allMetadata = await SpaceMetadata.find({}).lean();
    
    // Convert array to object with spaceId as key for compatibility
    const descriptions = {};
    allMetadata.forEach(metadata => {
      descriptions[metadata.spaceId] = {
        ensName: metadata.ensName,
        description: metadata.description,
        logo: metadata.logo,
        createdBy: metadata.createdBy,
        txHash: metadata.txHash,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt
      };
    });
    
    return descriptions;
  } catch (error) {
    console.error('Error getting all space descriptions:', error);
    return {};
  }
}

/**
 * Update a space description
 * @param {string} spaceId - The space identifier
 * @param {Object} updates - The fields to update
 */
export async function updateSpaceDescription(spaceId, updates) {
  try {
    await connectDB();
    
    // Handle logo field explicitly - allow empty string to clear logo
    const updateData = { ...updates };
    if (updates.hasOwnProperty('logo')) {
      updateData.logo = updates.logo || '';
    }
    
    const metadata = await SpaceMetadata.findOneAndUpdate(
      { spaceId },
      { $set: updateData },
      { new: true }
    ).lean();
    
    if (!metadata) {
      return { success: false, error: 'Space not found' };
    }
    
    return { 
      success: true, 
      data: {
        ensName: metadata.ensName,
        description: metadata.description,
        logo: metadata.logo,
        createdBy: metadata.createdBy,
        txHash: metadata.txHash,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt
      }
    };
  } catch (error) {
    console.error('Error updating space description:', error);
    return { success: false, error: error.message };
  }
}
