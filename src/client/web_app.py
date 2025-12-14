from flask import Flask, render_template, request, jsonify
from tcp_client import AIClient
import os

app = Flask(__name__)
client = AIClient()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/train', methods=['POST'])
def train():
    try:
        data = request.get_json()
        model_name = data.get('model_name')
        dataset = data.get('dataset')
        
        if not model_name or not dataset:
            return jsonify({'success': False, 'error': 'Faltan datos'}), 400
            
        # Enviar solicitud de entrenamiento al cluster
        response = client.train_model(model_name, dataset)
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        model_id = data.get('model_id')
        input_data = data.get('input_vector')
        
        if not model_id or input_data is None:
            return jsonify({'success': False, 'error': 'Faltan datos'}), 400
            
        # Manejar entrada de texto o array
        if isinstance(input_data, str):
            try:
                input_vector = [float(x.strip()) for x in input_data.split(',')]
            except ValueError:
                return jsonify({'success': False, 'error': 'Formato de vector inválido'}), 400
        else:
            input_vector = input_data

        response = client.predict(model_id, input_vector)
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/list_models')
def list_models():
    try:
        response = client.send_message({'type': 'LIST_MODELS'})
        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/stress/sequential', methods=['POST'])
def stress_sequential():
    try:
        import stress_test
        data = request.get_json()
        num_requests = int(data.get('requests', 100))
        model_id = data.get('model_id', 'test_model')
        stats = stress_test.run_sequential(num_requests, model_id)
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/stress/concurrent', methods=['POST'])
def stress_concurrent():
    try:
        import stress_test
        data = request.get_json()
        num_requests = int(data.get('requests', 500))
        num_threads = int(data.get('threads', 50))
        model_id = data.get('model_id', 'test_model')
        stats = stress_test.run_concurrent(num_requests, num_threads, model_id)
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Iniciando Cliente Web en http://localhost:5005")
    app.run(debug=True, port=5005)
