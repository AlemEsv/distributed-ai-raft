import nn.NeuralNetwork;
import data.DataLoader;
import data.TrainingData;
import concurrent.MultiThreadTrainer;

/**
 * P4 - Ingeniero de Datos y Concurrencia
 * Wrapper CLI para ser invocado desde Node.js
 * Coordina el multi-threading y gestión de I/O
 */
public class Main {
    
    public static void main(String[] args) {
        if (args.length < 1) {
            printUsage();
            System.exit(1);
        }
        
        String command = args[0].toLowerCase();
        
        // Validar número de argumentos según comando
        if (command.equals("info")) {
            if (args.length != 1) {
                System.err.println("ERROR: Comando info no requiere argumentos adicionales");
                System.exit(1);
            }
        } else if (args.length < 2) {
            printUsage();
            System.exit(1);
        }
        
        try {
            switch (command) {
                case "train":
                    handleTrain(args);
                    break;
                case "predict":
                    handlePredict(args);
                    break;
                case "info":
                    printSystemInfo();
                    break;
                default:
                    System.err.println("ERROR: Comando desconocido: " + command);
                    printUsage();
                    System.exit(1);
            }
        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    /**
     * Maneja el comando de entrenamiento
     * Uso: java -jar core.jar train <input_path> <model_id>
     */
    private static void handleTrain(String[] args) throws Exception {
        if (args.length < 3) {
            System.err.println("ERROR: Faltan argumentos para train");
            System.err.println("Uso: java -jar core.jar train <input_path> <model_id>");
            System.exit(1);
        }
        
        String inputPath = args[1];
        String modelId = args[2];
        
        System.out.println("=== INICIANDO ENTRENAMIENTO ===");
        System.out.println("Input Path: " + inputPath);
        System.out.println("Model ID: " + modelId);
        System.out.println("Núcleos disponibles: " + Runtime.getRuntime().availableProcessors());
        
        // P4 Tarea 4.2: Gestión de I/O - Leer y normalizar datos
        DataLoader loader = new DataLoader();
        TrainingData data = loader.loadTrainingData(inputPath);
        
        System.out.println("Datos cargados: " + data.getSize() + " ejemplos");
        System.out.println("Features: " + data.getInputSize());
        System.out.println("Outputs: " + data.getOutputSize());
        
        // Configuración de la red neuronal (colaboración con P3)
        int[] layers = {data.getInputSize(), 64, 32, data.getOutputSize()};
        NeuralNetwork nn = new NeuralNetwork(layers);
        
        // P4 Tarea 4.1: Multi-threading para entrenamiento
        MultiThreadTrainer trainer = new MultiThreadTrainer(nn);
        trainer.train(data, 100, 0.01, 32); // epochs, learning rate, batch size
        
        // Guardar modelo (P3 proporciona la serialización)
        String modelPath = "models/" + modelId + ".bin";
        nn.saveModel(modelPath);
        
        System.out.println("=== ENTRENAMIENTO COMPLETADO ===");
        System.out.println("Modelo guardado en: " + modelPath);
        System.out.println("Status: SUCCESS");
    }
    
    /**
     * Maneja el comando de predicción
     * Uso: java -jar core.jar predict <model_id> <input_data>
     */
    private static void handlePredict(String[] args) throws Exception {
        if (args.length < 3) {
            System.err.println("ERROR: Faltan argumentos para predict");
            System.err.println("Uso: java -jar core.jar predict <model_id> <input_data>");
            System.exit(1);
        }
        
        String modelId = args[1];
        String inputData = args[2];
        
        System.err.println("Model ID: " + modelId);
        
        // Cargar modelo
        String modelPath = "models/" + modelId + ".bin";
        NeuralNetwork nn = NeuralNetwork.loadModel(modelPath);
        
        // P4 Tarea 4.2: Parsear y normalizar input
        DataLoader loader = new DataLoader();
        double[] input = loader.parseInputVector(inputData);
        
        // Realizar predicción
        double[] output = nn.predict(input);
        
        // Formatear salida para Node.js
        System.out.print("[");
        for (int i = 0; i < output.length; i++) {
            System.out.print(output[i]);
            if (i < output.length - 1) System.out.print(", ");
        }
        System.out.println("]");
        System.err.println("Status: SUCCESS");
    }
    
    /**
     * Muestra información del sistema
     */
    private static void printSystemInfo() {
        System.out.println("Java Version: " + System.getProperty("java.version"));
        System.out.println("Núcleos disponibles: " + Runtime.getRuntime().availableProcessors());
        System.out.println("Memoria máxima: " + (Runtime.getRuntime().maxMemory() / 1024 / 1024) + " MB");
        System.out.println("Memoria libre: " + (Runtime.getRuntime().freeMemory() / 1024 / 1024) + " MB");
        System.out.println("Sistema Operativo: " + System.getProperty("os.name"));
    }
    
    /**
     * Muestra el uso del programa
     */
    private static void printUsage() {
        System.out.println("Uso del programa:");
        System.out.println("  java -jar core.jar train <input_path> <model_id>");
        System.out.println("  java -jar core.jar predict <model_id> <input_data>");
        System.out.println("  java -jar core.jar info");
        System.out.println();
        System.out.println("Ejemplos:");
        System.out.println("  java -jar core.jar train datasets/train.csv modelo_v1");
        System.out.println("  java -jar core.jar predict modelo_v1 \"0.5,0.1,0.9\"");
    }
}
