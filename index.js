const express = require('express');
const fetch = require('node-fetch'); // Use node-fetch v2.x
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Ensure the static directory exists
const staticDir = path.join(__dirname, 'static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir);
}

// Serve static files from the "static" directory
app.use('/static', express.static(staticDir));

app.post('/process', async (req, res) => {
  const { screenshot_url } = req.body;
  if (!screenshot_url) {
    return res.status(400).json({ error: 'screenshot_url is required' });
  }
  try {
    // Download the screenshot image
    const response = await fetch(screenshot_url);
    if (!response.ok) {
      throw new Error('Failed to download image');
    }
    const buffer = await response.buffer();
    const image = await loadImage(buffer);

    // Create a canvas with the dimensions of the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image on the canvas
    ctx.drawImage(image, 0, 0);

    // Simulate UI element detection (e.g., button and hero areas)
    const detections = [
      {
        // Example: a button in the lower center
        x: image.width * 0.4,
        y: image.height * 0.8,
        width: image.width * 0.2,
        height: image.height * 0.1,
      },
      {
        // Example: a hero section at the top
        x: image.width * 0.1,
        y: image.height * 0.1,
        width: image.width * 0.8,
        height: image.height * 0.3,
      },
    ];

    // Set up drawing properties for the heatmap overlay
    ctx.fillStyle = 'rgba(255,0,0,0.4)'; // Red with 40% opacity
    ctx.shadowColor = 'red';
    ctx.shadowBlur = 20; // Adjust for more/less blur

    // Draw a rectangle for each detected UI element
    detections.forEach((det) => {
      ctx.fillRect(det.x, det.y, det.width, det.height);
    });

    // Save the resulting image to the static directory
    const filename = `${uuidv4()}.png`;
    const filepath = path.join(staticDir, filename);
    const out = fs.createWriteStream(filepath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
      // Return the URL of the generated heatmap image
      res.json({ heatmap_url: `/static/${filename}` });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
