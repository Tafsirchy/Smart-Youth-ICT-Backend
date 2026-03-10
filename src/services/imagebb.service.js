const axios = require('axios');
const FormData = require('form-data');

/**
 * Uploads an image buffer to ImageBB
 * @param {Buffer} fileBuffer - The image buffer from multer
 * @returns {Promise<string>} - The URL of the uploaded image
 */
const uploadToImageBB = async (fileBuffer) => {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) throw new Error('IMGBB_API_KEY is missing in env variables');

    const form = new FormData();
    // ImageBB accepts base64 format cleanly
    form.append('image', fileBuffer.toString('base64'));

    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form, {
      headers: form.getHeaders(),
    });

    if (response.data && response.data.data && response.data.data.url) {
      return response.data.data.url;
    }
    throw new Error('Invalid response payload from ImageBB');
  } catch (error) {
    console.error('ImageBB Upload Error:', error.response?.data || error.message);
    throw new Error('Image upload failed');
  }
};

module.exports = { uploadToImageBB };
