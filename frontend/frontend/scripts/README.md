# Database Migration Scripts

## MongoDB Migration Script

### Purpose
Migrates space metadata from JSON file storage (`data/space-descriptions.json`) to MongoDB.

### Prerequisites
- MongoDB instance running (local or Atlas)
- `MONGODB_URI` environment variable set
- Mongoose package installed (`npm install`)

### Usage

1. **Set MongoDB URI**:
```bash
export MONGODB_URI="your creditentials"
# or use .env.local file
```

2. **Backup existing data** (recommended):
```bash
cp data/space-descriptions.json data/space-descriptions.backup.json
```

3. **Run migration**:
```bash
npm run migrate:mongodb
```

### What It Does

The migration script:
1. Connects to MongoDB using the `MONGODB_URI` environment variable
2. Reads all spaces from `data/space-descriptions.json`
3. Creates or updates documents in the `spacemetadatas` collection
4. Preserves original timestamps (`createdAt`, `updatedAt`)
5. Reports migration results (successes and errors)
6. Verifies the final document count

### Output Example

```
🚀 Starting migration from JSON to MongoDB...

🔌 Connecting to MongoDB...
✓ Connected to MongoDB

📖 Reading JSON file...
Found 3 spaces to migrate

✓ Migrated: myspace (myspace.agora)
✓ Migrated: daotest (daotest.agora)
✓ Migrated: foundation (foundation.agora)

==================================================
Migration Summary:
  Total spaces: 3
  ✓ Migrated: 3
  ✗ Errors: 0
==================================================

✓ Verification: 3 documents in MongoDB

✅ Migration completed successfully!

Next steps:
  1. Verify data in MongoDB
  2. Test the application
  3. Archive the JSON file:
     mv data/space-descriptions.json data/space-descriptions.json.archived
```

### Troubleshooting

**Error: MONGODB_URI environment variable is not set**
- Solution: Set `MONGODB_URI` in your environment or `.env.local` file

**Error: ENOENT: no such file or directory**
- Solution: The JSON file doesn't exist. This is normal for new installations.

**Error: Connection refused**
- Solution: Ensure MongoDB is running (local) or connection string is correct (Atlas)

**Duplicate key error**
- Solution: The space already exists in MongoDB. The migration uses `upsert` to handle this automatically.

### Post-Migration

After successful migration:

1. **Verify data in MongoDB**:
```bash
# Using mongosh
mongosh "your-connection-string" --eval "db.spacemetadatas.find().pretty()"

# Or use MongoDB Compass GUI
```

2. **Test the application**:
```bash
npm run dev
```
Visit http://localhost:3000 and check that space descriptions and logos display correctly.

3. **Archive JSON file**:
```bash
mv data/space-descriptions.json data/space-descriptions.json.archived
```

### Schema

The MongoDB schema matches the JSON structure:

```javascript
{
  spaceId: String (unique, indexed),
  ensName: String,
  description: String (max 500 chars),
  logo: String (base64 data URI),
  createdBy: String (Ethereum address),
  txHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Rollback

To rollback to JSON storage:

1. Restore the backup:
```bash
mv data/space-descriptions.json.archived data/space-descriptions.json
```

2. Revert the storage layer to use JSON (previous version in git history)

Note: This is not recommended after the migration has been deployed to production.
