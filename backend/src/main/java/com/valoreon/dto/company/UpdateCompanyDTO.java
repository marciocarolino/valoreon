package com.valoreon.dto.company;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCompanyDTO {

	private String name;
	private String sector;
	private BigDecimal monthlyRevenue;
	private BigDecimal monthlyProfit;
	private BigDecimal growthRate;
}