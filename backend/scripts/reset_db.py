import os
import psycopg2

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'clauson_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

def reset_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Dropping tables...")
        cursor.execute("DROP TABLE IF EXISTS variants, words CASCADE;")
        
        print("Applying schema...")
        with open('backend/database/schema.sql', 'r') as f:
            schema = f.read()
            cursor.execute(schema)
            
        print("Database reset successfully.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

if __name__ == "__main__":
    reset_db()
