package trabalho;

public class Veiculo {
    private int codigo;
    private String marca;
    private String modelo;
    private int anoFabricacao;
    private int idLoja;
    private float preco;
    private String estado;

    public Veiculo(int codigo, String marca, String modelo, int anoFabricacao, int idLoja, float preco, String estado) {
        this.codigo = codigo;
        this.marca = marca;
        this.modelo = modelo;
        this.anoFabricacao = anoFabricacao;
        this.idLoja = idLoja;
        this.preco = preco;
        this.estado = estado;
        calcularDepreciacao(); // Calcula a depreciação automaticamente ao instanciar o veículo
    }

    @Override
    public String toString() {
        return "Código: " + codigo + "\n" +
                "Marca: " + marca + "\n" +
                "Modelo: " + modelo + "\n" +
                "Ano: " + anoFabricacao + "\n" +
                "Estado: " + estado + "\n" +
                "Preço: " + preco + "\n" +
                "Id da Loja: " + idLoja;
    }

    public int getCodigo() {
        return codigo;
    }

    public void setCodigo(int codigo) {
        this.codigo = codigo;
    }

    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public int getAnoFabricacao() {
        return anoFabricacao;
    }

    public void setAnoFabricacao(int anoFabricacao) {
        this.anoFabricacao = anoFabricacao;
    }

    public int getLoja() {
        return idLoja;
    }

    public void setLoja(int idLoja) {
        this.idLoja = idLoja;
    }

    public float getPreco() {
        return preco;
    }

    public void setPreco(float preco) {
        this.preco = preco;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    // Método para calcular a depreciação
    public void calcularDepreciacao() {
        if (!estado.equalsIgnoreCase("NOVO")) { // Verifica se o veículo não é novo
            float fatorDepreciacao = 0.0f;
            switch (estado.toUpperCase()) {
                case "SEMI_NOVO":
                    fatorDepreciacao = 0.05f; // 5% depreciação
                    break;
                case "USADO":
                    fatorDepreciacao = 0.10f; // 10% depreciação
                    break;
                case "BATIDO":
                    fatorDepreciacao = 0.15f; // 15% depreciação
                    break;
                default:
                    System.out.println("Estado inválido! Não foi possível calcular a depreciação.");
                    return;
            }
            this.preco -= this.preco * fatorDepreciacao; // Aplica a depreciação ao preço
        }
    }
}
