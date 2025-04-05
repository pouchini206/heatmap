// index.js
const express = require('express');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Create a static directory to serve processed images
const staticDir = path.join(__dirname, 'static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir);
}
app.use('/static', express.static(staticDir));

app.post('/process', async (req, res) => {
  const { screenshot_url } = req.body;
  if (!screenshot_url) {
    return res.status(400).json({ error: 'screenshot_url is required' });
  }

  try {
    // 1. Download the screenshot image
    const response = await fetch(screenshot_url);
    if (!response.ok) {
      throw new Error('Failed to download image');
    }
    const buffer = await response.buffer();
    const image = await loadImage(buffer);

    // Save the downloaded image to a temporary file for the Python script
    const tempImagePath = path.join(staticDir, `temp_${uuidv4()}.png`);
    fs.writeFileSync(tempImagePath, buffer);

    // 2. Call the Python LayoutParser script to detect UI elements
    exec(`python layout_parser.py "${tempImagePath}"`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`LayoutParser error: ${error}`);
        // Remove the temp image file before returning an error
        fs.unlinkSync(tempImagePath);
        return res.status(500).json({ error: 'LayoutParser detection failed' });
      }

      let detections;
      try {
        detections = JSON.parse(stdout);
      } catch (e) {
        fs.unlinkSync(tempImagePath);
        return res.status(500).json({ error: 'Failed to parse LayoutParser output' });
      }

      // 3. Create the main canvas and draw the original screenshot
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      // 4. Create a separate heat canvas for drawing gradients
      const heatCanvas = createCanvas(image.width, image.height);
      const heatCtx = heatCanvas.getContext('2d');

      // 5. For each detected UI element, draw a radial gradient
      detections.forEach(det => {
        const centerX = det.x + det.width / 2;
        const centerY = det.y + det.height / 2;
        const radius = Math.max(det.width, det.height) * 0.75; // Increase radius for a broader effect

        const gradient = heatCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');   // Strong red at center
        gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.5)'); // Orange in the middle
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');     // Transparent at the edge

        heatCtx.fillStyle = gradient;
        heatCtx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      });

      // 6. Overlay the heat canvas on top of the original image with transparency
      ctx.globalAlpha = 0.6;
      ctx.drawImage(heatCanvas, 0, 0);
      ctx.globalAlpha = 1.0;

      // 7. Save the resulting image to the static directory
      const filename = `${uuidv4()}.png`;
      const filepath = path.join(staticDir, filename);
      const out = fs.createWriteStream(filepath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      
      out.on('finish', () => {
        // Remove the temporary image file
        fs.unlinkSync(tempImagePath);
        res.json({ heatmap_url: `/static/${filename}` });
      });
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
