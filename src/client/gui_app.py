import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tcp_client import AIClient
import threading
from PIL import Image, ImageDraw
import numpy as np

class AIApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sistema Distribuido IA")
        self.root.geometry("1080x720")
        
        self.client = AIClient()
        
        # Notebook (Tabs)
        self.notebook = ttk.Notebook(root)
        self.notebook.pack(expand=True, fill='both', padx=10, pady=10)
        
        # Tab Entrenamiento
        self.train_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.train_frame, text='Entrenamiento')
        self.setup_train_tab()
        
        # Tab Predicción
        self.predict_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.predict_frame, text='Predicción')
        self.setup_predict_tab()
        
        # Log Area
        self.log_frame = ttk.LabelFrame(root, text="Logs del Sistema")
        self.log_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.log_text = tk.Text(self.log_frame, height=10, state='disabled')
        self.log_text.pack(fill='both', expand=True, padx=5, pady=5)

    def log(self, message):
        self.log_text.config(state='normal')
        self.log_text.insert(tk.END, f"> {message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state='disabled')

    def setup_train_tab(self):
        frame = ttk.Frame(self.train_frame)
        frame.pack(padx=20, pady=20, fill='x')
        
        # Model Name
        ttk.Label(frame, text="Nombre del Modelo:").grid(row=0, column=0, sticky='w', pady=5)
        self.model_name_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.model_name_var, width=30).grid(row=0, column=1, pady=5)
        
        # Dataset Selection (predefinido)
        ttk.Label(frame, text="Dataset:").grid(row=1, column=0, sticky='w', pady=5)
        self.dataset_var = tk.StringVar(value='mnist')
        dataset_frame = ttk.Frame(frame)
        dataset_frame.grid(row=1, column=1, pady=5, sticky='w')
        ttk.Radiobutton(dataset_frame, text="MNIST", variable=self.dataset_var, value='mnist').pack(side='left', padx=5)
        ttk.Radiobutton(dataset_frame, text="Fashion MNIST", variable=self.dataset_var, value='fashionmnist').pack(side='left', padx=5)
        
        # Train Button
        ttk.Button(frame, text="Iniciar Entrenamiento", command=self.start_training).grid(row=2, column=1, pady=20)

    def load_models(self):
        try:
            response = self.client.send_message({'type': 'LIST_MODELS'})
            if response and response.get('success'):
                models = response.get('models', [])
                if models:
                    self.model_combo['values'] = models
                    self.model_combo.current(0)
                else:
                    self.model_combo['values'] = ['No hay modelos']
                    self.model_combo.current(0)
            else:
                error_msg = response.get('error', 'Error desconocido') if response else 'Sin respuesta'
                self.model_combo['values'] = [f'Error: {error_msg}']
                self.model_combo.current(0)
        except Exception as e:
            self.model_combo['values'] = [f'Error: {str(e)}']
            self.model_combo.current(0)
    
    def setup_predict_tab(self):
        frame = ttk.Frame(self.predict_frame)
        frame.pack(padx=20, pady=20, fill='both', expand=True)
        
        # Model ID
        ttk.Label(frame, text="ID del Modelo:").grid(row=0, column=0, sticky='w', pady=5)
        self.model_id_var = tk.StringVar()
        self.model_combo = ttk.Combobox(frame, textvariable=self.model_id_var, width=28, state='readonly')
        self.model_combo.grid(row=0, column=1, pady=5)
        ttk.Button(frame, text="Actualizar", command=self.load_models).grid(row=0, column=2, pady=5, padx=5)
        self.load_models()
        
        # Input Mode Selection
        ttk.Label(frame, text="Modo de Entrada:").grid(row=1, column=0, sticky='w', pady=5)
        self.input_mode_var = tk.StringVar(value="text")
        mode_frame = ttk.Frame(frame)
        mode_frame.grid(row=1, column=1, columnspan=2, sticky='w', pady=5)
        ttk.Radiobutton(mode_frame, text="Texto", variable=self.input_mode_var, value="text", command=self.toggle_input_mode).pack(side='left', padx=5)
        ttk.Radiobutton(mode_frame, text="Dibujo", variable=self.input_mode_var, value="draw", command=self.toggle_input_mode).pack(side='left', padx=5)
        
        # Text Input (for manual data entry)
        self.text_input_frame = ttk.Frame(frame)
        self.text_input_frame.grid(row=2, column=0, columnspan=3, pady=10, sticky='ew')
        ttk.Label(self.text_input_frame, text="Datos de Entrada (1,0,0.5...):").pack(anchor='w')
        self.input_data_var = tk.StringVar()
        ttk.Entry(self.text_input_frame, textvariable=self.input_data_var, width=50).pack(fill='x', pady=5)
        
        # Drawing Canvas (for image datasets like MNIST)
        self.canvas_frame = ttk.Frame(frame)
        self.canvas_frame.grid(row=2, column=0, columnspan=3, pady=10, sticky='nsew')
        self.canvas_frame.grid_remove()  # Hidden by default
        
        canvas_label = ttk.Label(self.canvas_frame, text="Dibuja aquí (28x28 píxeles):")
        canvas_label.pack(anchor='w')
        
        self.canvas = tk.Canvas(self.canvas_frame, width=280, height=280, bg='white', cursor='cross', relief='solid', borderwidth=2)
        self.canvas.pack(pady=5)
        
        # Canvas drawing setup
        self.canvas_size = 280
        self.image = Image.new('L', (self.canvas_size, self.canvas_size), 'white')
        self.draw = ImageDraw.Draw(self.image)
        self.last_x, self.last_y = None, None
        
        self.canvas.bind("<B1-Motion>", self.paint)
        self.canvas.bind("<ButtonRelease-1>", self.reset_draw)
        
        # Clear button
        ttk.Button(self.canvas_frame, text="Limpiar Canvas", command=self.clear_canvas).pack(pady=5)
        
        # Predict Button
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=3, column=0, columnspan=3, pady=20)
        ttk.Button(button_frame, text="Predecir", command=self.start_prediction).pack()
        
        # Result
        self.result_label = ttk.Label(frame, text="Resultado: -", font=('Arial', 14, 'bold'), foreground='blue')
        self.result_label.grid(row=4, column=0, columnspan=3, pady=10)
        
        # Configure row to expand for canvas
        frame.grid_rowconfigure(2, weight=1)

    def start_training(self):
        model_name = self.model_name_var.get()
        dataset = self.dataset_var.get()
        
        if not model_name:
            messagebox.showwarning("Error", "Ingrese un nombre de modelo")
            return
            
        self.log(f"Iniciando entrenamiento para {model_name} con dataset {dataset}...")
        
        # Run in thread to not freeze UI
        threading.Thread(target=self._run_training, args=(model_name, dataset)).start()

    def _run_training(self, model_name, dataset):
        response = self.client.train_model(model_name, dataset)
        
        if response.get('success'):
            msg = f"Entrenamiento exitoso! ID: {response.get('modelId')}"
            self.log(msg)
            messagebox.showinfo("Éxito", msg)
        else:
            msg = f"Error: {response.get('error')}"
            self.log(msg)
            messagebox.showerror("Error", msg)

    def toggle_input_mode(self):
        """Toggle between text input and drawing canvas"""
        mode = self.input_mode_var.get()
        if mode == "text":
            self.text_input_frame.grid()
            self.canvas_frame.grid_remove()
        else:  # draw
            self.text_input_frame.grid_remove()
            self.canvas_frame.grid()
            self.clear_canvas()
    
    def paint(self, event):
        """Handle drawing on canvas"""
        if self.last_x and self.last_y:
            # Draw on tkinter canvas
            self.canvas.create_line(self.last_x, self.last_y, event.x, event.y,
                                   width=15, fill='black', capstyle=tk.ROUND, smooth=True)
            # Draw on PIL image
            self.draw.line([self.last_x, self.last_y, event.x, event.y],
                          fill='black', width=15)
        self.last_x, self.last_y = event.x, event.y
    
    def reset_draw(self, event):
        """Reset drawing state when mouse button is released"""
        self.last_x, self.last_y = None, None
    
    def clear_canvas(self):
        """Clear the drawing canvas"""
        self.canvas.delete("all")
        self.image = Image.new('L', (self.canvas_size, self.canvas_size), 'white')
        self.draw = ImageDraw.Draw(self.image)
        self.last_x, self.last_y = None, None
    
    def get_image_array(self):
        """Convert canvas drawing to 28x28 normalized array"""
        # Resize to 28x28
        img_resized = self.image.resize((28, 28), Image.Resampling.LANCZOS)
        # Convert to numpy array
        img_array = np.array(img_resized)
        # Invert colors (black background, white drawing - like MNIST)
        img_array = 255 - img_array
        # Normalize to 0-1
        img_array = img_array.astype('float32') / 255.0
        # Flatten to 1D array (784 elements for 28x28)
        return img_array.flatten().tolist()

    def start_prediction(self):
        model_id = self.model_id_var.get()
        
        if not model_id:
            messagebox.showwarning("Error", "Ingrese el ID del modelo")
            return
        
        # Get input based on mode
        mode = self.input_mode_var.get()
        
        if mode == "text":
            input_str = self.input_data_var.get()
            if not input_str:
                messagebox.showwarning("Error", "Ingrese los datos de entrada")
                return
            
            try:
                # Convert string "1, 2, 3" to list [1.0, 2.0, 3.0]
                input_vector = [float(x.strip()) for x in input_str.split(',')]
            except ValueError:
                messagebox.showerror("Error", "Formato de datos inválido. Use números separados por coma.")
                return
        else:  # draw mode
            try:
                input_vector = self.get_image_array()
                self.log(f"Imagen convertida a vector de {len(input_vector)} elementos")
            except Exception as e:
                messagebox.showerror("Error", f"Error al procesar el dibujo: {str(e)}")
                return
            
        self.log(f"Solicitando predicción al modelo {model_id}...")
        
        threading.Thread(target=self._run_prediction, args=(model_id, input_vector)).start()

    def _run_prediction(self, model_id, input_vector):
        response = self.client.predict(model_id, input_vector)
        
        if response.get('success'):
            pred = response.get('prediction')
            self.log(f"Predicción recibida: {pred}")
            self.result_label.config(text=f"Resultado: {pred}")
        else:
            msg = f"Error: {response.get('error')}"
            self.log(msg)
            self.result_label.config(text="Resultado: Error")
            messagebox.showerror("Error", msg)

if __name__ == "__main__":
    root = tk.Tk()
    app = AIApp(root)
    root.mainloop()
