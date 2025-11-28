#!/usr/bin/env python3
"""
Clauson Etimoloji Sözlüğü - Veri İmport Scripti
JSON dosyalarını PostgreSQL veritabanına yükler.
Gelişmiş normalizasyon, etimoloji açılımı ve arama anahtarları içerir.
"""
import json
import os
import sys
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple
import psycopg2
from psycopg2.extras import execute_batch

# Veritabanı bağlantı bilgileri
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'clauson_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

# Etimoloji Açılımları
ETYMOLOGY_MAP = {
    'D': 'Derived',
    'Basic': 'Basic',
    'VU': 'Verbum Unicum',
    'S': 'See',
    'F': 'Foreign Loan Word',
    'E': 'Error',
    'PU': 'Problematical/Uncertain',
    'C': 'Chinese',
    'VUD': 'Verbum Unicum, Derived',
    'DF': 'Derived, Foreign',
    'PUD': 'Problematical, Derived',
    'VUF': 'Verbum Unicum, Foreign',
    'PUF': 'Problematical, Foreign',
    'SF': 'See, Foreign',
    'DC': 'Derived, Chinese'
}

def expand_etymology(code: str) -> str:
    """Etimoloji kodunu genişletir"""
    if not code:
        return ''
    
    # Bilinen kodlar
    if code in ETYMOLOGY_MAP:
        return ETYMOLOGY_MAP[code]
    
    # ? işaretli kodlar (örn: ?D -> Derived?)
    clean_code = code.replace('?', '')
    if clean_code in ETYMOLOGY_MAP:
        return f"{ETYMOLOGY_MAP[clean_code]}?"
        
    return code

def normalize_word(word: str) -> str:
    """
    Kelimeyi sıralama ve arama için normalize eder.
    1. Sayıları ve baştaki boşlukları kaldırır.
    2. Özel işaretleri (:, -, *, ?) kaldırır.
    3. Fonetik karakterleri standart Türkçe harflere dönüştürür.
    4. Küçük harfe çevirir.
    """
    if not word:
        return ''

    # 1. Sayıları ve baştaki boşlukları temizle (örn: "1 ağ" -> "ağ")
    # Sadece baştaki sayıları temizliyoruz
    normalized = re.sub(r'^\d+\s*', '', word)

    # 2. Özel işaretleri kaldır
    remove_chars = [':', '-', '*', '?', "'", '(', ')', '[', ']', '/', ',', '.', ';']
    for char in remove_chars:
        normalized = normalized.replace(char, '')

    # 3. Fonetik karakter haritası (Standart Türkçe harfler KORUNUR)
    replacements = {
        'İ': 'i', 'I': 'ı', 
        'ñ': 'n', 'ŋ': 'n',  # n varyantları
        'ḏ': 'd', 'ḍ': 'd',  # d varyantları
        'é': 'e',            # e varyantı
        'ā': 'a', 'ī': 'i', 'ū': 'u', # Uzun ünlüler (varsa)
        ' ': '' # Boşlukları kaldır (bitişik sıralama için)
    }

    normalized = normalized.lower()
    for old, new in replacements.items():
        normalized = normalized.replace(old.lower(), new)

    return normalized

def get_search_keywords(word: str) -> List[str]:
    """
    Çoklu kelime girişleri için arama anahtarlarını oluşturur.
    Örn: "ötenç/1 ötünç" -> ["ötenç", "ötünç"] (normalize edilmiş halleriyle)
    """
    if not word:
        return []
    
    # Slash ile ayrılmış varyantları böl
    parts = word.split('/')
    keywords = []
    
    for part in parts:
        norm = normalize_word(part.strip())
        if norm and norm not in keywords:
            keywords.append(norm)
            
    return keywords

def get_occurrence_number(word: str, word_count: Dict[str, int]) -> int:
    """Kelime için occurrence number'ı hesapla (1 olug, 2 olug, etc.)"""
    # Kelimenin "ana" kısmını al (sayısız hali)
    base_word = re.sub(r'^\d+\s*', '', word).strip()
    word_count[base_word] = word_count.get(base_word, 0) + 1
    return word_count[base_word]

