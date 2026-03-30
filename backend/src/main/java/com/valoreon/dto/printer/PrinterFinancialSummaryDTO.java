package com.valoreon.dto.printer;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PrinterFinancialSummaryDTO {

	private BigDecimal revenue;
	private BigDecimal cost;
	private BigDecimal profit;
	private Long totalProductions;
}
