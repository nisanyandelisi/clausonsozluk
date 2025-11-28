import os
import json
import psycopg2

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'clauson_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

def export_data():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Veriler çekiliyor...")
        # Frontend için gerekli tüm alanları çek
        cursor.execute("""
            SELECT 
                id, 
                word, 
                word_normalized, 
                search_keywords, 
                meaning, 
                etymology_type, 
                occurrence_number,
                full_entry_text
            FROM words 
            ORDER BY word_normalized, word
        """)
        
        columns = [desc[0] for desc in cursor.description]
        results = []
        
        for row in cursor.fetchall():
            item = dict(zip(columns, row))
            # Varyantları al
            cursor.execute("SELECT variant FROM variants WHERE word_id = %s", (item['id'],))
            variants = [r[0] for r in cursor.fetchall()]
            item['variants'] = variants
            results.append(item)
            
        # JSON olarak kaydet (Frontend'in public klasörüne)
        output_path = 'frontend/public/dictionary_data.json'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, separators=(',', ':')) # Minified
            
        print(f"✅ Veriler {output_path} dosyasına aktarıldı. ({len(results)} kayıt)")
        conn.close()
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        exit(1)

if __name__ == "__main__":
    export_data()
