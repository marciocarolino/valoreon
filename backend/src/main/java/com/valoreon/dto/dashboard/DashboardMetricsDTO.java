package com.valoreon.dto.dashboard;

import java.math.BigDecimal;
import java.math.RoundingMode;

import lombok.Getter;

@Getter
public class DashboardMetricsDTO {

	private final BigDecimal totalRevenue;
	private final BigDecimal totalCost;
	private final BigDecimal totalProfit;
	private final Long totalProductions;
	private final long activePrinters;
	private final long inactivePrinters;
	private final long maintenancePrinters;

	public DashboardMetricsDTO(BigDecimal revenue, BigDecimal cost, Long productions,
			long activePrinters, long inactivePrinters, long maintenancePrinters) {
		this.totalRevenue = revenue != null ? revenue.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		this.totalCost = cost != null ? cost.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		this.totalProductions = productions != null ? productions : 0L;
		BigDecimal rev = this.totalRevenue;
		BigDecimal c = this.totalCost;
		this.totalProfit = rev.subtract(c).setScale(2, RoundingMode.HALF_UP);
		this.activePrinters = activePrinters;
		this.inactivePrinters = inactivePrinters;
		this.maintenancePrinters = maintenancePrinters;
	}
}
