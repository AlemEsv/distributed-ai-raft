import time
import random
import threading
import os
import json
from datetime import datetime
from tcp_client import AIClient
from statistics import mean, median, stdev

# Variables globales para configuración
NUM_SEQ = 100
NUM_CONC = 500
THREADS = 50

results = {'sequential': {'success': 0, 'errors': 0, 'times': []}, 
           'concurrent': {'success': 0, 'errors': 0, 'times': []}}
lock = threading.Lock()

def run_sequential(num_requests=100, model_id="test_model"):
    global NUM_SEQ
    NUM_SEQ = num_requests
    print(f"Secuencial: {NUM_SEQ} peticiones (Modelo: {model_id})\n")
    client, success, errors, times = AIClient(), 0, 0, []
    start = time.time()
    
    for i in range(NUM_SEQ):
        t0 = time.time()
        try:
            resp = client.predict(model_id, [random.random() for _ in range(784)])
            times.append((time.time() - t0) * 1000)
            if resp.get('success'):
                success += 1
            else:
                errors += 1
        except:
            errors += 1
    
    duration = time.time() - start
    
    stats = {
        'total': NUM_SEQ,
        'success': success,
        'errors': errors,
        'duration': duration,
        'throughput': NUM_SEQ / duration if duration > 0 else 0,
        'avg_time': mean(times) if times else 0,
        'median_time': median(times) if times else 0,
        'min_time': min(times) if times else 0,
        'max_time': max(times) if times else 0
    }
    
    results['sequential'] = stats
    return stats

def worker(wid, n, model_id):
    client = AIClient()
    for i in range(n):
        t0 = time.time()
        try:
            resp = client.predict(model_id, [random.random() for _ in range(784)])
            rt = (time.time() - t0) * 1000
            with lock:
                if resp.get('success'):
                    results['concurrent']['success'] += 1
                    results['concurrent']['times'].append(rt)
                else:
                    results['concurrent']['errors'] += 1
        except:
            with lock:
                results['concurrent']['errors'] += 1
    client.close()

def run_concurrent(num_requests=500, num_threads=50, model_id="test_model"):
    global NUM_CONC, THREADS
    NUM_CONC = num_requests
    THREADS = num_threads
    
    print(f"Concurrente: {NUM_CONC} peticiones / {THREADS} threads (Modelo: {model_id})\n")
    results['concurrent'] = {'success': 0, 'errors': 0, 'times': []}
    per_thread = max(1, NUM_CONC // THREADS)
    
    threads = [threading.Thread(target=worker, args=(i, per_thread, model_id)) for i in range(THREADS)]
    
    start = time.time()
    for t in threads:
        t.start()
    
    for t in threads:
        t.join()
    
    duration = time.time() - start
    times = results['concurrent']['times']
    success = results['concurrent']['success']
    errors = results['concurrent']['errors']
    
    stats = {
        'total': NUM_CONC,
        'success': success,
        'errors': errors,
        'duration': duration,
        'throughput': NUM_CONC / duration if duration > 0 else 0,
        'avg_time': mean(times) if times else 0,
        'median_time': median(times) if times else 0,
        'min_time': min(times) if times else 0,
        'max_time': max(times) if times else 0
    }
    
    results['concurrent'].update(stats)
    return stats

def print_results(name, success, errors, times, dur, total):
    print(f"{name}\n")
    print(f"Total: {total} | Exitosas: {success} ({success/total*100:.1f}%) | Fallidas: {errors}")
    print(f"Tiempo: {dur:.2f}s | Throughput: {total/dur:.2f} req/s")
    if times:
        print(f"Response: Avg={mean(times):.1f}ms Med={median(times):.1f}ms Min={min(times):.1f}ms Max={max(times):.1f}ms")

def save_report():
    report = {
        'timestamp': datetime.now().isoformat(),
        'sequential': {
            'requests': NUM_SEQ,
            'success': results['sequential']['success'],
            'errors': results['sequential']['errors'],
            'duration': results['sequential'].get('duration', 0),
            'avg_ms': mean(results['sequential']['times']) if results['sequential']['times'] else 0
        },
        'concurrent': {
            'requests': NUM_CONC,
            'threads': THREADS,
            'success': results['concurrent']['success'],
            'errors': results['concurrent']['errors'],
            'duration': results['concurrent'].get('duration', 0),
            'avg_ms': mean(results['concurrent']['times']) if results['concurrent']['times'] else 0
        }
    }
    filename = f"stress_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\nReporte guardado en: {filename}")

if __name__ == "__main__":
    print(f"Stress test")
    run_sequential()
    time.sleep(1)
    run_concurrent()
    
    total = NUM_SEQ + NUM_CONC
    success = results['sequential']['success'] + results['concurrent']['success']
    print(f"\nResumen: {total} peticiones | {success} exitosas ({success/total*100:.1f}%)\n{'='*60}")
    save_report()
