package com.valoreon.dto.printer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.valoreon.model.enums.PrinterStatus;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PrinterResponseDTO {

	private Long id;
	private String name;
	private String brand;
	private Integer powerConsumptionWatts;
	private BigDecimal energyCostPerKwh;
	private BigDecimal costPerHour;
	private PrinterStatus status;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
}
