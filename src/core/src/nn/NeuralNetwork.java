package nn;

import math.Matrix;
import math.ActivationFunction;
import data.TrainingData;
import java.io.*;

/**
 * Red Neuronal Multi-Capa
 * P3 (Matemático): Implementa la lógica matemática (forward/backward propagation)
 * P4 (Concurrencia): Optimiza con multi-threading y gestión de I/O
 */
public class NeuralNetwork implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private final int[] layers;
    private Matrix[] weights;
    private Matrix[] biases;
    
    // Cache para backpropagation
    private transient Matrix[] activations;
    private transient Matrix[] zValues;
    
    /**
     * Constructor: crea una red con las capas especificadas
     * Ejemplo: [784, 128, 64, 10] = 784 inputs, 2 capas ocultas, 10 outputs
     */
    public NeuralNetwork(int[] layers) {
        this.layers = layers;
        this.weights = new Matrix[layers.length - 1];
        this.biases = new Matrix[layers.length - 1];
        
        // Inicializar pesos y biases
        initializeParameters();
    }
    
    /**
     * Inicializa pesos con Xavier initialization y biases con ceros
     */
    private void initializeParameters() {
        for (int i = 0; i < weights.length; i++) {
            int inputSize = layers[i];
            int outputSize = layers[i + 1];
            
            weights[i] = new Matrix(outputSize, inputSize);
            weights[i].randomize(inputSize);
            
            biases[i] = new Matrix(outputSize, 1);
            // Biases inician en cero
        }
    }
    
    /**
     * Forward Propagation (P3: Tarea 3.2)
     * Calcula la salida de la red dada una entrada
     */
    public double[] predict(double[] input) {
        if (input.length != layers[0]) {
            throw new IllegalArgumentException(
                String.format("Input size mismatch: esperado %d, recibido %d",
                              layers[0], input.length));
        }
        
        Matrix activation = new Matrix(input);
        
        // Propagar hacia adelante
        for (int i = 0; i < weights.length; i++) {
            Matrix z = weights[i].multiply(activation).add(biases[i]);
            
            // Aplicar función de activación
            if (i < weights.length - 1) {
                // Capas ocultas: ReLU
                activation = ActivationFunction.applyReLU(z);
            } else {
                // Capa de salida: Sigmoid
                activation = ActivationFunction.applySigmoid(z);
            }
        }
        
        return activation.toArray();
    }
    
    /**
     * Forward Propagation con cache para backpropagation
     */
    private Matrix forwardWithCache(Matrix input) {
        int numLayers = layers.length;
        activations = new Matrix[numLayers];
        zValues = new Matrix[numLayers - 1];
        
        activations[0] = input;
        
        for (int i = 0; i < weights.length; i++) {
            // z = W * a + b
            zValues[i] = weights[i].multiply(activations[i]).add(biases[i]);
            
            // Aplicar función de activación
            if (i < weights.length - 1) {
                activations[i + 1] = ActivationFunction.applyReLU(zValues[i]);
            } else {
                activations[i + 1] = ActivationFunction.applySigmoid(zValues[i]);
            }
        }
        
        return activations[numLayers - 1];
    }
    
    /**
     * Backpropagation (P3: Tarea 3.3)
     * Calcula gradientes y actualiza pesos
     */
    public double trainStep(double[] input, double[] target, double learningRate) {
        if (input.length != layers[0]) {
            throw new IllegalArgumentException("Input size mismatch");
        }
        if (target.length != layers[layers.length - 1]) {
            throw new IllegalArgumentException("Target size mismatch");
        }
        
        // Forward pass con cache
        Matrix inputMatrix = new Matrix(input);
        Matrix output = forwardWithCache(inputMatrix);
        Matrix targetMatrix = new Matrix(target);
        
        // Calcular error (loss)
        Matrix error = output.subtract(targetMatrix);
        double loss = calculateMSE(output, targetMatrix);
        
        // Backward pass
        Matrix[] weightGradients = new Matrix[weights.length];
        Matrix[] biasGradients = new Matrix[weights.length];
        
        // Última capa
        int lastLayer = weights.length - 1;
        Matrix delta = error.hadamard(
            ActivationFunction.applySigmoidDerivative(zValues[lastLayer])
        );
        
        weightGradients[lastLayer] = delta.multiply(activations[lastLayer].transpose());
        biasGradients[lastLayer] = delta;
        
        // Capas anteriores (propagación hacia atrás)
        for (int i = lastLayer - 1; i >= 0; i--) {
            delta = weights[i + 1].transpose().multiply(delta)
                    .hadamard(ActivationFunction.applyReLUDerivative(zValues[i]));
            
            weightGradients[i] = delta.multiply(activations[i].transpose());
            biasGradients[i] = delta;
        }
        
        // Actualizar pesos y biases
        for (int i = 0; i < weights.length; i++) {
            weights[i] = weights[i].subtract(weightGradients[i].scale(learningRate));
            biases[i] = biases[i].subtract(biasGradients[i].scale(learningRate));
        }
        
        return loss;
    }
    
    /**
     * Calcula Mean Squared Error
     */
    private double calculateMSE(Matrix output, Matrix target) {
        Matrix diff = output.subtract(target);
        double sum = 0;
        for (int i = 0; i < diff.getRows(); i++) {
            double val = diff.get(i, 0);
            sum += val * val;
        }
        return sum / diff.getRows();
    }
    
    /**
     * P3: Tarea 3.4 - Guarda el modelo en disco
     * P4: Optimiza la escritura de archivos
     */
    public void saveModel(String filePath) throws IOException {
        File file = new File(filePath);
        file.getParentFile().mkdirs();
        
        System.out.println("Guardando modelo en: " + filePath);
        
        try (ObjectOutputStream oos = new ObjectOutputStream(
                new BufferedOutputStream(new FileOutputStream(file)))) {
            oos.writeObject(this);
        }
        
        System.out.println("Modelo guardado exitosamente");
    }
    
    /**
     * P3: Tarea 3.4 - Carga el modelo desde disco
     */
    public static NeuralNetwork loadModel(String filePath) throws IOException, ClassNotFoundException {
        try (ObjectInputStream ois = new ObjectInputStream(
                new BufferedInputStream(new FileInputStream(filePath)))) {
            NeuralNetwork nn = (NeuralNetwork) ois.readObject();
            return nn;
        }
    }
    
    /**
     * Obtiene información del modelo
     */
    public String getInfo() {
        StringBuilder sb = new StringBuilder();
        sb.append("Neural Network Info:\n");
        sb.append("Architecture: [");
        for (int i = 0; i < layers.length; i++) {
            sb.append(layers[i]);
            if (i < layers.length - 1) sb.append(" -> ");
        }
        sb.append("]\n");
        
        int totalParams = 0;
        for (int i = 0; i < weights.length; i++) {
            int layerParams = weights[i].getRows() * weights[i].getCols() + biases[i].getRows();
            totalParams += layerParams;
        }
        sb.append("Total Parameters: ").append(totalParams);
        
        return sb.toString();
    }
    
    /**
     * Evalúa el modelo en un conjunto de datos
     */
    public double evaluate(TrainingData testData) {
        double totalLoss = 0.0;
        int size = testData.getSize();
        
        for (int i = 0; i < size; i++) {
            TrainingData.DataPair example = testData.getExample(i);
            double[] prediction = predict(example.input);
            
            // Calcular error
            double loss = 0;
            for (int j = 0; j < prediction.length; j++) {
                double diff = prediction[j] - example.output[j];
                loss += diff * diff;
            }
            totalLoss += loss / prediction.length;
        }
        
        return totalLoss / size;
    }
    
    public int[] getLayers() {
        return layers;
    }
}
