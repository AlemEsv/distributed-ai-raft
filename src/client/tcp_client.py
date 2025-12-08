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
        self.current_node_index = 0
        self.connected_node = None

    def connect(self):
        """Intenta conectar a cualquier nodo disponible, rotando si falla."""
        attempts = 0
        while attempts < len(NODES):
            node = NODES[self.current_node_index]
            try:
                print(f"[CLIENT] Intentando conectar a {node['name']} ({node['host']}:{node['port']})...")
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(5) # Timeout de 5 segundos
                self.sock.connect((node['host'], node['port']))
                self.connected_node = node
                print(f"[CLIENT] Conectado exitosamente a {node['name']}")
                return True
            except (ConnectionRefusedError, socket.timeout) as e:
                print(f"[CLIENT] Falló conexión a {node['name']}: {e}")
                self.sock = None
                self.current_node_index = (self.current_node_index + 1) % len(NODES)
                attempts += 1
                time.sleep(1)
        
        print("[CLIENT] No se pudo conectar a ningún nodo.")
        return False

    def send_request(self, request_type, payload):
        """Envía una petición y maneja la respuesta, incluyendo reintentos por cambio de líder."""
        if not self.sock:
            if not self.connect():
                return {'success': False, 'error': 'No hay conexión con el clúster'}

        request = {
            'type': request_type,
            'payload': payload
        }

        try:
            # Enviar mensaje delimitado por \n
            msg_str = json.dumps(request) + '\n'
            self.sock.sendall(msg_str.encode('utf-8'))

            # Recibir respuesta
            # Leemos buffer hasta encontrar \n
            response_data = b""
            while True:
                chunk = self.sock.recv(4096)
                if not chunk:
                    raise ConnectionResetError("Conexión cerrada por el servidor")
                response_data += chunk
                if b'\n' in response_data:
                    break
            
            response_str = response_data.decode('utf-8').strip()
            response = json.loads(response_str)

            # Manejar redirección de líder
            if not response.get('success') and response.get('error') == 'No soy el líder':
                print(f"[CLIENT] Nodo {self.connected_node['name']} no es líder. Buscando líder...")
                self.close()
                # Intentar con el siguiente nodo (simple round-robin por ahora)
                # En una implementación más avanzada, el servidor podría devolver la ID del líder
                self.current_node_index = (self.current_node_index + 1) % len(NODES)
                return self.send_request(request_type, payload)

            return response

        except (ConnectionResetError, BrokenPipeError, socket.timeout, json.JSONDecodeError) as e:
            print(f"[CLIENT] Error de comunicación: {e}")
            self.close()
            # Reintentar conexión
            self.current_node_index = (self.current_node_index + 1) % len(NODES)
            # Podríamos reintentar la petición aquí, pero por seguridad retornamos error para que la UI decida
            return {'success': False, 'error': f'Error de red: {str(e)}'}

    def train_model(self, model_name, file_path):
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            return self.train_model_from_bytes(model_name, file_content)
            
        except FileNotFoundError:
            return {'success': False, 'error': 'Archivo no encontrado'}

    def train_model_from_bytes(self, model_name, file_bytes):
        encoded_content = base64.b64encode(file_bytes).decode('utf-8')
        
        payload = {
            'model_name': model_name,
            'data_content': encoded_content
        }
        return self.send_request('TRAIN_REQUEST', payload)

    def predict(self, model_id, input_vector):
        payload = {
            'model_id': model_id,
            'input_vector': input_vector
        }
        return self.send_request('PREDICT_REQUEST', payload)

    def close(self):
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
            self.sock = None
            self.connected_node = None
