package com.valoreon.dto.dashboard;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TodayMetricsDTO {
	private BigDecimal revenue;
	private BigDecimal cost;
	private BigDecimal profit;
	private long productions;
}
