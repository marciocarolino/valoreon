package com.valoreon.dto.printer;

import java.math.BigDecimal;

import com.valoreon.model.enums.PrinterStatus;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PrinterCreateDTO {

	@NotBlank(message = "Name is required")
	private String name;

	@NotBlank(message = "Brand is required")
	private String brand;

	@NotNull(message = "Power consumption is required")
	@Min(value = 1, message = "Power consumption must be greater than 0")
	private Integer powerConsumptionWatts;

	@NotNull(message = "Energy cost per kWh is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Energy cost must be greater than 0")
	private BigDecimal energyCostPerKwh;

	private PrinterStatus status;
}
