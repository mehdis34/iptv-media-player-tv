const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distTarget = path.join(
  projectRoot,
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'components.js',
);
const srcTarget = path.join(
  projectRoot,
  'node_modules',
  'react-native-css-interop',
  'src',
  'runtime',
  'components.ts',
);
const expoImageTarget = path.join(
  projectRoot,
  'node_modules',
  'expo-image',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'image',
  'okhttp',
  'GlideUrlWrapperLoader.kt',
);

const patchDist = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original.replace(
    /\n?\(0, api_1\.cssInterop\)\(react_native_1\.SafeAreaView, \{ className: "style" \}\);\n?/,
    '\n',
  );

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  }

  return false;
};

const patchSrc = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = content.replace(/\n\s*SafeAreaView,\n/, '\n');
  content = content.replace(
    /\ncssInterop\(SafeAreaView, \{ className: "style" \}\);\n/,
    '\n',
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
};

const distPatched = patchDist(distTarget);
const srcPatched = patchSrc(srcTarget);
const patchExpoImage = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original.replace(
    'ProgressResponseBody(originalResponse.body)',
    'ProgressResponseBody(requireNotNull(originalResponse.body))',
  );

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  }

  return false;
};

const expoImagePatched = patchExpoImage(expoImageTarget);

if (distPatched || srcPatched) {
  console.log('Patched react-native-css-interop to avoid deprecated SafeAreaView.');
}

if (expoImagePatched) {
  console.log('Patched expo-image to satisfy Kotlin nullability for OkHttp.');
}
