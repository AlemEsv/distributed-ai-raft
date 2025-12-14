import time
import random
import threading
import os
import json
from datetime import datetime
from tcp_client import AIClient
from statistics import mean, median, stdev

NUM_SEQ = 100
NUM_CONC = 500
THREADS = 50
MNIST = os.path.join(os.path.dirname(__file__), '../core/datasets/mnist/mnist.csv')

results = {'sequential': {'success': 0, 'errors': 0, 'times': []}, 
           'concurrent': {'success': 0, 'errors': 0, 'times': []}}
lock = threading.Lock()

def run_sequential():
    print(f"Secuencial: {NUM_SEQ} peticiones\n")
    client, success, errors, times = AIClient(), 0, 0, []
    start = time.time()
    
    for i in range(NUM_SEQ):
        t0 = time.time()
        try:
            resp = client.predict("test_model", [random.random() for _ in range(784)])
            times.append((time.time() - t0) * 1000)
            if resp.get('success'):
                success += 1
                if (i + 1) % 20 == 0:
                    print(f"[{i+1}/{NUM_SEQ}] Avg: {mean(times[-20:]):.1f}ms")
            else:
                errors += 1
        except:
            errors += 1
    
    duration = time.time() - start
    results['sequential'].update({'success': success, 'errors': errors, 'times': times, 'duration': duration})
    client.close()
    print_results('SECUENCIAL', success, errors, times, duration, NUM_SEQ)

def worker(wid, n):
    client = AIClient()
    for i in range(n):
        t0 = time.time()
        try:
            resp = client.predict("test_model", [random.random() for _ in range(784)])
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

def run_concurrent():
    print(f"Concurrente: {NUM_CONC} peticiones / {THREADS} threads\n")
    results['concurrent'] = {'success': 0, 'errors': 0, 'times': []}
    per_thread = NUM_CONC // THREADS
    threads = [threading.Thread(target=worker, args=(i, per_thread)) for i in range(THREADS)]
    
    start = time.time()
    for t in threads:
        t.start()
    
    while any(t.is_alive() for t in threads):
        with lock:
            done = results['concurrent']['success'] + results['concurrent']['errors']
        print(f"Progreso: {done}/{NUM_CONC}", end='\r')
        time.sleep(0.5)
    
    for t in threads:
        t.join()
    
    duration = time.time() - start
    results['concurrent']['duration'] = duration
    print()
    print_results('CONCURRENTE', results['concurrent']['success'], 
                  results['concurrent']['errors'], results['concurrent']['times'], duration, NUM_CONC)

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
