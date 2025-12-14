import socket
import json
import time
import base64

NODES = [
    {'host': '127.0.0.1', 'port': 5000, 'name': 'Node_A'},
    {'host': '127.0.0.1', 'port': 5001, 'name': 'Node_B'},
    {'host': '127.0.0.1', 'port': 5002, 'name': 'Node_C'}
]

class AIClient:
    def __init__(self):
        self.sock = None
        self.idx = 0
        self.node = None

    def connect(self):
        for _ in range(len(NODES)):
            node = NODES[self.idx]
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(1800)  # 30 minutos para operaciones largas como entrenamiento
                self.sock.connect((node['host'], node['port']))
                self.node = node
                return True
            except:
                self.sock = None
                self.idx = (self.idx + 1) % len(NODES)
                time.sleep(0.5)
        return False

    def send_request(self, req_type, payload):
        if not self.sock and not self.connect():
            return {'success': False, 'error': 'Sin conexión'}

        try:
            msg = json.dumps({'type': req_type, 'payload': payload}) + '\n'
            self.sock.sendall(msg.encode())
            
            data = b""
            while b'\n' not in data:
                chunk = self.sock.recv(4096)
                if not chunk:
                    raise ConnectionResetError()
                data += chunk
            
            resp = json.loads(data.decode().strip())
            
            if not resp.get('success') and resp.get('error') == 'No soy el líder':
                self.close()
                self.idx = (self.idx + 1) % len(NODES)
                return self.send_request(req_type, payload)
            
            return resp
        except:
            self.close()
            self.idx = (self.idx + 1) % len(NODES)
            return {'success': False, 'error': 'Error de red'}

    def train_model(self, model_name, dataset):
        """
        Entrenar modelo con dataset predefinido
        dataset puede ser: 'mnist', 'fashionmnist'
        """
        return self.send_request('TRAIN_REQUEST', {'model_name': model_name, 'dataset': dataset})

    def predict(self, model_id, input_vector):
        return self.send_request('PREDICT_REQUEST', {'model_id': model_id, 'input_vector': input_vector})
    
    def send_message(self, message):
        """Enviar mensaje genérico al servidor"""
        if message.get('type') == 'LIST_MODELS':
            return self.send_request('LIST_MODELS', {})
        return self.send_request(message['type'], message.get('payload', {}))

    def close(self):
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
            self.sock = None
            self.node = None
