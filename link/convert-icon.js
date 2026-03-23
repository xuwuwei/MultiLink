const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'icon.svg');
const icoOutput = path.join(__dirname, 'src-tauri', 'icons', 'icon.ico');
const pngOutput = path.join(__dirname, 'src-tauri', 'icons', 'icon.png');
const rootIcoOutput = path.join(__dirname, 'icon.ico');

async function convertIcon() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate PNG at 512x512 for tray icon
    console.log('Generating icon.png (512x512)...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(pngOutput);
    console.log('✓ Created icon.png');

    // Generate multiple sizes for ICO
    const sizes = [256, 128, 64, 48, 32, 16];
    const buffers = [];

    for (const size of sizes) {
      console.log(`Generating ${size}x${size}...`);
      const buffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      buffers.push({ size, buffer });
    }

    // Create ICO file manually
    // ICO format: header (6 bytes) + directory entries (16 bytes each) + image data
    const icoBuffer = createIco(buffers);

    fs.writeFileSync(icoOutput, icoBuffer);
    console.log('✓ Created src-tauri/icons/icon.ico');

    // Also copy to root for console version
    fs.writeFileSync(rootIcoOutput, icoBuffer);
    console.log('✓ Created icon.ico (root)');

    console.log('\nAll icons generated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function createIco(images) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;

  let offset = headerSize + dirEntrySize * numImages;
  const imageData = [];

  // Calculate total size
  let totalSize = offset;
  for (const img of images) {
    totalSize += img.buffer.length;
  }

  const icoBuffer = Buffer.alloc(totalSize);

  // ICO header
  icoBuffer.writeUInt16LE(0, 0);  // Reserved
  icoBuffer.writeUInt16LE(1, 2);  // Type: ICO
  icoBuffer.writeUInt16LE(numImages, 4);  // Count

  // Directory entries
  let dirOffset = headerSize;
  let dataOffset = offset;

  for (const img of images) {
    const { size, buffer } = img;
    icoBuffer.writeUInt8(size > 255 ? 0 : size, dirOffset);  // Width
    icoBuffer.writeUInt8(size > 255 ? 0 : size, dirOffset + 1);  // Height
    icoBuffer.writeUInt8(0, dirOffset + 2);  // Color palette
    icoBuffer.writeUInt8(0, dirOffset + 3);  // Reserved
    icoBuffer.writeUInt16LE(1, dirOffset + 4);  // Color planes
    icoBuffer.writeUInt16LE(32, dirOffset + 6);  // Bits per pixel
    icoBuffer.writeUInt32LE(buffer.length, dirOffset + 8);  // Image size
    icoBuffer.writeUInt32LE(dataOffset, dirOffset + 12);  // Offset

    // Copy image data
    buffer.copy(icoBuffer, dataOffset);

    dataOffset += buffer.length;
    dirOffset += dirEntrySize;
  }

  return icoBuffer;
}

convertIcon();
