package math;

import java.util.Random;
import java.io.Serializable;

/**
 * Clase Matrix para operaciones matriciales
 * Colaboración P3-P4: P3 define la lógica matemática, 
 * P4 optimiza con multi-threading cuando sea necesario
 */
public class Matrix implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private final double[][] data;
    private final int rows;
    private final int cols;
    
    /**
     * Constructor con dimensiones
     */
    public Matrix(int rows, int cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = new double[rows][cols];
    }
    
    /**
     * Constructor con datos
     */
    public Matrix(double[][] data) {
        this.rows = data.length;
        this.cols = data[0].length;
        this.data = new double[rows][cols];
        for (int i = 0; i < rows; i++) {
            System.arraycopy(data[i], 0, this.data[i], 0, cols);
        }
    }
    
    /**
     * Constructor desde vector columna
     */
    public Matrix(double[] vector) {
        this.rows = vector.length;
        this.cols = 1;
        this.data = new double[rows][1];
        for (int i = 0; i < rows; i++) {
            this.data[i][0] = vector[i];
        }
    }
    
    /**
     * Inicializa la matriz con valores aleatorios (Xavier initialization)
     */
    public void randomize(int inputSize) {
        Random rand = new Random();
        double scale = Math.sqrt(2.0 / inputSize);
        
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                data[i][j] = rand.nextGaussian() * scale;
            }
        }
    }
    
    /**
     * Multiplicación matricial
     */
    public Matrix multiply(Matrix other) {
        if (this.cols != other.rows) {
            throw new IllegalArgumentException(
                String.format("Dimensiones incompatibles: [%d,%d] x [%d,%d]",
                              this.rows, this.cols, other.rows, other.cols));
        }
        
        Matrix result = new Matrix(this.rows, other.cols);
        
        for (int i = 0; i < result.rows; i++) {
            for (int j = 0; j < result.cols; j++) {
                double sum = 0;
                for (int k = 0; k < this.cols; k++) {
                    sum += this.data[i][k] * other.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }
        
        return result;
    }
    
    /**
     * Suma de matrices
     */
    public Matrix add(Matrix other) {
        if (this.rows != other.rows || this.cols != other.cols) {
            throw new IllegalArgumentException("Dimensiones incompatibles para suma");
        }
        
        Matrix result = new Matrix(rows, cols);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result.data[i][j] = this.data[i][j] + other.data[i][j];
            }
        }
        return result;
    }
    
    /**
     * Resta de matrices
     */
    public Matrix subtract(Matrix other) {
        if (this.rows != other.rows || this.cols != other.cols) {
            throw new IllegalArgumentException("Dimensiones incompatibles para resta");
        }
        
        Matrix result = new Matrix(rows, cols);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result.data[i][j] = this.data[i][j] - other.data[i][j];
            }
        }
        return result;
    }
    
    /**
     * Multiplicación elemento por elemento (Hadamard)
     */
    public Matrix hadamard(Matrix other) {
        if (this.rows != other.rows || this.cols != other.cols) {
            throw new IllegalArgumentException("Dimensiones incompatibles");
        }
        
        Matrix result = new Matrix(rows, cols);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result.data[i][j] = this.data[i][j] * other.data[i][j];
            }
        }
        return result;
    }
    
    /**
     * Multiplicación por escalar
     */
    public Matrix scale(double scalar) {
        Matrix result = new Matrix(rows, cols);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result.data[i][j] = this.data[i][j] * scalar;
            }
        }
        return result;
    }
    
    /**
     * Transpuesta
     */
    public Matrix transpose() {
        Matrix result = new Matrix(cols, rows);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result.data[j][i] = this.data[i][j];
            }
        }
        return result;
    }
    
    /**
     * Aplica una función a cada elemento
     */
    public Matrix map(java.util.function.DoubleUnaryOperator function) {
        Matrix result = new Matrix(rows, cols);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result.data[i][j] = function.applyAsDouble(this.data[i][j]);
            }
        }
        return result;
    }
    
    /**
     * Convierte a array 1D (para vector columna)
     */
    public double[] toArray() {
        if (cols != 1) {
            throw new IllegalStateException("Solo se puede convertir matriz columna a array");
        }
        double[] array = new double[rows];
        for (int i = 0; i < rows; i++) {
            array[i] = data[i][0];
        }
        return array;
    }
    
    /**
     * Obtiene un elemento
     */
    public double get(int row, int col) {
        return data[row][col];
    }
    
    /**
     * Establece un elemento
     */
    public void set(int row, int col, double value) {
        data[row][col] = value;
    }
    
    /**
     * Getters
     */
    public int getRows() {
        return rows;
    }
    
    public int getCols() {
        return cols;
    }
    
    public double[][] getData() {
        return data;
    }
    
    /**
     * Crea una copia de la matriz
     */
    public Matrix copy() {
        return new Matrix(this.data);
    }
    
    /**
     * Imprime la matriz
     */
    public void print() {
        System.out.println("Matrix [" + rows + "x" + cols + "]:");
        for (int i = 0; i < Math.min(rows, 5); i++) {
            for (int j = 0; j < Math.min(cols, 5); j++) {
                System.out.printf("%8.4f ", data[i][j]);
            }
            if (cols > 5) System.out.print("...");
            System.out.println();
        }
        if (rows > 5) System.out.println("...");
    }
    
    /**
     * Suma de todos los elementos
     */
    public double sum() {
        double total = 0;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                total += data[i][j];
            }
        }
        return total;
    }
}
