# Metadata Storage Architecture

This section describes the off-chain metadata storage system used in Agora for storing space descriptions, logos, and other non-blockchain data.

## Overview

Agora uses a hybrid storage approach:
- **On-chain**: Core governance data (spaces, proposals, votes) stored in smart contracts
- **Off-chain**: Metadata (descriptions, logos, images) stored in a separate data layer

This separation reduces gas costs and allows for flexible data management without blockchain constraints.

## Architecture

### Storage Layer (`src/lib/spaceDescriptions.js`)

The storage layer provides a simple abstraction for persisting metadata:

```javascript
// Save space metadata
await saveSpaceDescription(spaceId, {
  ensName: 'myspace.agora',
  description: 'Space description...',
  logo: 'data:image/png;base64,...',
  createdBy: '0x123...',
  txHash: '0xabc...'
});

// Retrieve metadata
const metadata = await getSpaceDescription(spaceId);

// Update metadata
await updateSpaceDescription(spaceId, {
  description: 'Updated description',
  logo: 'data:image/svg+xml;base64,...'
});
```

**Current Implementation**: JSON file storage
- Location: `data/space-descriptions.json`
- Format: Key-value pairs (spaceId → metadata)
- Automatic timestamps (createdAt, updatedAt)

**Benefits**:
- Simple setup, no external dependencies
- Version control friendly
- Easy to inspect and debug
- Suitable for MVP and small-scale deployments

**Limitations**:
- Not suitable for high-concurrency scenarios
- Limited query capabilities
- No built-in backup/replication

### API Layer (`src/app/api/space-description/route.js`)

RESTful API endpoints for metadata operations:

#### POST `/api/space-description`
Create new space metadata.

**Request**:
```json
{
  "spaceId": "myspace",
  "ensName": "myspace.agora",
  "description": "This is my governance space",
  "logo": "data:image/png;base64,...",
  "createdBy": "0x123...",
  "txHash": "0xabc..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "ensName": "myspace.agora",
    "description": "This is my governance space",
    "logo": "data:image/png;base64,...",
    "createdBy": "0x123...",
    "txHash": "0xabc...",
    "createdAt": "2025-12-23T10:00:00.000Z",
    "updatedAt": "2025-12-23T10:00:00.000Z"
  }
}
```

#### GET `/api/space-description?spaceId=myspace`
Retrieve metadata for a specific space.

#### GET `/api/space-description`
Retrieve all space metadata (admin/debugging).

#### PATCH `/api/space-description`
Update existing metadata.

**Request**:
```json
{
  "spaceId": "myspace",
  "description": "Updated description",
  "logo": ""
}
```

### Client Integration (`src/hooks/useSpaceDescription.js`)

Custom React hook for easy data fetching:

```javascript
import { useSpaceDescription } from '@/hooks/useSpaceDescription';

function SpaceDetails({ spaceName }) {
  const { description, loading, error } = useSpaceDescription(spaceName);
  
  if (loading) return <Loader />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      <h2>{description?.ensName}</h2>
      <p>{description?.description}</p>
      {description?.logo && <img src={description.logo} alt="Logo" />}
    </div>
  );
}
```

**Features**:
- Automatic caching with React Query
- Loading and error states
- Type-safe returns
- Revalidation on focus

## Data Schema

### Space Metadata Object

