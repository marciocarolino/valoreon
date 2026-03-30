package com.valoreon.dto.dashboard;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Payload for {@code GET /dashboard/chart?days=N}.
 * Three parallel arrays, one entry per calendar day (oldest → newest).
 */
@Getter
@AllArgsConstructor
public class DashboardChartDTO {

	/** ISO date strings, e.g. "2026-03-14". */
	private List<String> labels;

	/** Daily revenue (salePrice × quantity), zero-filled for days with no data. */
	private List<BigDecimal> revenue;

	/** Daily production count, zero-filled for days with no data. */
	private List<Long> productions;
}
