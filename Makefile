.PHONY: all core client client-web server-nodes clean

# Compilar e iniciar todo el sistema
all: core server-nodes client

# Compilar Core
core:
	@if not exist src\core\bin mkdir src\core\bin
	@if not exist src\core\models mkdir src\core\models
	@if not exist src\core\datasets mkdir src\core\datasets
	@if not exist src\core\logs mkdir src\core\logs
	@javac -d src/core/bin src/core/src/Main.java src/core/src/math/*.java src/core/src/nn/*.java src/core/src/data/*.java src/core/src/concurrent/*.java
	@cd src\core\bin && echo Main-Class: Main > manifest.txt && jar cvfm ../core.jar manifest.txt .
	@echo Core compilado exitosamente.

# Iniciar los 3 nodos del servidor
server-nodes:
	@echo "Iniciando nodos del servidor..."
	@cmd /c start "Node A" node src/server/node_worker/server.js Node_B
	@cmd /c start "Node B" node src/server/node_worker/server.js Node_C
	@cmd /c start "Node C" node src/server/node_worker/server.js Node_A

# Iniciar Cliente
client:
	@echo "Iniciando Cliente..."
	@python src/client/gui_app.py

# Iniciar Cliente Web
client-web:
	@echo "Iniciando Cliente Web..."
	@cmd /c start "Cliente Web Flask" cmd /k "call .venv\Scripts\activate & python src/client/web_app.py"

# Limpiar archivos
clean:
	@if exist src\core\bin rmdir /s /q src\core\bin
	@if exist src\core\core.jar del src\core\core.jar
	@echo Limpieza completada.
