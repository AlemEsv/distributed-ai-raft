/**
 * Estructura de datos para almacenar ejemplos de entrenamiento
 */
public class TrainingData {
    private final double[][] inputs;
    private final double[][] outputs;
    
    public TrainingData(double[][] inputs, double[][] outputs) {
        if (inputs.length != outputs.length) {
            throw new IllegalArgumentException("El número de inputs debe coincidir con outputs");
        }
        this.inputs = inputs;
        this.outputs = outputs;
    }
    
    public double[][] getInputs() {
        return inputs;
    }
    
    public double[][] getOutputs() {
        return outputs;
    }
    
    public int getSize() {
        return inputs.length;
    }
    
    public int getInputSize() {
        return inputs.length > 0 ? inputs[0].length : 0;
    }
    
    public int getOutputSize() {
        return outputs.length > 0 ? outputs[0].length : 0;
    }
    
    /**
     * Obtiene un ejemplo específico
     */
    public DataPair getExample(int index) {
        if (index < 0 || index >= inputs.length) {
            throw new IndexOutOfBoundsException("Índice fuera de rango: " + index);
        }
        return new DataPair(inputs[index], outputs[index]);
    }
    
    /**
     * Divide los datos en batches para procesamiento paralelo
     */
    public TrainingData[] splitIntoBatches(int batchSize) {
        int numBatches = (int) Math.ceil((double) getSize() / batchSize);
        TrainingData[] batches = new TrainingData[numBatches];
        
        for (int i = 0; i < numBatches; i++) {
            int start = i * batchSize;
            int end = Math.min(start + batchSize, getSize());
            int size = end - start;
            
            double[][] batchInputs = new double[size][];
            double[][] batchOutputs = new double[size][];
            
            for (int j = 0; j < size; j++) {
                batchInputs[j] = inputs[start + j];
                batchOutputs[j] = outputs[start + j];
            }
            
            batches[i] = new TrainingData(batchInputs, batchOutputs);
        }
        
        return batches;
    }
    
    /**
     * Mezcla aleatoriamente los datos (útil para entrenamiento)
     */
    public void shuffle() {
        java.util.Random rand = new java.util.Random();
        for (int i = inputs.length - 1; i > 0; i--) {
            int j = rand.nextInt(i + 1);
            
            // Swap inputs
            double[] tempInput = inputs[i];
            inputs[i] = inputs[j];
            inputs[j] = tempInput;
            
            // Swap outputs
            double[] tempOutput = outputs[i];
            outputs[i] = outputs[j];
            outputs[j] = tempOutput;
        }
    }
    
    /**
     * Par de entrada-salida
     */
    public static class DataPair {
        public final double[] input;
        public final double[] output;
        
        public DataPair(double[] input, double[] output) {
            this.input = input;
            this.output = output;
        }
    }
}
