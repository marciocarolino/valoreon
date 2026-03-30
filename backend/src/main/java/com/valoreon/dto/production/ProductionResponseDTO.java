package com.valoreon.dto.production;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductionResponseDTO {

	private Long id;
	private String name;
	private String material;
	private String color;
	private String size;
	private Double weight;
	private Integer quantity;
	private Double printTimeHours;
	private BigDecimal salePrice;
	/** Line revenue: {@code salePrice × quantity} (aligned with entity recalculation). */
	@JsonProperty("totalRevenue")
	private BigDecimal totalRevenue;
	private BigDecimal energyCost;
	private BigDecimal materialCost;

	/** Batch total cost; JSON property is always {@code totalCost} (no {@code cost} / {@code total_cost} aliases). */
	@JsonProperty("totalCost")
	private BigDecimal totalCost;
	private BigDecimal profit;
	private BigDecimal margin;
	private LocalDateTime createdAt;
	private Long printerId;
	private String printerName;
	private String status;
}
