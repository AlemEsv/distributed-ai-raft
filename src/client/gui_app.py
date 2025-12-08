import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tcp_client import AIClient
import threading

class AIApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sistema Distribuido IA - Cliente")
        self.root.geometry("600x500")
        
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
        
        # File Selection
        ttk.Label(frame, text="Dataset (CSV):").grid(row=1, column=0, sticky='w', pady=5)
        self.file_path_var = tk.StringVar()
        entry_file = ttk.Entry(frame, textvariable=self.file_path_var, width=30, state='readonly')
        entry_file.grid(row=1, column=1, pady=5)
        
        ttk.Button(frame, text="Examinar...", command=self.browse_file).grid(row=1, column=2, padx=5)
        
        # Train Button
        ttk.Button(frame, text="Iniciar Entrenamiento", command=self.start_training).grid(row=2, column=1, pady=20)

    def setup_predict_tab(self):
        frame = ttk.Frame(self.predict_frame)
        frame.pack(padx=20, pady=20, fill='x')
        
        # Model ID
        ttk.Label(frame, text="ID del Modelo:").grid(row=0, column=0, sticky='w', pady=5)
        self.model_id_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.model_id_var, width=30).grid(row=0, column=1, pady=5)
        
        # Input Data
        ttk.Label(frame, text="Datos de Entrada (1,0,0.5...):").grid(row=1, column=0, sticky='w', pady=5)
        self.input_data_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.input_data_var, width=30).grid(row=1, column=1, pady=5)
        
        # Predict Button
        ttk.Button(frame, text="Predecir", command=self.start_prediction).grid(row=2, column=1, pady=20)
        
        # Result
        self.result_label = ttk.Label(frame, text="Resultado: -", font=('Arial', 12, 'bold'))
        self.result_label.grid(row=3, column=0, columnspan=3, pady=10)

    def browse_file(self):
        filename = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")])
        if filename:
            self.file_path_var.set(filename)

    def start_training(self):
        model_name = self.model_name_var.get()
        file_path = self.file_path_var.get()
        
        if not model_name or not file_path:
            messagebox.showwarning("Error", "Complete todos los campos")
            return
            
        self.log(f"Iniciando entrenamiento para {model_name}...")
        
        # Run in thread to not freeze UI
        threading.Thread(target=self._run_training, args=(model_name, file_path)).start()

    def _run_training(self, model_name, file_path):
        response = self.client.train_model(model_name, file_path)
        
        if response.get('success'):
            msg = f"Entrenamiento exitoso! ID: {response.get('modelId')}"
            self.log(msg)
            messagebox.showinfo("Éxito", msg)
        else:
            msg = f"Error: {response.get('error')}"
            self.log(msg)
            messagebox.showerror("Error", msg)

    def start_prediction(self):
        model_id = self.model_id_var.get()
        input_str = self.input_data_var.get()
        
        if not model_id or not input_str:
            messagebox.showwarning("Error", "Complete todos los campos")
            return
            
        try:
            # Convert string "1, 2, 3" to list [1.0, 2.0, 3.0]
            input_vector = [float(x.strip()) for x in input_str.split(',')]
        except ValueError:
            messagebox.showerror("Error", "Formato de datos inválido. Use números separados por coma.")
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
