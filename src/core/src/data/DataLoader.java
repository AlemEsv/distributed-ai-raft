package data;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * P4 - Tarea 4.2: Gestión de I/O
 * Leer CSVs/Imágenes procesados por Node.js y normalizar datos
 */
public class DataLoader {
    
    private static final String DELIMITER = ",";
    
    /**
     * Carga datos de entrenamiento desde un archivo CSV
     * Formato esperado: feature1,feature2,...,label
     * Soporta imágenes 28x28 (784 features + 1 label = 785 columnas)
     */
    public TrainingData loadTrainingData(String filePath) throws IOException {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new FileNotFoundException("Archivo no encontrado: " + filePath);
        }
        
        // Detectar tipo de dataset
        String fileName = file.getName().toLowerCase();
        boolean isImageDataset = fileName.contains("mnist") || fileName.contains("fashion");
        
        List<double[]> inputs = new ArrayList<>();
        List<double[]> outputs = new ArrayList<>();
        
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            boolean firstLine = true;
            int lineCount = 0;
            
            while ((line = br.readLine()) != null) {
                lineCount++;
                line = line.trim();
                
                if (line.isEmpty()) continue;
                
                // Skip header si existe
                if (firstLine && isHeader(line)) {
                    firstLine = false;
                    continue;
                }
                firstLine = false;
                
                try {
                    String[] parts = line.split(DELIMITER);
                    
                    if (parts.length < 2) {
                        System.err.println("WARNING: Line " + lineCount + " invalid, skipping");
                        continue;
                    }
                    
                    // Log para datasets de imágenes 28x28
                    if (isImageDataset && lineCount == 1 && parts.length == 785) {
                        System.out.println("Dataset de imágenes detectado");
                    }
                    
                    // Todas las columnas excepto la última son features
                    double[] input = new double[parts.length - 1];
                    for (int i = 0; i < parts.length - 1; i++) {
                        input[i] = Double.parseDouble(parts[i].trim());
                    }
                    
                    // Última columna es el label
                    double labelValue = Double.parseDouble(parts[parts.length - 1].trim());
                    double[] output = {labelValue};
                    
                    inputs.add(input);
                    outputs.add(output);
                    
                } catch (NumberFormatException e) {
                    System.err.println("WARNING: Parse error at line " + lineCount + ": " + e.getMessage());
                }
            }
        }
        
        if (inputs.isEmpty()) {
            throw new IOException("No se pudieron cargar datos del archivo");
        }
        
        // Convertir listas a arrays
        double[][] inputArray = inputs.toArray(new double[0][]);
        double[][] outputArray = outputs.toArray(new double[0][]);
        
        // NORMALIZACIÓN DE DATOS
        inputArray = normalizeData(inputArray);
        outputArray = normalizeData(outputArray);

        if (inputArray[0].length == 784) {
            System.out.println("Formato compatible");
        }
        
        return new TrainingData(inputArray, outputArray);
    }
    
    /**
     * Normaliza los datos usando Min-Max Normalization
     * Escala todos los valores al rango [0, 1]
     */
    private double[][] normalizeData(double[][] data) {
        if (data.length == 0) return data;
        
        int features = data[0].length;
        double[] min = new double[features];
        double[] max = new double[features];
        
        // Inicializar min y max
        Arrays.fill(min, Double.MAX_VALUE);
        Arrays.fill(max, Double.MIN_VALUE);
        
        // Encontrar min y max para cada feature
        for (double[] row : data) {
            for (int i = 0; i < features; i++) {
                if (row[i] < min[i]) min[i] = row[i];
                if (row[i] > max[i]) max[i] = row[i];
            }
        }
        
        // Normalizar
        double[][] normalized = new double[data.length][features];
        for (int i = 0; i < data.length; i++) {
            for (int j = 0; j < features; j++) {
                if (max[j] - min[j] != 0) {
                    normalized[i][j] = (data[i][j] - min[j]) / (max[j] - min[j]);
                } else {
                    normalized[i][j] = 0.5; // Si todos los valores son iguales
                }
            }
        }
        
        System.out.println("Datos normalizados: " + data.length + " ejemplos");
        return normalized;
    }
    
    /**
     * Detecta si una línea es un header (contiene texto no numérico)
     */
    private boolean isHeader(String line) {
        String[] parts = line.split(DELIMITER);
        for (String part : parts) {
            try {
                Double.parseDouble(part.trim());
            } catch (NumberFormatException e) {
                return true; // Si alguna parte no es número, es header
            }
        }
        return false;
    }
    
    /**
     * Parsea un vector de entrada desde string
     * Formato: "0.5,0.1,0.9" o "[0.5, 0.1, 0.9]"
     */
    public double[] parseInputVector(String inputData) {
        // Limpiar formato
        inputData = inputData.trim()
                             .replace("[", "")
                             .replace("]", "")
                             .replace(" ", "");
        
        String[] parts = inputData.split(DELIMITER);
        double[] vector = new double[parts.length];
        
        for (int i = 0; i < parts.length; i++) {
            vector[i] = Double.parseDouble(parts[i]);
        }
        
        return vector;
    }
    
    /**
     * Carga datos de imagen
     * Para imágenes, Node.js debería convertirlas a CSV de píxeles
     */
    public TrainingData loadImageData(String imagePath) throws IOException {
        // Las imágenes deberían ser preprocesadas por Node.js
        // y convertidas a formato CSV de píxeles normalizados
        return loadTrainingData(imagePath);
    }
    
    /**
     * Lee un archivo de texto y retorna su contenido
     */
    public String readTextFile(String filePath) throws IOException {
        return new String(Files.readAllBytes(Paths.get(filePath)));
    }
    
    /**
     * Escribe datos en un archivo
     */
    public void writeToFile(String filePath, String content) throws IOException {
        File file = new File(filePath);
        file.getParentFile().mkdirs(); // Crear directorios si no existen
        
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(file))) {
            writer.write(content);
        }
        
        System.out.println("Archivo escrito: " + filePath);
    }
}
