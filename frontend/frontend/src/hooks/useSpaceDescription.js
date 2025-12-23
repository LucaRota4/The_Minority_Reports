import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch space description
 * @param {string} spaceId - The space identifier (e.g., "myspace")
 * @returns {Object} { description, loading, error }
 */
export function useSpaceDescription(spaceId) {
  const [description, setDescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    async function fetchDescription() {
      try {
        setLoading(true);
        const response = await fetch(`/api/space-description?spaceId=${spaceId}`);
        const data = await response.json();
        
        if (data.success) {
          setDescription(data.data);
        } else {
          setDescription(null);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching space description:', err);
        setError(err.message);
        setDescription(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDescription();
  }, [spaceId]);

  return { description, loading, error };
}

/**
 * Fetch all space descriptions
 * @returns {Promise<Object>} All space descriptions
 */
export async function fetchAllSpaceDescriptions() {
  try {
    const response = await fetch('/api/space-description');
    const data = await response.json();
    return data.success ? data.data : {};
  } catch (err) {
    console.error('Error fetching all space descriptions:', err);
    return {};
  }
}
