import os
import csv
import shutil
import numpy as np
import torchvision
from torchvision import datasets

# Configuración
base_dir = os.path.join("src", "core", "datasets")
os.makedirs(base_dir, exist_ok=True)

def save_to_csv(dataset, filename):
    filepath = os.path.join(base_dir, filename)
    
    with open(filepath, 'w', newline='') as f:
        writer = csv.writer(f)
        # Header: label, pixel0, pixel1, ...
        header = ["label"] + [f"pixel{i}" for i in range(784)]
        writer.writerow(header)
        
        for img, label in dataset:
            # Convertir imagen PIL a lista de pixeles planos
            pixels = np.array(img).flatten().tolist()
            writer.writerow([label] + pixels)

# Descargar y procesar MNIST
mnist_data = datasets.MNIST(root=base_dir, train=True, download=True)
save_to_csv(mnist_data, "mnist.csv")
shutil.rmtree(os.path.join(base_dir, "MNIST"), ignore_errors=True)

# Descargar y procesar FashionMNIST
fashion_data = datasets.FashionMNIST(root=base_dir, train=True, download=True)
save_to_csv(fashion_data, "fashionmnist.csv")
shutil.rmtree(os.path.join(base_dir, "FashionMNIST"), ignore_errors=True)

print("Proceso completado.")
