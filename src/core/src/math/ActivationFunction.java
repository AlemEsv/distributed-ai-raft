package math;

/**
 * Funciones de activación para redes neuronales
 * P3 (Matemático Computacional) define estas funciones
 */
public class ActivationFunction {
    
    /**
     * Función Sigmoid: f(x) = 1 / (1 + e^(-x))
     */
    public static double sigmoid(double x) {
        return 1.0 / (1.0 + Math.exp(-x));
    }
    
    /**
     * Derivada de Sigmoid: f'(x) = f(x) * (1 - f(x))
     */
    public static double sigmoidDerivative(double x) {
        double sig = sigmoid(x);
        return sig * (1.0 - sig);
    }
    
    /**
     * Función ReLU: f(x) = max(0, x)
     */
    public static double relu(double x) {
        return Math.max(0, x);
    }
    
    /**
     * Derivada de ReLU: f'(x) = 1 si x > 0, 0 en otro caso
     */
    public static double reluDerivative(double x) {
        return x > 0 ? 1.0 : 0.0;
    }
    
    /**
     * Función Leaky ReLU: f(x) = x si x > 0, alpha * x en otro caso
     */
    public static double leakyRelu(double x, double alpha) {
        return x > 0 ? x : alpha * x;
    }
    
    /**
     * Derivada de Leaky ReLU
     */
    public static double leakyReluDerivative(double x, double alpha) {
        return x > 0 ? 1.0 : alpha;
    }
    
    /**
     * Función Tanh: f(x) = tanh(x)
     */
    public static double tanh(double x) {
        return Math.tanh(x);
    }
    
    /**
     * Derivada de Tanh: f'(x) = 1 - tanh²(x)
     */
    public static double tanhDerivative(double x) {
        double t = Math.tanh(x);
        return 1.0 - t * t;
    }
    
    /**
     * Softmax para clasificación multi-clase
     * Aplica softmax a un vector completo
     */
    public static double[] softmax(double[] x) {
        double[] result = new double[x.length];
        
        // Encontrar el máximo para estabilidad numérica
        double max = x[0];
        for (int i = 1; i < x.length; i++) {
            if (x[i] > max) max = x[i];
        }
        
        // Calcular exponenciales y suma
        double sum = 0.0;
        for (int i = 0; i < x.length; i++) {
            result[i] = Math.exp(x[i] - max);
            sum += result[i];
        }
        
        // Normalizar
        for (int i = 0; i < x.length; i++) {
            result[i] /= sum;
        }
        
        return result;
    }
    
    /**
     * Aplica sigmoid a toda una matriz
     */
    public static Matrix applySigmoid(Matrix m) {
        return m.map(ActivationFunction::sigmoid);
    }
    
    /**
     * Aplica sigmoid derivative a toda una matriz
     */
    public static Matrix applySigmoidDerivative(Matrix m) {
        return m.map(ActivationFunction::sigmoidDerivative);
    }
    
    /**
     * Aplica ReLU a toda una matriz
     */
    public static Matrix applyReLU(Matrix m) {
        return m.map(ActivationFunction::relu);
    }
    
    /**
     * Aplica ReLU derivative a toda una matriz
     */
    public static Matrix applyReLUDerivative(Matrix m) {
        return m.map(ActivationFunction::reluDerivative);
    }
    
    /**
     * Aplica Tanh a toda una matriz
     */
    public static Matrix applyTanh(Matrix m) {
        return m.map(ActivationFunction::tanh);
    }
    
    /**
     * Aplica Tanh derivative a toda una matriz
     */
    public static Matrix applyTanhDerivative(Matrix m) {
        return m.map(ActivationFunction::tanhDerivative);
    }
}
