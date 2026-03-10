const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String, // e.g., 'Web Development', 'Graphic Design'
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed', 'cancelled'],
      default: 'open',
    },
    client: { // The admin or external client who posted the project
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: { // The student who is working on the project
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    requirements: [{ type: String }],
    attachments: [{ type: String }], // URLs to files
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
