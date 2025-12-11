package core.src.nn;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import core.src.math.Activation;
import core.src.math.Matrix;

public class NeuralNetwork implements Serializable {
    private static final long serialVersionUID = 1L;

    // Identificadores del Modelo
    private String id;
    private String name;

    // Estructura de la red
    private List<Matrix> weights;
    private List<Matrix> biases;
    private int[] layers;
    private double learningRate = 0.01;

    public NeuralNetwork(int... layers) {
        this.layers = layers;
        this.weights = new ArrayList<>();
        this.biases = new ArrayList<>();
        this.id = UUID.randomUUID().toString();
        this.name = "Modelo_Sin_Nombre";
        initializeWeights();
    }

    private void initializeWeights() {
        for (int i = 0; i < layers.length - 1; i++) {
            // Pesos entre capa i+1 y i
            Matrix w = new Matrix(layers[i+1], layers[i]);
            w.randomize();
            weights.add(w);

            // Bias para la capa i+1 (un vector columna)
            Matrix b = new Matrix(layers[i+1], 1);
            b.randomize();
            biases.add(b);
        }
    }

    // GETTERS Y SETTERS PARA METADATA

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    // CONFIGURACION
    
    public void setLearningRate(double learningRate) {
        this.learningRate = learningRate;
    }

    // PREDICCION

    public double[] predict(double[] inputArray) {
        Matrix input = Matrix.fromArray(inputArray);
        List<Matrix> activations = feedForwardAllLayers(input);
        return activations.get(activations.size() - 1).toArray();
    }

    // FORWARD PROPAGATION

    private List<Matrix> feedForwardAllLayers(Matrix input) {
        List<Matrix> activations = new ArrayList<>();
        activations.add(input); // La capa 0 es el input

        Matrix current = input;
        
        for (int i = 0; i < weights.size(); i++) {
            current = weights.get(i).multiplyMatrices(weights.get(i), current); // 1. Producto Punto: W * Input
            current.add(biases.get(i));                                         // 2. Sumar Bias
            current.map(Activation.SIGMOID);                                    // 3. Función de Activación (Sigmoid)
            
            activations.add(current);
        }
        return activations;
    }

    // ENTRENAMIENTO

    public synchronized void train(double[] inputArray, double[] targetArray) {
        Matrix input = Matrix.fromArray(inputArray);
        Matrix target = Matrix.fromArray(targetArray);

        // 1. FORWARD: Obtener el estado actual de todas las capas
        List<Matrix> layersOutput = feedForwardAllLayers(input);
        
        // 2. CALCULAR ERROR INICIAL (Target - Output Final)
        Matrix output = layersOutput.get(layersOutput.size() - 1);
        Matrix error = target.subtractMatrices(target, output);

        // 3. BACKPROPAGATION (Bucle inverso desde la última capa hacia la primera)
        for (int i = weights.size() - 1; i >= 0; i--) {
            
            Matrix currentLayerOutput = layersOutput.get(i + 1);
            Matrix prevLayerOutput = layersOutput.get(i);

            // A. Calcular Gradiente ( Gradient = learningRate * error * derivatived(output) )
            Matrix gradient = Matrix.map(currentLayerOutput, Activation.D_SIGMOID);
            gradient.hadamardProduct(error);
            gradient.scalarProduct(learningRate);

            // B. Calcular Delta Pesos ( DeltaW = Gradient * Transpose(Input de esta capa) )
            Matrix prevLayerT = Matrix.transpose(prevLayerOutput);
            Matrix deltaW = gradient.multiplyMatrices(gradient, prevLayerT);

            // C. AJUSTAR PESOS Y BIAS
            weights.get(i).add(deltaW);
            biases.get(i).add(gradient);

            // D. CALCULAR ERROR PARA LA SIGUIENTE CAPA ( ErrorCapaOculta = Transpose(Weights) * ErrorActual )
            if (i > 0) {
                Matrix weightsT = Matrix.transpose(weights.get(i));
                error = weightsT.multiplyMatrices(weightsT, error);
            }
        }
    }
}
