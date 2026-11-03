package com.evenpass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EvenPassApplication {

    public static void main(String[] args) {
        SpringApplication.run(EvenPassApplication.class, args);
        System.out.println("=================================================");
        System.out.println("  EvenPass Backend SaaS Engine Started on :8080   ");
        System.out.println("  PostgreSQL / JPA Architecture & Security Ready ");
        System.out.println("=================================================");
    }
}
