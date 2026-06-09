const fs = require('fs');
const path = 'C:/Users/moham/FlutterProjects/library-app-rn/src/app/profile.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(
  "import { Colors } from '../constants/theme';",
  "import { Colors } from '../constants/theme';\nimport { useTheme } from '../constants/ThemeContext';"
);

// Replace component body start to extract useTheme hook
content = content.replace(
  "export default function ProfileScreen() {",
  "export default function ProfileScreen() {\n  const { theme, activeTheme } = useTheme();\n  const styles = createStyles(theme, activeTheme);"
);

// Replace static style usages
content = content.replace(/Colors\.light/g, 'theme');

// Replace stylesheet declaration
content = content.replace(
  "const styles = StyleSheet.create(",
  "const createStyles = (theme, activeTheme) => StyleSheet.create("
);

// We need to add the closing parenthesis to the stylesheet wrapper
content = content.trim();
if (content.endsWith('});')) {
  content = content.substring(0, content.length - 3) + '});\n};';
} else {
  // safe fallback replacement
  content = content.replace(/\n\}\);\s*$/, '\n});\n};');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated profile.jsx with theme support!');
