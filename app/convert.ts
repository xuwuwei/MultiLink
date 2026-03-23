import fs from 'fs';
import path from 'path';

const files = ['public/keyboard.mp3', 'public/keyboard2.mp3', 'public/keyboard3.mp3'];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    console.log(`--- ${file} ---`);
    console.log(buffer.toString('base64'));
  } else {
    console.log(`--- ${file} NOT FOUND ---`);
  }
});
