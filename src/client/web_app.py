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
        model_name = request.form.get('model_name')
        file = request.files.get('file')
        
        if not model_name or not file:
            return jsonify({'success': False, 'error': 'Faltan datos (nombre o archivo)'}), 400
            
        # Leer bytes del archivo subido
        file_bytes = file.read()
        
        # Enviar al cluster
        response = client.train_model_from_bytes(model_name, file_bytes)
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        model_id = data.get('model_id')
        input_str = data.get('input_vector')
        
        if not model_id or not input_str:
            return jsonify({'success': False, 'error': 'Faltan datos'}), 400
            
        # Convertir string "1, 2, 3" a lista [1.0, 2.0, 3.0]
        try:
            input_vector = [float(x.strip()) for x in input_str.split(',')]
        except ValueError:
            return jsonify({'success': False, 'error': 'Formato de vector inválido'}), 400
            
        response = client.predict(model_id, input_vector)
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Iniciando Cliente Web en http://localhost:5000")
    app.run(debug=True, port=5000)