```typescript
interface SpaceMetadata {
  ensName: string;          // Full ENS name (e.g., "myspace.agora")
  description: string;      // Space description (max 500 chars)
  logo: string;            // Base64 encoded image or empty string
  createdBy: string;       // Creator's Ethereum address
  txHash?: string;         // Transaction hash of space creation
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### Storage Format (JSON)

```json
{
  "myspace": {
    "ensName": "myspace.agora",
    "description": "A decentralized governance space for...",
    "logo": "data:image/png;base64,iVBORw0KG...",
    "createdBy": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "txHash": "0xabc123...",
    "createdAt": "2025-12-23T10:00:00.000Z",
    "updatedAt": "2025-12-23T10:00:00.000Z"
  },
  "anotherspace": {
    ...
  }
}
```

## Features

### Space Descriptions

**Purpose**: Provide context and information about governance spaces without storing large text on-chain.

**Constraints**:
- Maximum length: 500 characters
- Plain text only (no HTML/markdown)
- Optional field

**Use Cases**:
- Explain the space's purpose
- List governance rules
- Provide contact information
- Link to external resources

### Space Logos

**Purpose**: Visual branding for governance spaces.

**Specifications**:
- Supported formats: PNG, JPG, SVG, WebP
- Maximum file size: 2MB (client-side validation)
- Storage format: Base64 data URI
- Display size: 80x80px (header), 64x64px (preview)
- Color filter: Automatically applied brand color (#4D89B0)

**Upload Flow**:
1. User selects image file
2. Client validates size and format
3. FileReader converts to base64
4. Preview shown with color filter
5. Saved to API on form submit
6. Page refresh displays new logo

**Clear/Remove**:
- "Clear Logo" button removes preview
- Saves empty string to database
- Logo disappears from all views

### Access Control

**Creation**:
- Anyone can create space metadata when creating a space
- Automatically saved after blockchain transaction confirms

**Updates**:
- Only space owner can update metadata
- Only space admins can update metadata
- Enforced in UI (button visibility)
- Should be enforced in API with signature verification (future enhancement)

## Migration to MongoDB

### Why Migrate?

Consider migrating from JSON to MongoDB when:
- Multiple concurrent users editing metadata
- Need for complex queries (search, filtering)
- Require atomic operations and transactions
- Scale beyond single-server deployment
- Need backup and replication

### Migration Steps

1. **Install MongoDB** (already in package.json):
```bash
npm install mongodb mongoose
```

2. **Create Mongoose Schema**:
```javascript
// src/lib/models/SpaceMetadata.js
import mongoose from 'mongoose';

const SpaceMetadataSchema = new mongoose.Schema({
  spaceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ensName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  txHash: String
}, {
  timestamps: true // Automatic createdAt/updatedAt
});

export default mongoose.models.SpaceMetadata || 
  mongoose.model('SpaceMetadata', SpaceMetadataSchema);
```

3. **Create Database Connection**:
```javascript
// src/lib/mongodb.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
```

4. **Update Storage Layer**:
```javascript
// src/lib/spaceDescriptions.js
import connectDB from './mongodb';
import SpaceMetadata from './models/SpaceMetadata';

export async function saveSpaceDescription(spaceId, data) {
  await connectDB();
  
  const metadata = await SpaceMetadata.create({
    spaceId,
    ...data
  });
  
  return { success: true, data: metadata };
}

export async function getSpaceDescription(spaceId) {
  await connectDB();
  
  const metadata = await SpaceMetadata.findOne({ spaceId });
  return metadata;
}

export async function updateSpaceDescription(spaceId, updates) {
  await connectDB();
  
  const metadata = await SpaceMetadata.findOneAndUpdate(
    { spaceId },
    { $set: updates },
    { new: true }
  );
  
  if (!metadata) {
    return { success: false, error: 'Space not found' };
  }
  
  return { success: true, data: metadata };
}
```

5. **Add Environment Variable**:
```bash
# .env.local
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agora?retryWrites=true&w=majority
```

6. **Data Migration Script**:
```javascript
// scripts/migrate-to-mongodb.js
import fs from 'fs';
import connectDB from '../src/lib/mongodb.js';
import SpaceMetadata from '../src/lib/models/SpaceMetadata.js';

async function migrate() {
  await connectDB();
  
  const jsonData = JSON.parse(
    fs.readFileSync('./data/space-descriptions.json', 'utf-8')
  );
  
  for (const [spaceId, data] of Object.entries(jsonData)) {
    await SpaceMetadata.findOneAndUpdate(
      { spaceId },
      { spaceId, ...data },
      { upsert: true, new: true }
    );
    console.log(`Migrated ${spaceId}`);
  }
  
  console.log('Migration complete');
  process.exit(0);
}

