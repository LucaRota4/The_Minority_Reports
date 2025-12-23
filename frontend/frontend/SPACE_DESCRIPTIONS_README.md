# Space Descriptions Feature

This feature allows users to add descriptions to their governance spaces. Descriptions are stored separately from the smart contract (off-chain) and are linked to spaces by their space ID.

## How It Works

### 1. Storage Layer (`src/lib/spaceDescriptions.js`)
- Uses a simple JSON file storage (`data/space-descriptions.json`)
- Stores space descriptions with metadata (creator, timestamp, transaction hash)
- Can be easily migrated to MongoDB or any other database later

### 2. API Endpoint (`src/app/api/space-description/route.js`)
Provides three operations:
- **POST**: Save a new space description
- **GET**: Retrieve description(s) by spaceId or get all
- **PATCH**: Update an existing space description

### 3. Form Integration (`src/components/dashboard/SpaceCreation.jsx`)
- Adds a textarea field for entering the space description
- Validates description (max 500 characters)
- Saves description to backend after successful space creation on blockchain

### 4. Hook for Fetching (`src/hooks/useSpaceDescription.js`)
Custom React hook to easily fetch space descriptions in any component:

```javascript
import { useSpaceDescription } from '@/hooks/useSpaceDescription';

function MyComponent() {
  const { description, loading, error } = useSpaceDescription('myspace');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{description?.description}</div>;
}
```

## Usage

### Creating a Space with Description

1. Navigate to `/app/spaces/create`
2. Fill in the required fields (ENS name, Display name)
3. **NEW**: Add an optional description (up to 500 characters)
4. Select membership type and submit
5. After blockchain confirmation, the description is automatically saved

### Fetching Space Descriptions

**Using the hook:**
```javascript
const { description, loading, error } = useSpaceDescription('myspace');
```

**Direct API call:**
```javascript
// Get a specific space description
const response = await fetch('/api/space-description?spaceId=myspace');
const { data } = await response.json();

// Get all space descriptions
const response = await fetch('/api/space-description');
const { data } = await response.json();
```

## Data Structure

Each space description entry contains:
```json
{
  "spaceId": {
    "ensName": "myspace.agora",
    "description": "This is my governance space for...",
    "createdBy": "0x123...",
    "txHash": "0xabc...",
    "createdAt": "2025-12-23T10:00:00.000Z",
    "updatedAt": "2025-12-23T10:00:00.000Z"
  }
}
```

## Migration to MongoDB

To migrate to MongoDB (since it's already in dependencies):

1. Create a Mongoose schema:
```javascript
const SpaceDescriptionSchema = new mongoose.Schema({
  spaceId: { type: String, required: true, unique: true },
  ensName: String,
  description: String,
  createdBy: String,
  txHash: String,
}, { timestamps: true });
```

2. Update `src/lib/spaceDescriptions.js` to use MongoDB instead of JSON file
3. Add MongoDB connection string to `.env.local`:
```
MONGODB_URI=mongodb://...
```

## Files Modified/Created

- ✅ `src/components/dashboard/SpaceCreation.jsx` - Added description field
- ✅ `src/lib/spaceDescriptions.js` - Storage layer (NEW)
- ✅ `src/app/api/space-description/route.js` - API endpoint (NEW)
- ✅ `src/hooks/useSpaceDescription.js` - React hook (NEW)
- ✅ `.gitignore` - Added `/data` to ignore list

## Notes

- Descriptions are **optional**
- Maximum length: **500 characters**
- Stored **off-chain** (not on blockchain)
- Automatically saved after successful space creation
- Can be updated later using the PATCH endpoint
