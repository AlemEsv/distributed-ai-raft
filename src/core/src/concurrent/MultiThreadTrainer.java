package concurrent;

import nn.NeuralNetwork;
import data.TrainingData;
import java.util.concurrent.*;

/**
 * P4 - Tarea 4.1: Multi-threading
 * Divide las operaciones matriciales y el procesamiento de lotes
 * entre todos los núcleos de la CPU
 */
public class MultiThreadTrainer {
    
    private final NeuralNetwork network;
    private final int numThreads;
    private final ExecutorService executor;
    
    public MultiThreadTrainer(NeuralNetwork network) {
        this.network = network;
        // Usar todos los núcleos disponibles
        this.numThreads = Runtime.getRuntime().availableProcessors();
        this.executor = Executors.newFixedThreadPool(numThreads);
        
        System.out.println("MultiThreadTrainer inicializado con " + numThreads + " threads");
    }
    
    /**
     * Entrena la red neuronal usando todos los núcleos del CPU
     */
    public void train(TrainingData data, int epochs, double learningRate, int batchSize) {
        long startTime = System.currentTimeMillis();
        
        for (int epoch = 0; epoch < epochs; epoch++) {
            // Mezclar datos para cada epoch
            data.shuffle();
            
            // Dividir en batches
            TrainingData[] batches = data.splitIntoBatches(batchSize);
            
            // Entrenar cada batch en paralelo
            double totalLoss = trainBatchesParallel(batches, learningRate);
            
            // Mostrar progreso
            double avgLoss = totalLoss / batches.length;
            long elapsed = (System.currentTimeMillis() - startTime) / 1000;
            System.out.printf("%d/%d - Loss: %.6f - Tiempo: %ds%n", 
                              epoch + 1, epochs, avgLoss, elapsed);
            System.out.flush(); // Asegurar que se imprima inmediatamente
        }
        
        long totalTime = (System.currentTimeMillis() - startTime) / 1000;
        System.out.println("Entrenamiento completado en " + totalTime + " segundos");
        
        // Cerrar executor
        executor.shutdown();
        try {
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
    }
    
    /**
     * Entrena múltiples batches en paralelo usando threads
     */
    private double trainBatchesParallel(TrainingData[] batches, double learningRate) {
        CountDownLatch latch = new CountDownLatch(batches.length);
        AtomicDouble totalLoss = new AtomicDouble(0.0);
        
        // Crear una tarea de entrenamiento para cada batch
        for (int i = 0; i < batches.length; i++) {
            final int batchIndex = i;
            final TrainingData batch = batches[i];
            
            executor.submit(() -> {
                try {
                    if (batch != null && batch.getSize() > 0) {
                        double batchLoss = trainSingleBatch(batch, learningRate);
                        totalLoss.add(batchLoss);
                    }
                } catch (Exception e) {
                    System.err.println("Error en batch " + batchIndex + ": " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }
        
        // Esperar a que todos los batches terminen
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.err.println("Entrenamiento interrumpido");
        }
        
        return totalLoss.get();
    }
    
    /**
     * Entrena un solo batch
     */
    private synchronized double trainSingleBatch(TrainingData batch, double learningRate) {
        double batchLoss = 0.0;
        int batchSize = batch.getSize();
        
        // Acumular gradientes para todo el batch
        for (int i = 0; i < batchSize; i++) {
            TrainingData.DataPair example = batch.getExample(i);
            if (example != null && example.input != null && example.output != null) {
                double loss = network.trainStep(example.input, example.output, learningRate);
                batchLoss += loss;
            }
        }
        
        return batchLoss / batchSize;
    }
    
    /**
     * Realiza predicciones en paralelo para múltiples inputs
     */
    public double[][] predictParallel(double[][] inputs) {
        int numInputs = inputs.length;
        double[][] outputs = new double[numInputs][];
        
        CountDownLatch latch = new CountDownLatch(numInputs);
        
        for (int i = 0; i < numInputs; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    outputs[index] = network.predict(inputs[index]);
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        return outputs;
    }
    
    /**
     * Clase auxiliar para sumar doubles de forma atómica
     */
    private static class AtomicDouble {
        private volatile double value;
        
        public AtomicDouble(double initialValue) {
            this.value = initialValue;
        }
        
        public synchronized void add(double delta) {
            this.value += delta;
        }
        
        public synchronized double get() {
            return value;
        }
    }
    
    /**
     * Calcula la matriz de forma paralela dividiendo por filas
     * Útil para operaciones matriciales grandes
     */
    public static double[][] parallelMatrixMultiply(double[][] A, double[][] B, int numThreads) {
        if (A[0].length != B.length) {
            throw new IllegalArgumentException("Dimensiones incompatibles para multiplicación");
        }
        
        int rows = A.length;
        int cols = B[0].length;
        int common = A[0].length;
        
        double[][] result = new double[rows][cols];
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(rows);
        
        // Cada thread calcula algunas filas del resultado
        for (int i = 0; i < rows; i++) {
            final int row = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < cols; j++) {
                        double sum = 0.0;
                        for (int k = 0; k < common; k++) {
                            sum += A[row][k] * B[k][j];
                        }
                        result[row][j] = sum;
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        executor.shutdown();
        return result;
    }
    
    /**
     * Aplica una función a cada elemento de una matriz en paralelo
     */
    public static double[][] parallelApplyFunction(double[][] matrix, 
                                                   java.util.function.DoubleUnaryOperator function, 
                                                   int numThreads) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        double[][] result = new double[rows][cols];
        
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(rows);
        
        for (int i = 0; i < rows; i++) {
            final int row = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < cols; j++) {
                        result[row][j] = function.applyAsDouble(matrix[row][j]);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }
        
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        executor.shutdown();
        return result;
    }
}
