import { copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "node_modules/react-native-android-widget");

if (!existsSync(lib)) process.exit(0);

copyFileSync(
  join(root, "patches/files/RNWidgetUtil.java"),
  join(lib, "android/src/main/java/com/reactnativeandroidwidget/RNWidgetUtil.java"),
);

copyFileSync(
  join(root, "patches/files/rn_widget.xml"),
  join(lib, "android/src/main/res/layout/rn_widget.xml"),
);

console.log("✓ react-native-android-widget patched");
