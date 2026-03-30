package com.valoreon.dto.production;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductionCreateDTO {

	@NotBlank(message = "Name is required")
	private String name;

	@NotNull(message = "Weight is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Weight must be greater than 0")
	private Double weight;

	@NotNull(message = "Quantity is required")
	@Min(value = 1, message = "Quantity must be at least 1")
	private Integer quantity;

	private String material;
	private String color;
	private String size;

	@NotNull(message = "Print time is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Print time must be greater than 0")
	private Double printTimeHours;

	@NotNull(message = "Sale price is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Sale price must be greater than 0")
	private BigDecimal salePrice;

	@NotNull(message = "Filament price is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Filament price must be greater than 0")
	private BigDecimal filamentPrice;

	@NotNull(message = "Printer ID is required")
	private Long printerId;
}
