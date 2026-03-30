package com.valoreon.repository;

import java.math.BigDecimal;

/**
 * JPQL aggregate row for dashboard metrics (avoids {@code Object[]} tuple ambiguity).
 */
public interface ProductionMetricsProjection {

	BigDecimal getTotalRevenue();

	BigDecimal getTotalCost();

	/** Total pieces produced: SUM(quantity); null quantity treated as 0 per row. */
	Long getTotalPieces();
}
