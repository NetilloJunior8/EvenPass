package com.evenpass.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanRequestDto {
    @NotBlank(message = "El token QR es obligatorio")
    private String qrToken;
    private String operatorUsername;
}
