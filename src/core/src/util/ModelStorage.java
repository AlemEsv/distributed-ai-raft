package core.src.util;

import core.src.nn.NeuralNetwork;
import java.io.*;

public class ModelStorage {

    public static void saveModel(NeuralNetwork nn, String filePath) {
        File file = new File(filePath);
        if (file.getParentFile() != null) {
            file.getParentFile().mkdirs();
        }

        try (FileOutputStream fos = new FileOutputStream(filePath);
             ObjectOutputStream oos = new ObjectOutputStream(fos)) {
            
            oos.writeObject(nn);
            System.out.println("Modelo guardado exitosamente en: " + filePath);
            
        } catch (IOException e) {
            System.err.println("Error al guardar el modelo: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static NeuralNetwork loadModel(String filePath) {
        NeuralNetwork nn = null;
        
        try (FileInputStream fis = new FileInputStream(filePath);
             ObjectInputStream ois = new ObjectInputStream(fis)) {
            
            nn = (NeuralNetwork) ois.readObject();
            System.out.println("Modelo cargado exitosamente desde: " + filePath);
            
        } catch (IOException | ClassNotFoundException e) {
            System.err.println("Error al cargar el modelo. Verifica la ruta o la versión de la clase.");
            e.printStackTrace();
        }
        
        return nn;
    }
}