def import_json_files(json_dir: Path, conn) -> Dict[str, Any]:
    """JSON dosyalarını veritabanına yükle"""

    cursor = conn.cursor()
    word_count = {}  # Kelime tekrar sayacı
    stats = {
        'total_files': 0,
        'total_entries': 0,
        'total_variants': 0,
        'errors': []
    }

    # Tüm JSON dosyalarını bul
    json_files = sorted(json_dir.rglob("*.json"))
    print(f"📁 {len(json_files)} JSON dosyası bulundu\n")

    # Her dosyayı işle
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            stats['total_files'] += 1

            # Her kelime girdisini işle
            for entry in data:
                try:
                    word = entry.get('word', '').strip()
                    if not word:
                        continue

                    # Occurrence number'ı hesapla
                    occurrence_num = get_occurrence_number(word, word_count)
                    
                    # Normalizasyon ve Arama Anahtarları
                    # Çoklu kelime varsa (ötenç/ötünç), ilki sıralama için baz alınır
                    primary_word_part = word.split('/')[0].strip()
                    normalized_word = normalize_word(primary_word_part)
                    
                    search_keywords = get_search_keywords(word)
                    
                    # Etimoloji genişletme
                    etym_code = entry.get('etymology_type', '')
                    etym_full = expand_etymology(etym_code)

                    # Kelimeyi ekle
                    # Not: Şema değişikliği gerekecek (normalized_word, search_keywords)
                    # Bu script şimdilik mevcut şemaya uydurarak çalışacak, 
                    # ancak normalized_word'ü word_normalized sütununa yazacağız.
                    cursor.execute("""
                        INSERT INTO words (
                            word, word_normalized, search_keywords, meaning, etymology_type,
                            cross_reference, full_entry_text, occurrence_number
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        word,
                        normalized_word, # word_normalized sütununu kullanıyoruz
                        search_keywords, # Arama anahtarları listesi
                        entry.get('meaning', ''),
                        etym_full, # Genişletilmiş etimoloji
                        entry.get('cross_reference', ''),
                        entry.get('full_entry_text', ''),
                        occurrence_num
                    ))

                    word_id = cursor.fetchone()[0]
                    stats['total_entries'] += 1

                    # Varyantları ekle
                    variants = entry.get('variants', [])
                    if variants:
                        for variant in variants:
                            if variant and variant.strip():
                                cursor.execute("""
                                    INSERT INTO variants (word_id, variant, variant_normalized)
                                    VALUES (%s, %s, %s)
                                """, (
                                    word_id,
                                    variant.strip(),
                                    normalize_word(variant.strip())
                                ))
                                stats['total_variants'] += 1
                    
                    # Arama anahtarlarını varyantlar tablosuna "gizli varyant" olarak ekleyebiliriz
                    # veya ayrı bir tablo gerekebilir. Şimdilik varyantlara ekleyelim ki arama çalışsın.
                    # Ancak bu "search_keywords" listesindeki kelimeler zaten varyantlarda olabilir.
                    # Kontrol edip ekleyelim.
                    for keyword in search_keywords:
                        # Bu keyword zaten ana kelime veya varyant mı?
                        is_existing = (keyword == normalized_word) or \
                                      any(normalize_word(v) == keyword for v in variants)
                        
                        if not is_existing:
                            # Ekstra arama anahtarı olarak varyantlara ekle (görünmez varyant?)
                            # Şimdilik varyant olarak eklemiyoruz, çünkü veri kirliliği yaratabilir.
                            # Kullanıcı "veriyi bozma" dedi.
                            # Arama mantığı backend tarafında normalized_word üzerinden LIKE ile yapılmalı.
                            pass

                    # Her 100 girişte bir commit (performans için)
                    if stats['total_entries'] % 100 == 0:
                        conn.commit()
                        print(f"✓ {stats['total_entries']} giriş işlendi...", end='\r')

                except Exception as e:
                    stats['errors'].append(f"Kelime hatası ({word}): {str(e)}")
                    continue

            # Dosya tamamlandı
            conn.commit()

        except json.JSONDecodeError:
            stats['errors'].append(f"JSON parse hatası: {json_file.name}")
            continue
        except Exception as e:
            stats['errors'].append(f"Dosya hatası ({json_file.name}): {str(e)}")
            continue

    # Son commit
    conn.commit()
    cursor.close()

    return stats

def create_indexes(conn):
    """İndeksleri oluştur (şemada tanımlı)"""
    print("\n📊 İndeksler kontrol ediliyor...")
    cursor = conn.cursor()

    # İndeks sayısını kontrol et
    cursor.execute("""
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename IN ('words', 'variants')
    """)
    index_count = cursor.fetchone()[0]
    print(f"✓ {index_count} indeks bulundu")

    cursor.close()

def print_statistics(conn):
    """Veritabanı istatistiklerini göster"""
    cursor = conn.cursor()

    print("\n" + "=" * 70)
    print("📊 VERİTABANI İSTATİSTİKLERİ")
    print("=" * 70)

    # Temel istatistikler
    # word_statistics view'ı varsa kullan, yoksa manuel hesapla
    try:
        cursor.execute("SELECT * FROM word_statistics")
        stats = cursor.fetchone()
        if stats:
            print(f"\n✓ Benzersiz kelime sayısı: {stats[0]:,}")
            print(f"✓ Toplam giriş sayısı: {stats[1]:,}")
            print(f"✓ Etimoloji tipi sayısı: {stats[2]}")
            print(f"✓ Tekrarlanan kelime sayısı: {stats[3]:,}")
            print(f"✓ Toplam varyant sayısı: {stats[4]:,}")
    except:
        print("\n⚠️  word_statistics view'ı bulunamadı, atlanıyor.")

    # Etimoloji tipi dağılımı
    print(f"\n📚 ETİMOLOJİ TİPİ DAĞILIMI (Top 10):")
    cursor.execute("""
        SELECT etymology_type, COUNT(*) as count
        FROM words
        GROUP BY etymology_type
        ORDER BY count DESC
        LIMIT 10
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]:20s}: {row[1]:4d}")

    # En çok tekrarlanan kelimeler
    print(f"\n🔄 EN ÇOK TEKRARLANAN KELİMELER (Top 5):")
    cursor.execute("""
        SELECT word, MAX(occurrence_number) as max_occurrence
        FROM words
        GROUP BY word
        HAVING MAX(occurrence_number) > 1
        ORDER BY max_occurrence DESC, word
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"   '{row[0]}': {row[1]} kez")

    print("\n" + "=" * 70)

    cursor.close()

def main():
    """Ana fonksiyon"""
    print("=" * 70)
    print("🚀 CLAUSON ETİMOLOJİ SÖZLÜĞÜ - VERİ İMPORT")
    print("=" * 70)
    print()

    # JSON dizini
    default_data_dir = Path(__file__).resolve().parents[2] / "Datas"
    json_dir = Path(os.getenv("DATA_DIR", default_data_dir)).resolve()
    if not json_dir.exists():
        print(f"❌ Hata: {json_dir} bulunamadı!")
        sys.exit(1)

    # Veritabanına bağlan
    try:
        print(f"🔌 Veritabanına bağlanılıyor ({DB_CONFIG['host']}:{DB_CONFIG['port']})...")
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Bağlantı başarılı\n")
    except Exception as e:
        print(f"❌ Veritabanı bağlantı hatası: {e}")
        print("\n💡 İpucu: PostgreSQL'in çalıştığından ve DB_CONFIG'in doğru olduğundan emin olun")
        sys.exit(1)

    try:
        # Mevcut verileri temizle
        print("🗑️  Mevcut veriler temizleniyor...")
        cursor = conn.cursor()
        cursor.execute("TRUNCATE words, variants RESTART IDENTITY CASCADE")
        conn.commit()
        cursor.close()
        print("✓ Temizlendi\n")

        # JSON dosyalarını import et
        print("📥 JSON dosyaları import ediliyor...")
        stats = import_json_files(json_dir, conn)

        print(f"\n\n✅ Import tamamlandı!")
        print(f"   Dosya sayısı: {stats['total_files']}")
        print(f"   Giriş sayısı: {stats['total_entries']:,}")
        print(f"   Varyant sayısı: {stats['total_variants']:,}")

        if stats['errors']:
            print(f"\n⚠️  {len(stats['errors'])} hata oluştu:")
            for error in stats['errors'][:5]:  # İlk 5 hatayı göster
                print(f"   - {error}")

        # İndeksleri kontrol et
        create_indexes(conn)

        # İstatistikleri göster
        print_statistics(conn)

    except Exception as e:
        print(f"\n❌ Beklenmeyen hata: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()
        print("\n👋 Bağlantı kapatıldı")

if __name__ == "__main__":
    main()
