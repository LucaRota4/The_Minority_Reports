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
    maxlength: 500,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Automatic createdAt/updatedAt
});

export default mongoose.models.SpaceMetadata || 
  mongoose.model('SpaceMetadata', SpaceMetadataSchema);
