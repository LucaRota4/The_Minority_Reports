/**
 * Simple in-memory storage for space descriptions
 * This can be replaced with MongoDB or a database later
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'space-descriptions.json');

// Ensure data directory exists
if (typeof window === 'undefined') { // Server-side only
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
  }
}

/**
 * Save a space description
 * @param {string} spaceId - The space identifier (e.g., "myspace")
 * @param {Object} data - The data to save
 * @param {string} data.ensName - Full ENS name (e.g., "myspace.agora")
 * @param {string} data.description - Space description
 * @param {string} data.logo - Logo URL or data URI
 * @param {string} data.createdBy - Creator's address
 * @param {string} data.txHash - Transaction hash
 */
export async function saveSpaceDescription(spaceId, data) {
  try {
    const descriptions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    descriptions[spaceId] = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(descriptions, null, 2));
    return { success: true, data: descriptions[spaceId] };
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
    const descriptions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return descriptions[spaceId] || null;
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
    const descriptions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
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
    const descriptions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    if (!descriptions[spaceId]) {
      return { success: false, error: 'Space not found' };
    }
    
    // Handle logo field explicitly - allow empty string to clear logo
    const updatedData = {
      ...descriptions[spaceId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // If logo is explicitly set to empty string, keep it (don't fall back to old value)
    if (updates.hasOwnProperty('logo')) {
      updatedData.logo = updates.logo || '';
    }
    
    descriptions[spaceId] = updatedData;
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(descriptions, null, 2));
    return { success: true, data: descriptions[spaceId] };
  } catch (error) {
    console.error('Error updating space description:', error);
    return { success: false, error: error.message };
  }
}
