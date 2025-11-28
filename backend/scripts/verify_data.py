import os
import psycopg2
from tabulate import tabulate

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'clauson_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

def verify_data():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("\n=== 1. Normalizasyon Kontrolü (Özel Karakterler) ===")
    examples = ['1 a:ğ-', '2 a:ğ-', 'ḏamat', 'öçe:-', '1 ö:ç', 'ñ', 'ŋ']
    print(f"Test Kelimeleri: {examples}")
    
    # Veritabanında bu kelimeleri bulmaya çalışalım (LIKE ile)
    # Not: Tam eşleşme olmayabilir, benzerlerini bulalım
    cursor.execute("""
        SELECT word, word_normalized, search_keywords 
        FROM words 
        WHERE word LIKE '%a:ğ-%' OR word LIKE '%ḏamat%' OR word LIKE '%öçe:-%' OR word LIKE '%ö:ç%'
        LIMIT 10
    """)
    rows = cursor.fetchall()
    print(tabulate(rows, headers=['Orijinal', 'Normalize', 'Keywords'], tablefmt='grid'))

    print("\n=== 2. Sıralama Kontrolü (ağ örnekleri) ===")
    cursor.execute("""
        SELECT word, word_normalized 
        FROM words 
        WHERE word_normalized = 'ag' 
        ORDER BY word_normalized, word
    """)
    rows = cursor.fetchall()
    print(tabulate(rows, headers=['Orijinal', 'Normalize'], tablefmt='grid'))

    print("\n=== 3. Etimoloji Kontrolü ===")
    cursor.execute("""
        SELECT word, etymology_type 
        FROM words 
        WHERE etymology_type LIKE '%Derived%' OR etymology_type LIKE '%Verbum Unicum%'
        LIMIT 5
    """)
    rows = cursor.fetchall()
    print(tabulate(rows, headers=['Kelime', 'Etimoloji'], tablefmt='grid'))

    print("\n=== 4. Arama Fonksiyonu Testi (search_words) ===")
    search_terms = ['ag', 'damat', 'otenc', 'ötünç']
    for term in search_terms:
        print(f"\nArama: '{term}'")
        cursor.execute("SELECT * FROM search_words(%s, 'turkish', 0.3, 3)", (term,))
        results = cursor.fetchall()
        # id, word, meaning, etym, occ, score, type
        display_results = [(r[1], r[6], r[5]) for r in results]
        print(tabulate(display_results, headers=['Kelime', 'Tip', 'Skor'], tablefmt='simple'))

    conn.close()

if __name__ == "__main__":
    verify_data()