migrate();
```

7. **Run Migration**:
```bash
node scripts/migrate-to-mongodb.js
```

## Alternative Storage Solutions

### IPFS (InterPlanetary File System)

**Pros**:
- Decentralized storage
- Content-addressed (immutable)
- Good for large files
- Censorship resistant

**Cons**:
- Need pinning service (Pinata, Infura)
- Slower retrieval than centralized
- Cost for pinning services
- Requires IPFS gateway

**Use Case**: Store large images, documents, or when decentralization is critical.

### Arweave

**Pros**:
- Permanent storage
- One-time payment
- Decentralized
- Good for archives

**Cons**:
- Higher upfront cost
- Cannot delete/update
- Slower retrieval
- Complex integration

**Use Case**: Permanent records, historical data, immutable documents.

### AWS S3 / Cloud Storage

**Pros**:
- Highly scalable
- Fast retrieval
- Global CDN
- Mature tooling

**Cons**:
- Centralized
- Ongoing costs
- Vendor lock-in
- Privacy concerns

**Use Case**: Production deployments with high traffic, need for CDN.

## Security Considerations

### Access Control

**Current Implementation**:
- UI-level restrictions (owner/admin check)
- No server-side authentication

**Recommended Enhancements**:
1. **Signature Verification**:
```javascript
// Verify that request comes from space owner
const message = `Update space ${spaceId}`;
const signature = await signer.signMessage(message);
// Send signature with request
// Server verifies signature matches owner address
```

2. **Rate Limiting**:
```javascript
// Prevent spam/abuse
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

3. **Input Validation**:
```javascript
// Sanitize user input
import validator from 'validator';

if (!validator.isLength(description, { max: 500 })) {
  throw new Error('Description too long');
}

if (logo && !validator.isDataURI(logo)) {
  throw new Error('Invalid logo format');
}
```

### Data Privacy

- Space descriptions are **public** by default
- Consider encryption for sensitive data
- Logos should not contain personal information
- Store minimal PII (Personally Identifiable Information)

### Backup Strategy

**JSON File Storage**:
- Git version control provides history
- Manual backups before deployments
- Consider automated backups to cloud storage

**MongoDB**:
- Configure replica sets (3+ nodes)
- Automated daily backups
- Point-in-time recovery
- Off-site backup storage

## Performance Optimization

### Caching

**Client-Side**:
- React Query caching (5 minutes default)
- Service Worker for offline access
- IndexedDB for persistent cache

**Server-Side**:
- Redis for frequently accessed data
- CDN for static assets (logos)
- Database query optimization

### Image Optimization

**Current**: Base64 encoding increases size by ~33%

**Alternatives**:
1. **Separate image storage** (S3/CDN)
2. **Image compression** before base64
3. **WebP format** for smaller sizes
4. **Responsive images** (multiple sizes)

**Implementation Example**:
```javascript
// Compress before converting to base64
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 200,
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
// Then convert to base64
```

## Monitoring & Analytics

### Recommended Metrics

- API response times
- Storage size growth
- Failed upload attempts
- Most active spaces
- Logo format distribution

### Tools

- **Application Performance**: Vercel Analytics, New Relic
- **Error Tracking**: Sentry
- **Logs**: Logtail, Papertrail
- **Database**: MongoDB Atlas monitoring

## Future Enhancements

### Planned Features

1. **Rich Text Descriptions**
   - Markdown support
   - Syntax highlighting
   - Link previews

2. **Multiple Images**
   - Cover photos
   - Gallery for proposals
   - Member avatars

3. **Media Library**
   - Reusable assets
   - Versioning
   - Organization folders

4. **Search & Discovery**
   - Full-text search
   - Tag system
   - Category filters

5. **Audit Log**
   - Track all metadata changes
   - Show edit history
   - Revert capabilities

### Technical Roadmap

- [ ] Migrate to MongoDB
- [ ] Implement signature verification
- [ ] Add rate limiting
- [ ] Set up automated backups
- [ ] Implement CDN for images
- [ ] Add compression pipeline
- [ ] Create admin dashboard
- [ ] Add analytics tracking
- [ ] Implement search functionality
- [ ] Build migration tools

## Troubleshooting

### Common Issues

**Issue**: "Space description not found"
- Check if space was created successfully on blockchain
- Verify spaceId matches ENS name
- Check API endpoint is accessible

**Issue**: "Logo not displaying"
- Verify file size < 2MB
- Check base64 format is valid
- Ensure image format is supported
- Check browser console for errors

**Issue**: "Cannot update description"
- Verify user is space owner or admin
- Check wallet is connected
- Ensure spaceId exists in database
- Check API response for errors

### Debug Mode

Enable detailed logging:
```javascript
// .env.local
DEBUG=true
LOG_LEVEL=debug
```

### Support

For issues or questions:
- GitHub Issues: [agora_monorepo/issues](https://github.com/ElioMargiotta/agora_monorepo/issues)
- Documentation: [docs/](../docs/)
- Community: Discord/Telegram (add links)
