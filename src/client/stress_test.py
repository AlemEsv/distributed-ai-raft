import time
import random
import threading
import os
from tcp_client import AIClient

# Configuración
NUM_REQUESTS = 1000
CONCURRENT_THREADS = 10
TEST_FILE = "stress_test_data.csv"

def create_dummy_file():
    with open(TEST_FILE, "w") as f:
        f.write("0.1,0.2,0.3,0.4\n" * 10)

def run_stress_test():
    print(f"Iniciando prueba de estrés con {NUM_REQUESTS} peticiones...")
    create_dummy_file()
    
    client = AIClient()
    success_count = 0
    error_count = 0
    
    start_time = time.time()
    
    for i in range(NUM_REQUESTS):
        req_type = random.choice(['TRAIN', 'PREDICT'])
        
        try:
            if req_type == 'TRAIN':
                model_name = f"stress_model_{i}"
                resp = client.train_model(model_name, TEST_FILE)
            else:
                model_id = "stress_model_0" # Asumimos que existe o fallará controladamente
                input_vector = [random.random() for _ in range(4)]
                resp = client.predict(model_id, input_vector)
            
            if resp.get('success'):
                success_count += 1
                print(f"[{i+1}/{NUM_REQUESTS}] {req_type} OK")
            else:
                error_count += 1
                print(f"[{i+1}/{NUM_REQUESTS}] {req_type} ERROR: {resp.get('error')}")
                
        except Exception as e:
            error_count += 1
            print(f"[{i+1}/{NUM_REQUESTS}] EXCEPTION: {e}")
            
        # Pequeña pausa para no saturar mi propia máquina de desarrollo si es necesario
        # time.sleep(0.01)

    end_time = time.time()
    duration = end_time - start_time
    
    print("\n=== RESULTADOS DE ESTRÉS ===")
    print(f"Total Peticiones: {NUM_REQUESTS}")
    print(f"Exitosas: {success_count}")
    print(f"Fallidas: {error_count}")
    print(f"Tiempo Total: {duration:.2f}s")
    print(f"Rendimiento: {NUM_REQUESTS/duration:.2f} req/s")
    
    client.close()
    if os.path.exists(TEST_FILE):
        os.remove(TEST_FILE)

if __name__ == "__main__":
    run_stress_test()
