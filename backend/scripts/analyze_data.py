import json
import os
from pathlib import Path
from collections import Counter

def analyze_data():
    data_dir = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[2] / "Datas")).resolve()
    all_chars = Counter()
    etymology_types = Counter()
    
    print(f"Scanning {data_dir}...")
    
    for file_path in data_dir.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            for entry in data:
                word = entry.get("word", "")
                etymology = entry.get("etymology_type", "")
                
                # Count characters in word
                for char in word:
                    all_chars[char] += 1
                    
                # Count etymology types
                if etymology:
                    etymology_types[etymology] += 1
                    
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    print("\n=== Unique Characters in 'word' field ===")
    for char, count in sorted(all_chars.items()):
        print(f"'{char}': {count} (U+{ord(char):04X})")

    print("\n=== Etymology Types ===")
    for etym, count in etymology_types.most_common():
        print(f"'{etym}': {count}")

if __name__ == "__main__":
    analyze_data()
