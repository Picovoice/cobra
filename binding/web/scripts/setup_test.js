const fs = require('fs');
const { join } = require('path');

console.log('Copying the cobra resources...');

const fixturesDirectory = join(__dirname, '..', 'cypress', 'fixtures');

const sourceDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "res",
);

try {
  fs.mkdirSync(join(fixturesDirectory, 'audio_samples'), { recursive: true });
  fs.readdirSync(join(sourceDirectory, 'audio')).forEach(file => {
    fs.copyFileSync(join(sourceDirectory, 'audio', file), join(fixturesDirectory, 'audio_samples', file));
  });
} catch (error) {
  console.error(error);
}

console.log('... Done!');
