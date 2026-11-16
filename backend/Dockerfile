# =====================================================================
# Imagem da API Nexum (usada pelo Render). Duas etapas:
#   1. build:   Maven + JDK 21 compilam e geram o .jar
#   2. runtime: só a JRE 21 + o .jar (imagem final bem menor, sem Maven nem código-fonte)
#
# Build local:  docker build -t nexum-api .
# Rodar local:  docker run --rm -p 8080:8080 --env-file .env \
#                 -e DB_URL=jdbc:postgresql://host.docker.internal:5432/nexum nexum-api
# =====================================================================

# ---------- 1. build ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Primeiro só o pom.xml: as dependências ficam em cache e não são baixadas
# de novo quando só o código muda.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Os testes rodam fora daqui (./mvnw test): eles precisam de Docker para o Postgres.
RUN mvn -B -q package -DskipTests \
 && cp target/nexum-api-*.jar app.jar


# ---------- 2. runtime ----------
FROM eclipse-temurin:21-jre-alpine

# Usuário sem privilégios: se a aplicação for invadida, o invasor não é root.
RUN addgroup -S nexum && adduser -S nexum -G nexum
WORKDIR /app
COPY --from=build --chown=nexum:nexum /build/app.jar app.jar
USER nexum

# Plano grátis do Render: 512 MB. A JVM usa até 75% disso de heap; o resto fica
# para metaspace, threads e o próprio sistema.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

# A porta vem de $PORT (o Render define sozinho); sem ela, 8080.
ENV PORT=8080
EXPOSE 8080

# "exec" faz a JVM virar o processo principal e receber o sinal de desligamento.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
