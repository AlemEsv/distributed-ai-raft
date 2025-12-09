package core.src.math;

import java.io.Serializable;
import java.util.Random;

public class Matrix implements Serializable {
    public double[][] data;
    public int rows, cols;

    public Matrix(int rows, int cols) {
        this.cols = cols;
        this.rows = rows;
        this.data = new double[rows][cols];
    }

    public void randomize(){
        Random ran = new Random();
        for(int i = 0; i < rows; i++){
            for(int j = 0; j < cols; j++){
                data[i][j] = ran.nextGaussian() * 0.1;
            }
        }
    }

    // SUMA

    public void add(double scalar){
        for(int i = 0; i < rows; i++){
            for(int j = 0; j < cols; j++){
                data[i][j] += scalar;
            }
        }
    }

    public void add(Matrix m){
        if (this.rows != m.rows || this.cols != m.cols) {
            throw new IllegalArgumentException("Dimensiones no coinciden para suma.");
        }
        for(int i = 0; i < rows; i++){
            for(int j = 0; j < cols; j++){
                data[i][j] += m.data[i][j];
            }
        }
    }

    public Matrix addMatrices(Matrix a, Matrix b){
        Matrix temp = new Matrix(a.rows, a.cols);
        if (a.rows != b.rows || a.cols != b.cols) {
            throw new IllegalArgumentException("Dimensiones no coinciden para suma.");
        }
        for(int i = 0; i < a.rows; i++){
            for(int j = 0; j < a.cols; j++){
                temp.data[i][j] = a.data[i][j] + b.data[i][j];
            }
        }
        return temp;
    }

    // RESTA

    public void subtract(double scalar){
        for(int i = 0; i < rows; i++){
            for(int j = 0; j < cols; j++){
                data[i][j] -= scalar;
            }
        }
    }

    public void subtract(Matrix m){
        if (this.rows != m.rows || this.cols != m.cols) {
            throw new IllegalArgumentException("Dimensiones no coinciden para resta.");
        }
        for(int i = 0; i < rows; i++){
            for(int j = 0; j < cols; j++){
                data[i][j] -= m.data[i][j];
            }
        }
    }

    public Matrix subtractMatrices(Matrix a, Matrix b){
        Matrix temp = new Matrix(a.rows, a.cols);
        if (a.rows != b.rows || a.cols != b.cols) {
            throw new IllegalArgumentException("Dimensiones no coinciden para resta.");
        }
        for(int i = 0; i < a.rows; i++){
            for(int j = 0; j < a.cols; j++){
                temp.data[i][j] = a.data[i][j] - b.data[i][j];
            }
        }
        return temp;
    }

    // MULTIPLICACION MATRICIAL

    public void multiply(Matrix a){
        if (this.cols != a.rows) {
            throw new IllegalArgumentException("Dimensiones incompatibles para la multiplicacion.");
        }
        Matrix temp = new Matrix(this.rows, a.cols);
        for (int i = 0; i < temp.rows; i++) {
            for (int j = 0; j < temp.cols; j++) {
                double sum = 0;
                for (int k = 0; k < this.cols; k++) {
                    sum += this.data[i][k] * a.data[k][j];
                }
                temp.data[i][j] = sum;
            }
        }
        this.data = temp.data;
        this.rows = temp.rows;
        this.cols = temp.cols;
    } 

    public Matrix multiplyMatrices(Matrix a, Matrix b){
        if (a.cols != b.rows) {
            throw new IllegalArgumentException("Dimensiones incompatibles para la multiplicacion.");
        }
        Matrix temp = new Matrix(a.rows, b.cols);
        for(int i = 0; i < temp.rows; i++){
            for(int j = 0; j < temp.cols; j++){
                double sum = 0;
                for(int k = 0; k < a.cols; k++){
                    sum += a.data[i][k] * b.data[k][j];
                }
                temp.data[i][j] = sum;
            }
        }
        return temp;
    }

    // MULTIPLICACION HADAMARD

    public void hadamardProduct(Matrix a) {
        if (this.rows != a.rows || this.cols != a.cols) {
            throw new IllegalArgumentException("Dimensiones no coinciden para el producto de hadamard.");
        }
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                this.data[i][j] *= a.data[i][j];
            }
        }
    }

    public Matrix hadamardProductMatrices(Matrix a, Matrix b) {
        if (a.rows != b.rows || a.cols != b.cols) {
            throw new IllegalArgumentException("Dimensiones no coinciden para el producto de hadamard.");
        }
        Matrix temp = new Matrix(a.rows, b.cols);
        for (int i = 0; i < a.rows; i++) {
            for (int j = 0; j < a.cols; j++) {
                temp.data[i][j] = a.data[i][j] * b.data[i][j];
            }
        }
        return temp;
    }

    // MULTIPLICACION ESCALAR

    public void scalarProduct(double scalar) {
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                this.data[i][j] *= scalar;
            }
        }
    }

    public Matrix scalarProductMatrices(Matrix a, double scalar) {
        Matrix temp = new Matrix(a.rows, a.cols);
        for (int i = 0; i < a.rows; i++) {
            for (int j = 0; j < a.cols; j++) {
                temp.data[i][j] = a.data[i][j] * scalar;
            }
        }
        return temp;
    }

    // TRANSPUESTA

    public static Matrix transpose(Matrix a) {
        Matrix temp = new Matrix(a.cols, a.rows);
        for (int i = 0; i < a.rows; i++) {
            for (int j = 0; j < a.cols; j++) {
                temp.data[j][i] = a.data[i][j];
            }
        }
        return temp;
    }

    // CONVERSIONES
    
    public static Matrix fromArray(double[] arr) {
        Matrix temp = new Matrix(arr.length, 1);
        for (int i = 0; i < arr.length; i++) {
            temp.data[i][0] = arr[i];
        }
        return temp;
    }

    public double[] toArray() {
        double[] temp = new double[rows * cols];
        int k = 0;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                temp[k++] = data[i][j];
            }
        }
        return temp;
    }

    // APLICA ACTIVACIONES A CADA ELEMENTO

    public void map(ActivationFunction func) {
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                this.data[i][j] = func.apply(this.data[i][j]);
            }
        }
    }
    
    public static Matrix map(Matrix m, ActivationFunction func) {
        Matrix temp = new Matrix(m.rows, m.cols);
        for (int i = 0; i < m.rows; i++) {
            for (int j = 0; j < m.cols; j++) {
                temp.data[i][j] = func.apply(m.data[i][j]);
            }
        }
        return temp;
    }
    
    public interface ActivationFunction {
        double apply(double x);
    }

}