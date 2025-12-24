import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// ES Module __dirname equivalent
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✓ Loaded environment variables from .env.local\n');
} else {
  console.log('⚠️  No .env.local file found, using system environment variables\n');
}

// MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  console.log('Please set MONGODB_URI in your environment:');
  console.log('  export MONGODB_URI="mongodb+srv://..."');
  console.log('  or add it to .env.local');
  process.exit(1);
}

// Define schema inline (avoid import issues with ES modules)
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
  timestamps: true
});

const SpaceMetadata = mongoose.models.SpaceMetadata || 
  mongoose.model('SpaceMetadata', SpaceMetadataSchema);

async function migrate() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Path to JSON file
    const jsonPath = path.join(__dirname, '../data/space-descriptions.json');
    
    // Check if JSON file exists
    if (!fs.existsSync(jsonPath)) {
      console.log('ℹ️  No JSON file found at:', jsonPath);
      console.log('Nothing to migrate.');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Read JSON data
    console.log('📖 Reading JSON file...');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const spaceCount = Object.keys(jsonData).length;
    console.log(`Found ${spaceCount} spaces to migrate\n`);
    
    // Migrate each space
    let migrated = 0;
    let errors = 0;
    
    for (const [spaceId, data] of Object.entries(jsonData)) {
      try {
        await SpaceMetadata.findOneAndUpdate(
          { spaceId },
          { 
            spaceId, 
            ensName: data.ensName,
            description: data.description || '',
            logo: data.logo || '',
            createdBy: data.createdBy,
            txHash: data.txHash,
            // Preserve original timestamps if they exist
            ...(data.createdAt && { createdAt: new Date(data.createdAt) }),
            ...(data.updatedAt && { updatedAt: new Date(data.updatedAt) })
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );
        console.log(`✓ Migrated: ${spaceId} (${data.ensName})`);
        migrated++;
      } catch (err) {
        console.error(`✗ Failed to migrate ${spaceId}:`, err.message);
        errors++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`  Total spaces: ${spaceCount}`);
    console.log(`  ✓ Migrated: ${migrated}`);
    console.log(`  ✗ Errors: ${errors}`);
    console.log('='.repeat(50));
    
    // Verify
    const count = await SpaceMetadata.countDocuments();
    console.log(`\n✓ Verification: ${count} documents in MongoDB\n`);
    
    if (errors === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Verify data in MongoDB');
      console.log('  2. Test the application');
      console.log('  3. Archive the JSON file:');
      console.log(`     mv ${jsonPath} ${jsonPath}.archived`);
    } else {
      console.log('⚠️  Migration completed with errors');
      console.log('Please review the errors above and retry failed migrations');
    }
    
    await mongoose.disconnect();
    process.exit(errors > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
console.log('🚀 Starting migration from JSON to MongoDB...\n');
migrate();
