package core.src.math;

public class Activation {
    
    // Sigmoid: 1 / (1 + e^-x)
    public static final Matrix.ActivationFunction SIGMOID = x -> 1 / (1 + Math.exp(-x));
    
    // Derivada Sigmoid: x * (1 - x) 
    // NOTA: Asume que 'x' ya pasó por sigmoid
    public static final Matrix.ActivationFunction D_SIGMOID = y -> y * (1 - y);

    // ReLU: max(0, x)
    public static final Matrix.ActivationFunction RELU = x -> Math.max(0, x);

    // Derivada ReLU: 1 si x > 0, sino 0
    public static final Matrix.ActivationFunction D_RELU = x -> x > 0 ? 1 : 0;
}