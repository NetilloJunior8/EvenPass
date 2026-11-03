# Multi-stage Dockerfile for Spring Boot 3 with Java 21
# Stage 1: Build JAR using Maven & Temurin 21
FROM maven:3.9.8-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline -B || true

COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime with lightweight JRE 21
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S evenpass && adduser -S evenpass -G evenpass
USER evenpass

COPY --from=builder /build/target/evenpass-backend-1.0.0.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
