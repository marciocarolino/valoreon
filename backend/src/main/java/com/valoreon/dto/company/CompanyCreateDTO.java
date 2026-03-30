package com.valoreon.dto.company;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CompanyCreateDTO {

	@NotBlank(message = "Name is required")
	private String name;

	@NotBlank(message = "Sector is required")
	private String sector;

	@NotNull(message = "Monthly revenue is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Monthly revenue must be greater than 0")
	private BigDecimal monthlyRevenue;

	@NotNull(message = "Monthly profit is required")
	private BigDecimal monthlyProfit;

	private BigDecimal growthRate;
}
