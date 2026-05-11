import os
import re

def check_missing_imports():
    components_dir = r"c:\Users\Besitzer\scout-app\src\components"
    pattern = re.compile(r"<AnimatePresence")
    import_pattern = re.compile(r"import\s+{.*AnimatePresence.*}\s+from\s+['\"]framer-motion['\"]")

    for root, dirs, files in os.walk(components_dir):
        for file in files:
            if file.endswith(".jsx"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if pattern.search(content) and not import_pattern.search(content):
                        print(f"MISSING IMPORT in {path}")

if __name__ == "__main__":
    check_missing_imports()
