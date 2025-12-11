package core.src.util;

import core.src.nn.NeuralNetwork;

public class ModelTest {

    public static void main(String[] args) {
        System.out.println("=== INICIO DE PRUEBAS DEL MODULO IA ===");

        NeuralNetwork nn = new NeuralNetwork(2, 3, 1);
        
        // Asignar metadatos
        nn.setId("modelo_xor_v1");
        nn.setName("Solucionador XOR Distribuido");
        // Configuracion
        nn.setLearningRate(0.2);

        System.out.println("Red creada: " + nn.getName() + " [ID: " + nn.getId() + "]");

        // Datos de entrenamiento (XOR)
        double[][] inputs = { {0,0}, {0,1}, {1,0}, {1,1} };
        double[][] targets = { {0},   {1},   {1},   {0}   };

        System.out.println("\n[Entrenamiento] Iniciando entrenamiento concurrente con hilos...");
        
        // Simulamos 2 hilos (Workers) entrenando la MISMA red al mismo tiempo
        Thread worker1 = new Thread(() -> entrenarLote(nn, inputs, targets, 20000), "Worker-1");
        Thread worker2 = new Thread(() -> entrenarLote(nn, inputs, targets, 20000), "Worker-2");

        worker1.start();
        worker2.start();

        try {
            worker1.join();
            worker2.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        System.out.println("[Entrenamiento] Finalizado.");

        System.out.println("\n[Persistencia] Guardando modelo en disco...");
        String rutaArchivo = "almacenamiento/modelos/" + nn.getId() + ".dat";
        ModelStorage.saveModel(nn, rutaArchivo);

        System.out.println("\n[Carga] Simulando reinicio del sistema / Cliente de Testeo...");
        NeuralNetwork modeloCargado = ModelStorage.loadModel(rutaArchivo);

        if (modeloCargado != null) {
            System.out.println("Modelo recuperado: " + modeloCargado.getName());
            System.out.println("ID verificado: " + modeloCargado.getId());

            System.out.println("\n[Testeo] Verificando predicciones del modelo cargado:");
            printPrediction(modeloCargado, new double[]{0,0});
            printPrediction(modeloCargado, new double[]{0,1});
            printPrediction(modeloCargado, new double[]{1,0});
            printPrediction(modeloCargado, new double[]{1,1});
        } else {
            System.err.println("FATAL: No se pudo cargar el modelo.");
        }
    }

    public static void entrenarLote(NeuralNetwork net, double[][] in, double[][] tgt, int ciclos) {
        for (int i = 0; i < ciclos; i++) {
            int idx = (int) (Math.random() * 4);
            net.train(in[idx], tgt[idx]);
        }
        System.out.println("-> " + Thread.currentThread().getName() + " terminó sus ciclos.");
    }

    public static void printPrediction(NeuralNetwork net, double[] input) {
        double[] output = net.predict(input);
        System.out.printf("Entrada: [%.0f, %.0f] -> Predicción: %.4f%n", input[0], input[1], output[0]);
    }
}