package data;

import java.io.*;
import java.util.Random;

/**
 * Generador de datos sintéticos para pruebas
 * Útil para testing del sistema sin datasets reales
 */
public class DataGenerator {
    
    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("Uso: java DataGenerator <tipo>");
            System.out.println("Tipos disponibles:");
            System.out.println("  - xor: Problema XOR (4 ejemplos)");
            System.out.println("  - linear: Relación lineal simple (100 ejemplos)");
            System.out.println("  - circles: Clasificación de círculos concéntricos (500 ejemplos)");
            System.out.println("  - large: Dataset grande para pruebas de estrés (10000 ejemplos)");
            return;
        }
        
        String tipo = args[0].toLowerCase();
        
        try {
            switch (tipo) {
                case "xor":
                    generateXOR();
                    break;
                case "linear":
                    generateLinear();
                    break;
                case "circles":
                    generateCircles();
                    break;
                case "large":
                    generateLarge();
                    break;
                default:
                    System.err.println("Tipo desconocido: " + tipo);
            }
        } catch (IOException e) {
            System.err.println("Error generando datos: " + e.getMessage());
        }
    }
    
    /**
     * Genera dataset XOR - problema clásico no linealmente separable
     */
    private static void generateXOR() throws IOException {
        String filename = "datasets/xor.csv";
        System.out.println("Generando dataset XOR: " + filename);
        
        try (PrintWriter writer = new PrintWriter(new FileWriter(filename))) {
            writer.println("x1,x2,output");
            writer.println("0,0,0");
            writer.println("0,1,1");
            writer.println("1,0,1");
            writer.println("1,1,0");
        }
        
        System.out.println("✓ Dataset XOR generado (4 ejemplos)");
    }
    
    /**
     * Genera dataset con relación lineal simple: y = 2x + 1 + ruido
     */
    private static void generateLinear() throws IOException {
        String filename = "datasets/linear.csv";
        System.out.println("Generando dataset lineal: " + filename);
        
        Random rand = new Random(42);
        int numSamples = 100;
        
        try (PrintWriter writer = new PrintWriter(new FileWriter(filename))) {
            writer.println("x,y");
            
            for (int i = 0; i < numSamples; i++) {
                double x = rand.nextDouble() * 10;
                double y = 2 * x + 1 + rand.nextGaussian() * 0.5;
                writer.printf("%.4f,%.4f%n", x, y);
            }
        }
        
        System.out.println("✓ Dataset lineal generado (100 ejemplos)");
    }
    
    /**
     * Genera clasificación de círculos concéntricos
     */
    private static void generateCircles() throws IOException {
        String filename = "datasets/circles.csv";
        System.out.println("Generando dataset de círculos: " + filename);
        
        Random rand = new Random(42);
        int numSamples = 500;
        
        try (PrintWriter writer = new PrintWriter(new FileWriter(filename))) {
            writer.println("x,y,class");
            
            for (int i = 0; i < numSamples; i++) {
                double angle = rand.nextDouble() * 2 * Math.PI;
                double radius;
                int classLabel;
                
                if (rand.nextBoolean()) {
                    // Círculo interior
                    radius = 1 + rand.nextGaussian() * 0.2;
                    classLabel = 0;
                } else {
                    // Círculo exterior
                    radius = 3 + rand.nextGaussian() * 0.2;
                    classLabel = 1;
                }
                
                double x = radius * Math.cos(angle);
                double y = radius * Math.sin(angle);
                
                writer.printf("%.4f,%.4f,%d%n", x, y, classLabel);
            }
        }
        
        System.out.println("✓ Dataset de círculos generado (500 ejemplos)");
    }
    
    /**
     * Genera dataset grande para pruebas de estrés y evaluación de concurrencia
     */
    private static void generateLarge() throws IOException {
        String filename = "datasets/large_dataset.csv";
        System.out.println("Generando dataset grande: " + filename);
        System.out.println("Esto puede tomar unos segundos...");
        
        Random rand = new Random(42);
        int numSamples = 10000;
        int numFeatures = 20;
        
        long startTime = System.currentTimeMillis();
        
        try (PrintWriter writer = new PrintWriter(new BufferedWriter(new FileWriter(filename)))) {
            // Header
            for (int i = 0; i < numFeatures; i++) {
                writer.print("f" + i + ",");
            }
            writer.println("target");
            
            // Datos
            for (int i = 0; i < numSamples; i++) {
                double[] features = new double[numFeatures];
                double sum = 0;
                
                for (int j = 0; j < numFeatures; j++) {
                    features[j] = rand.nextGaussian();
                    sum += features[j];
                    writer.printf("%.4f,", features[j]);
                }
                
                // Target es función de las features
                double target = sum > 0 ? 1 : 0;
                writer.println(target);
                
                if ((i + 1) % 1000 == 0) {
                    System.out.println("  Progreso: " + (i + 1) + "/" + numSamples);
                }
            }
        }
        
        long elapsedTime = System.currentTimeMillis() - startTime;
        System.out.printf("✓ Dataset grande generado (10000 ejemplos) en %.2f segundos%n", 
                         elapsedTime / 1000.0);
    }
}
