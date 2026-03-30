package com.valoreon.dto.dashboard;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Profit breakdown per printer for {@code GET /dashboard/printers-profit}.
 * Backend calculates all values; frontend must not recompute them.
 */
@Getter
@AllArgsConstructor
public class PrinterProfitDTO {

	private Long printerId;
	private String printerName;
	private BigDecimal totalRevenue;
	private BigDecimal totalCost;
	private BigDecimal totalProfit;
}
