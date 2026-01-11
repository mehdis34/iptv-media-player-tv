const { withMainActivity } = require('@expo/config-plugins');

const KEYEVENT_IMPORTS = [
  'import android.view.KeyEvent',
  'import com.github.kevinejohn.keyevent.KeyEventModule',
];

const KEYEVENT_BLOCK = `
  // @generated begin keyevent (DO NOT MODIFY)
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
      KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)
      return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
      KeyEventModule.getInstance().onKeyUpEvent(keyCode, event)
      return super.onKeyUp(keyCode, event)
  }

  override fun onKeyMultiple(keyCode: Int, repeatCount: Int, event: KeyEvent): Boolean {
      KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event)
      return super.onKeyMultiple(keyCode, repeatCount, event)
  }
  // @generated end keyevent
`;

const addImports = (contents) => {
  if (KEYEVENT_IMPORTS.every((line) => contents.includes(line))) {
    return contents;
  }
  const lines = contents.split('\n');
  const lastImportIndex = lines.reduce((index, line, current) => {
    return line.startsWith('import ') ? current : index;
  }, -1);
  if (lastImportIndex >= 0) {
    const toAdd = KEYEVENT_IMPORTS.filter((line) => !contents.includes(line));
    lines.splice(lastImportIndex + 1, 0, ...toAdd);
    return lines.join('\n');
  }
  return contents;
};

const addKeyEventOverrides = (contents) => {
  if (contents.includes('@generated begin keyevent')) {
    return contents;
  }
  const classEndIndex = contents.lastIndexOf('}');
  if (classEndIndex === -1) {
    return contents;
  }
  const before = contents.slice(0, classEndIndex).trimEnd();
  const after = contents.slice(classEndIndex);
  return `${before}\n${KEYEVENT_BLOCK}\n${after}`;
};

module.exports = function withKeyEvent(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    contents = addImports(contents);
    contents = addKeyEventOverrides(contents);
    config.modResults.contents = contents;
    return config;
  });
};
