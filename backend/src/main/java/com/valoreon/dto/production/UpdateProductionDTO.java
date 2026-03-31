package com.valoreon.dto.production;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProductionDTO {

	private String name;
	private Double weight;
	private Integer quantity;
	private String material;
	private String color;
	private String size;
	private Double printTimeHours;
	private BigDecimal salePrice;
	private BigDecimal filamentPrice;
	private Long printerId;
	private BigDecimal shippingCost;
}
