const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'react-native-vlc-media-player', 'expo', 'android', 'withGradleTasks.js');
const androidGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
const anchorOld = /anchor: \/applyNativeModulesAppBuildGradle\\(project\\)/i;
const anchorNew = 'anchor: /apply plugin: "com\\.facebook\\.react"/i,';
const lockBlockOld = `java.nio.file.Path notNeededDirectory = it.externalLibNativeLibs
                            .getFiles()
                            .stream()
                            .filter(file -> file.toString().contains("$\{rnJetifierName}"))
                            .findAny()
                            .orElse(null)
                            .toPath();
                    java.nio.file.Files.walk(notNeededDirectory).forEach(file -> {
                        if (file.toString().contains("libc++_shared.so")) {
                            java.nio.file.Files.delete(file);
                        }
                    });`;
const lockBlockNew = `java.nio.file.Path notNeededDirectory = it.externalLibNativeLibs
                            .getFiles()
                            .stream()
                            .filter(file -> file.toString().contains("$\{rnJetifierName}"))
                            .findAny()
                            .orElse(null);
                    if (notNeededDirectory != null) {
                        java.nio.file.Files.walk(notNeededDirectory.toPath()).forEach(file -> {
                            if (file.toString().contains("libc++_shared.so")) {
                                java.nio.file.Files.delete(file);
                            }
                        });
                    }`;

try {
  let content = fs.readFileSync(filePath, 'utf8');
  if (anchorOld.test(content) && !content.includes(anchorNew)) {
    content = content.replace(anchorOld, anchorNew);
    console.log('✅ Applied VLC plugin gradle anchor patch');
  }
  if (content.includes(lockBlockOld) && !content.includes(lockBlockNew)) {
    content = content.replace(lockBlockOld, lockBlockNew);
    console.log('✅ Added null-check around VLC native cleanup');
  }
  fs.writeFileSync(filePath, content, 'utf8');

  if (fs.existsSync(androidGradlePath)) {
    let gradle = fs.readFileSync(androidGradlePath, 'utf8');
    const blockRegex =
      /(\/\/ @generated begin withVlcMediaPlayer[^\n]*\n)[\s\S]*?(\/\/ @generated end withVlcMediaPlayer)/;
    if (blockRegex.test(gradle)) {
      if (!gradle.includes('if (notNeededDirectory != null)')) {
        const jetifierMatch = gradle.match(/contains\\(\"([^\"]+)\"\\)/);
        const jetifierName = jetifierMatch?.[1] ?? 'jetified-react-android';
        const safeBody = `tasks.whenTaskAdded((tas -> {\n        // when task is 'mergeLocalDebugNativeLibs' or 'mergeLocalReleaseNativeLibs'\n        if (tas.name.contains(\"merge\") && tas.name.contains(\"NativeLibs\")) {\n            tasks.named(tas.name) {it\n                doFirst {\n                    java.nio.file.Path notNeededDirectory = it.externalLibNativeLibs\n                            .getFiles()\n                            .stream()\n                            .filter(file -> file.toString().contains(\"${jetifierName}\"))\n                            .findAny()\n                            .orElse(null);\n                    if (notNeededDirectory != null) {\n                        java.nio.file.Files.walk(notNeededDirectory.toPath()).forEach(file -> {\n                            if (file.toString().contains(\"libc++_shared.so\")) {\n                                java.nio.file.Files.delete(file);\n                            }\n                        });\n                    }\n                }\n            }\n        }\n    }))`;
        gradle = gradle.replace(blockRegex, `$1${safeBody}\n$2`);
        fs.writeFileSync(androidGradlePath, gradle, 'utf8');
        console.log('✅ Patched generated android/app/build.gradle VLC block');
      }
    }
  }
} catch (error) {
  console.error('⚠️ Failed to patch react-native-vlc-media-player plugin:', error.message);
  process.exitCode = 1;
}
