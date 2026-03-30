package com.valoreon.dto.dashboard;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Getter;

/**
 * Weekly KPI metrics (current ISO week). Exposed at {@code GET /dashboard/week}.
 */
@Getter
@Builder
public class DashboardWeekKpiDTO {

	private BigDecimal totalRevenue;
	private BigDecimal totalCost;
	private BigDecimal totalProfit;
	private Long totalPrints;
	private BigDecimal totalEnergyKwh;

	private long activePrinters;
	private long inactivePrinters;
	private long maintenancePrinters;
}
